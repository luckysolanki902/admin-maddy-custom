import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/aws';
import { nanoid } from 'nanoid';

export async function POST(req) {
  try {
    const { fileName, fileType, fileExtension } = await req.json();
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'File name and type are required' },
        { status: 400 }
      );
    }

    // Generate a unique file name to prevent collisions
    const uniqueId = nanoid(10);
    const sanitizedFileName = fileName.replace(/[^\w\s.-]/g, '');
    const timestamp = Date.now();
    
    // Create the S3 path with appropriate folder structure
    // Use extension from file or derive from fileType
    const ext = fileExtension || fileType.split('/')[1] || '';
    const generatedFileName = `${sanitizedFileName}-${uniqueId}-${timestamp}${ext ? `.${ext}` : ''}`;
    const fullPath = `feature-requests/media/${generatedFileName}`;
    
    // Get the presigned URL for upload
    const { presignedUrl, url } = await getPresignedUrl(fullPath, fileType, "putObject");
    
    return NextResponse.json({
      presignedUrl,
      url,
      fileName: generatedFileName,
      fullPath
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
