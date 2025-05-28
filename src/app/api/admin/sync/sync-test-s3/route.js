// /app/api/admin/sync/sync-test-s3/route.js
import {
    ListObjectsV2Command,
    DeleteObjectsCommand,
    CopyObjectCommand,
  } from "@aws-sdk/client-s3";
  import { NextResponse } from "next/server";
  import { S3Client } from "@aws-sdk/client-s3";
  
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  
  const PROD_BUCKET = process.env.PROD_S3_BUCKET;
  const TEST_BUCKET = process.env.TEST_S3_BUCKET;
  
  export async function GET() {
    try {
  
      // STEP 1: Wipe all objects from test bucket
      const testObjects = await s3.send(new ListObjectsV2Command({ Bucket: TEST_BUCKET }));
  
      if (testObjects.Contents && testObjects.Contents.length > 0) {
        const deleteParams = {
          Bucket: TEST_BUCKET,
          Delete: {
            Objects: testObjects.Contents.map(obj => ({ Key: obj.Key })),
            Quiet: false,
          },
        };
  
        const deleteResult = await s3.send(new DeleteObjectsCommand(deleteParams));
      } 
  
      // STEP 2: List and copy objects from prod to test bucket
      const prodObjects = await s3.send(new ListObjectsV2Command({ Bucket: PROD_BUCKET }));
  
      if (!prodObjects.Contents || prodObjects.Contents.length === 0) {
        return NextResponse.json({ message: "Production bucket is empty, nothing to sync." });
      }
  
      for (const [index, obj] of prodObjects.Contents.entries()) {
        const sourceKey = obj.Key;
        const copyCmd = new CopyObjectCommand({
          Bucket: TEST_BUCKET,
          CopySource: `${PROD_BUCKET}/${sourceKey}`,
          Key: sourceKey,
        });
  
        await s3.send(copyCmd);
      }
  
      return NextResponse.json({ message: "Test S3 bucket wiped and synced from production." });
    } catch (error) {
      console.error("S3 Sync Error:", error);
      return NextResponse.json({ error: "Failed to sync S3 buckets" }, { status: 500 });
    }
  }
  