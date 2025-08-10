// @/lib/aws.js

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generates a presigned URL for uploading or downloading a file to/from S3.
 *
 * @param {string} fullPath - The desired S3 object key (path).
 * @param {string} fileType - The MIME type of the file (used for uploading).
 * @param {string} operation - 'putObject' for uploading, 'getObject' for downloading.
 * @returns {Promise<{ presignedUrl: string, url: string }>} - The presigned URL and the final file URL.
 */
export const getPresignedUrl = async (fullPath, fileType = "application/octet-stream", operation = "putObject") => {
  try {
    console.log('AWS Config check:', {
      region: process.env.AWS_REGION ? 'SET' : 'MISSING',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'MISSING',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING',
      bucket: process.env.AWS_BUCKET ? 'SET' : 'MISSING'
    });
    
    let command;

    if (operation === "putObject") {
      command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: fullPath.startsWith("/") ? fullPath.slice(1) : fullPath,
        ContentType: fileType,
      });
    } else if (operation === "getObject") {
      command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: fullPath.startsWith("/") ? fullPath.slice(1) : fullPath,
      });
    } else {
      throw new Error("Invalid operation for presigned URL.");
    }

    console.log('Generating presigned URL for key:', fullPath);
    
    // Generate a presigned URL valid for 15 minutes (900 seconds)
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    // Construct the final URL where the file will be accessible
    const url = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${
      fullPath.startsWith("/") ? fullPath.slice(1) : fullPath
    }`;

    console.log('Generated URLs:', { presignedUrl: 'GENERATED', finalUrl: url });
    
    // Test the presigned URL format
    console.log('Presigned URL details:', {
      bucket: process.env.AWS_BUCKET,
      region: process.env.AWS_REGION,
      key: fullPath.startsWith("/") ? fullPath.slice(1) : fullPath,
      presignedUrlLength: presignedUrl.length,
      hasSignature: presignedUrl.includes('X-Amz-Signature'),
      hasCredential: presignedUrl.includes('X-Amz-Credential')
    });
    
    return { presignedUrl, url };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
};

export const deleteImageFromS3 = async fullPath => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fullPath.startsWith("/") ? fullPath.slice(1) : fullPath,
  });

  try {
    await s3.send(command);
  } catch (error) {
    console.error("Error deleting image:", error);
  }
};
