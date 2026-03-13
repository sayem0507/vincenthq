import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
    const uploadDir = isVercel ? join('/tmp', 'uploads') : join(process.cwd(), 'uploads');
    const filePath = join(uploadDir, filename);

    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.pdf')) contentType = 'application/pdf';
    else if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filename.endsWith('.doc') || filename.endsWith('.docx')) contentType = 'application/msword';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
