import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CallModel } from '@/lib/models';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getUploadsDir() {
  const rootDir = process.cwd();
  if (rootDir.endsWith('apps/web') || rootDir.endsWith('apps\\web')) {
    return path.join(rootDir, 'uploads', 'recordings');
  }
  return path.join(rootDir, 'apps', 'web', 'uploads', 'recordings');
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const recordingId = params.id;

    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = getUploadsDir();
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, `${recordingId}.m4a`);
    await fs.writeFile(filePath, buffer);

    const audioUrl = `/api/v1/recordings/${recordingId}/audio`;

    // Attach recording to the latest call record
    await (CallModel as any).findOneAndUpdate(
      { $or: [{ recordingStatus: 'PENDING' }, { audioUrl: { $exists: false } }] },
      {
        $set: {
          recordingStatus: 'COMPLETED',
          audioUrl: audioUrl,
        },
      },
      { sort: { createdAt: -1 } },
    );

    console.log(`Successfully saved uploaded audio file: ${filePath} (${buffer.length} bytes)`);

    return NextResponse.json({
      success: true,
      message: 'Audio recording uploaded and attached to call log successfully',
      recordingId,
      audioUrl,
      fileSizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error('Error handling binary upload:', err);
    return NextResponse.json({ message: err.message || 'Error processing audio upload' }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: { id: string } }) {
  return PUT(req, context);
}
