// /app/api/admin/manage/product/edit.images/template/[productId]/route.js
// import { deleteImageFromS3 } from "@/lib/aws";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

export const PATCH = async (req, { params }) => {
  try {
    const { productId } = await params;
    const { newImagePath } = await req.json();

    if (
      !productId ||
      !newImagePath )
    {
      return NextResponse.json({ error: "Missing fields" }, { status: 500 });
    }

    await connectToDatabase();

    const product = await Product.findByIdAndUpdate(
        productId,
        {
          $set: {
            "designTemplate.imageUrl": newImagePath,
          },
        },
        { new: false }
      )
      .select("images")
      .lean();
    
    if(!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.log("Product updated successfully:", product);

    return NextResponse.json({
      success: true,
      message: "Product images updated successfully",
    });
  } catch (error) {
    console.error("Error updating product images:", error);
    return NextResponse.json({ error: "Failed to update product images" }, { status: 500 });
  }
};
