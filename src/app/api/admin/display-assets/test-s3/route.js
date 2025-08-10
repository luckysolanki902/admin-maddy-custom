import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    console.log('Testing S3 connection...');
    
    // Check environment variables
    const envCheck = {
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'MISSING',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING',
      AWS_BUCKET: process.env.AWS_BUCKET,
    };
    
    console.log('Environment variables:', envCheck);
    
    // Initialize S3 Client
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Test basic S3 connectivity by listing objects
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET,
      MaxKeys: 1
    });

    const response = await s3.send(command);
    
    console.log('S3 connection successful');
    
    return NextResponse.json({
      success: true,
      message: 'S3 connection successful',
      envCheck,
      objectCount: response.KeyCount || 0
    });
    
  } catch (error) {
    console.error('S3 connection failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode
    }, { status: 500 });
  }
}
