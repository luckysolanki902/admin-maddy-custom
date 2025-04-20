// /app/api/testing/product/route.js
import { deleteImageFromS3 } from "@/lib/aws";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

export const PATCH = async (req, { params }) => {
  try {
    const { productId } = await params;
    const { action, newImagePath, idx, reorderedImages } = await req.json();

    if (
      !productId ||
      !action ||
      ((action === "add" || action === "replace") && (!newImagePath || !idx)) ||
      (action === "delete" && !idx) ||
      (action === "reorder" && !reorderedImages)
    ) {
      return NextResponse.json({ error: "Invalid data" }, { status: 500 });
    }

    await connectToDatabase();

    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      [
        {
          $set: {
            images:
              action === "reorder"
                ? reorderedImages
                : {
                    $concatArrays: [
                      { $slice: ["$images", idx] },
                      action === "delete" ? [] : [newImagePath],
                      { $slice: ["$images", idx + (action === "add" ? 0 : 1), { $size: "$images" }] },
                    ],
                  },
          },
        },
      ],
      { new: false }
    )
      .select("images")
      .lean();

    if (action === "delete" || action === "replace") {
      await deleteImageFromS3(product.images[idx]);
    }

    return NextResponse.json({
      success: true,
      message: "Product images updated successfully",
    });
  } catch (error) {
    console.error("Error updating product images:", error);
    return NextResponse.json({ error: "Failed to update product images" }, { status: 500 });
  }
};
