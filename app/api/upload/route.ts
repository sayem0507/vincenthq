import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const uploadDir = isVercel ? join('/tmp', 'uploads') : join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Create unique filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = join(uploadDir, filename);

    await writeFile(path, buffer);

    return NextResponse.json({ 
      success: true, 
      url: `/api/uploads/${filename}` 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
