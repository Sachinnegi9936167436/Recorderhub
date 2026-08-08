import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { callId, fileSizeBytes, mimeType, checksumSha256, durationSeconds } = body;

    const recordingId = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const s3Key = `recordings/${recordingId}.m4a`;

    return NextResponse.json({
      recordingId,
      s3Key,
      presignedPutUrl: `https://recorderhub-gold.vercel.app/api/v1/recordings/${recordingId}/upload-data`,
    });
  } catch (err: any) {
    console.error('Error initiating upload:', err);
    return NextResponse.json({ message: err.message || 'Error initiating upload' }, { status: 500 });
  }
}
