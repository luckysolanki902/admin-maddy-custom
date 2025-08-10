import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const deviceType = formData.get('deviceType') || 'desktop';
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file received' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate clean unique filename
    const uniqueId = nanoid(12);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uniqueId}.${fileExtension}`;
    
    // Create upload directory - simplified structure
    const uploadDir = join(process.cwd(), 'public', 'assets', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    // Write file
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    // Return relative path for consistency with S3
    const url = `/assets/uploads/${fileName}`;
    
    return NextResponse.json({
      url,
      fileName,
      fullPath: url
    });
  } catch (error) {
    console.error('Error uploading file locally:', error);
    return NextResponse.json(
      { error: 'Failed to upload file: ' + error.message },
      { status: 500 }
    );
  }
}
