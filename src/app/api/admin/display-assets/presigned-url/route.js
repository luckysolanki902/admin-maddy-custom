import { NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/aws';
import { nanoid } from 'nanoid';

export async function POST(req) {
  try {
    console.log('Presigned URL request received');
    const { fileName, fileType, fileExtension, deviceType = 'desktop' } = await req.json();
    
    console.log('Request data:', { fileName, fileType, fileExtension, deviceType });
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'File name and type are required' },
        { status: 400 }
      );
    }

    // Generate a clean unique file name without original name
    const uniqueId = nanoid(12); // Clean unique ID
    
    // Get file extension
    const ext = fileExtension || fileType.split('/')[1] || '';
    const generatedFileName = `${uniqueId}${ext ? `.${ext}` : ''}`;
    const fullPath = `assets/uploads/${generatedFileName}`;
    
    console.log('Generated file path:', fullPath);
    
    // Get the presigned URL for upload
    const { presignedUrl, url } = await getPresignedUrl(fullPath, fileType, "putObject");
    
    // Return relative path for database storage
    const relativePath = `/${fullPath}`;
    
    console.log('Generated presigned URL successfully');
    
    return NextResponse.json({
      presignedUrl,
      url: relativePath, // Use relative path for database
      s3Url: url, // Keep S3 URL for reference if needed
      fileName: generatedFileName,
      fullPath: relativePath
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL: ' + error.message },
      { status: 500 }
    );
  }
}
