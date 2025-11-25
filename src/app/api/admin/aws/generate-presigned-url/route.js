// app/api/admin/aws/generate-presigned-url/route.js

import { NextResponse } from "next/server";
import { getPresignedUrl } from "@/lib/aws";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // You can keep this for any additional data
    },
  },
};

export async function POST(request) {
  try {
    const { fullPath, fileType, operation } = await request.json();
    
    if (!fullPath || !fileType) {
      return NextResponse.json({ message: "Missing required parameters: fullPath and fileType" }, { status: 400 });
    }
    
    // Default operation to 'putObject' for backward compatibility
    const opType = operation === 'get' ? 'getObject' : 'putObject';
    
    const { presignedUrl, url } = await getPresignedUrl(fullPath, fileType, opType);

    return NextResponse.json({ presignedUrl, url }, { status: 200 });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ message: "Failed to generate presigned URL", error: error.message }, { status: 500 });
  }
}

