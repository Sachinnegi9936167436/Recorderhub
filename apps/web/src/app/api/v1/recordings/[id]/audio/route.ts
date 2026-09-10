import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getS3Client } from '@/lib/aws';
import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { connectToDatabase, withDbRetry } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { cacheGet, cacheSet } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUploadsDir() {
  const rootDir = process.cwd();
  if (rootDir.endsWith('apps/web') || rootDir.endsWith('apps\\web')) {
    return path.join(rootDir, 'uploads', 'recordings');
  }
  return path.join(rootDir, 'apps', 'web', 'uploads', 'recordings');
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    let recordingId = params.id;
    let s3KeyTarget: string | null = null;

    // 1. Resolve actual recordingId or s3Key from MongoDB Atlas with retry
    try {
      const callDoc = await withDbRetry(async () => {
        return await (CallModel as any).findOne({
          $or: [
            { idempotencyKey: params.id },
            { audioUrl: { $regex: params.id } },
            { s3Key: { $regex: params.id } },
            { _id: params.id.length === 24 ? params.id : null }
          ]
        }).lean().exec();
      });

      if (callDoc) {
        if (callDoc.s3Key) {
          s3KeyTarget = callDoc.s3Key;
        }
        if (callDoc.audioUrl) {
          const match = callDoc.audioUrl.match(/recordings\/([^\/]+)\/audio/);
          if (match && match[1]) {
            recordingId = match[1];
          }
        }
      }
    } catch (dbErr: any) {
      console.warn('DB lookup for recording ID failed:', dbErr?.message || dbErr);
    }

    // 2. Try fetching from AWS S3 Bucket via direct Presigned GET URL
    const s3Info = getS3Client();
    if (s3Info) {
      try {
        const parts = recordingId.split('_');
        const devPrefix = parts.length >= 2 ? parts[0] : '';

        const candidateKeys: string[] = [];
        if (s3KeyTarget) candidateKeys.push(s3KeyTarget);
        if (devPrefix) {
          candidateKeys.push(`recordings/${devPrefix}/${recordingId}.mp3`);
          candidateKeys.push(`recordings/${devPrefix}/${recordingId}.m4a`);
          candidateKeys.push(`recordings/${devPrefix}/${recordingId}.wav`);
        }
        candidateKeys.push(`recordings/${recordingId}.mp3`);
        candidateKeys.push(`recordings/${recordingId}.m4a`);
        candidateKeys.push(`recordings/${recordingId}.wav`);
        candidateKeys.push(`recordings/${recordingId}.3gp`);
        candidateKeys.push(`recordings/${recordingId}`);
        candidateKeys.push(`${recordingId}.mp3`);
        candidateKeys.push(`${recordingId}.m4a`);

        let resolvedS3Key: string | null = s3KeyTarget;

        if (!resolvedS3Key) {
          for (const key of candidateKeys) {
            try {
              await s3Info.client.send(new HeadObjectCommand({ Bucket: s3Info.bucket, Key: key }));
              resolvedS3Key = key;
              break;
            } catch {
              // candidate key not in bucket, continue
            }
          }
        }

        const finalKey = resolvedS3Key || (devPrefix ? `recordings/${devPrefix}/${recordingId}.mp3` : `recordings/${recordingId}.mp3`);
        const S3_CACHE_KEY = `s3:audio:${finalKey}`;

        // Check Redis cache for instant 1ms redirect
        const cachedUrl = await cacheGet<string>(S3_CACHE_KEY);
        if (cachedUrl) {
          return NextResponse.redirect(cachedUrl, 307);
        }

        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const ext = finalKey.endsWith('.mp3') ? 'mp3' : finalKey.endsWith('.wav') ? 'wav' : 'm4a';
        const mime = ext === 'mp3' ? 'audio/mpeg' : ext === 'wav' ? 'audio/wav' : 'audio/mp4';
        const downloadFilename = `Recording_${recordingId}.${ext}`;

        const command = new GetObjectCommand({
          Bucket: s3Info.bucket,
          Key: finalKey,
          ResponseContentType: mime,
          ResponseContentDisposition: `inline; filename="${downloadFilename}"`
        });
        const presignedUrl = await getSignedUrl(s3Info.client, command, { expiresIn: 3600 });

        // Cache in Redis for 55 minutes
        await cacheSet(S3_CACHE_KEY, presignedUrl, 3300);

        return NextResponse.redirect(presignedUrl, 307);
      } catch (s3Err) {
        console.warn(`S3 Presigned Redirect failed for ${recordingId}, checking fallback:`, s3Err);
      }
    }

    // 3. Try fetching from Local Disk Storage fallback
    const uploadsDir = getUploadsDir();
    const possibleLocalFiles = [
      path.join(uploadsDir, `${recordingId}.mp3`),
      path.join(uploadsDir, `${recordingId}.m4a`),
      path.join(uploadsDir, `${recordingId}.wav`),
      path.join(uploadsDir, `${recordingId}.3gp`),
      path.join(uploadsDir, `${recordingId}`)
    ];

    const createAudioResponse = (buffer: Buffer, mimeType: string = 'audio/mp4') => {
      const rangeHeader = req.headers.get('range');
      const totalSize = buffer.length;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunkSize = end - start + 1;
        const chunk = buffer.subarray(start, end + 1);

        return new Response(chunk as any, {
          status: 206,
          headers: {
            'Content-Type': mimeType,
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      return new Response(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': totalSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    };

    for (const filePath of possibleLocalFiles) {
      try {
        const buffer = await fs.readFile(filePath);
        if (buffer.length > 0) {
          const mime = filePath.endsWith('.wav') ? 'audio/wav'
                     : filePath.endsWith('.mp3') ? 'audio/mpeg'
                     : filePath.endsWith('.3gp') ? 'audio/3gpp'
                     : 'audio/mp4';
          return createAudioResponse(buffer, mime);
        }
      } catch {
        // try next local path
      }
    }

    return NextResponse.json({ message: 'Audio recording file not found in S3 or local storage' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Error streaming audio' }, { status: 500 });
  }
}
