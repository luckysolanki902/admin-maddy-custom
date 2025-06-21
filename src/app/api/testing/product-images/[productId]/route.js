// /app/api/testing/product/route.js
import { deleteImageFromS3 } from "@/lib/aws";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

export const PATCH = async (req, { params }) => {
  try {
    console.debug('PATCH request received for product images');
    const { productId } = await params;
    console.debug('Product ID:', productId);
    
    const body = await req.json();
    const { action, newImagePath, idx, reorderedImages } = body;
    console.debug('Request payload:', { action, newImagePath, idx, reorderedImages });    if (
      !productId ||
      !action ||
      ((action === "add" || action === "replace") && (!newImagePath || idx === undefined)) ||
      (action === "delete" && idx === undefined) ||
      (action === "reorder" && !Array.isArray(reorderedImages))
    ) {
      console.debug('Invalid data provided:', { productId, action, newImagePath, idx, reorderedImages });
      return NextResponse.json({ error: "Invalid data" }, { status: 500 });
    }

    console.debug('Connecting to database');
    await connectToDatabase();    console.debug(`Performing ${action} operation on product ${productId}`);
    
    // First get the current state of the product
    const existingProduct = await Product.findById(productId).select("images").lean();
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    let updateOperation;
    let oldImage;
    
    if (action === "reorder") {
      updateOperation = { $set: { images: reorderedImages } };
    } else if (action === "delete") {
      oldImage = existingProduct.images[idx];
      // Remove the image at the specified index
      const updatedImages = [...existingProduct.images];
      updatedImages.splice(idx, 1);
      updateOperation = { $set: { images: updatedImages } };
    } else if (action === "replace") {
      oldImage = existingProduct.images[idx];
      // Create a new images array with the replaced item
      const updatedImages = [...existingProduct.images];
      updatedImages[idx] = newImagePath;
      updateOperation = { $set: { images: updatedImages } };
    } else if (action === "add") {
      // Insert the new image at the specified index
      const updatedImages = [...existingProduct.images];
      updatedImages.splice(idx, 0, newImagePath);
      updateOperation = { $set: { images: updatedImages } };
    }
    
    console.debug('Update operation:', updateOperation);
    
    const product = await Product.findByIdAndUpdate(
      { _id: productId },
      updateOperation,
      { new: false }
    )
      .select("images")
      .lean();    if ((action === "delete" || action === "replace") && oldImage) {
      await deleteImageFromS3(oldImage);
    }

    return NextResponse.json({
      success: true,
      message: "Product images updated successfully",
    });  } catch (error) {
    console.error("Error updating product images:", error);
    return NextResponse.json({ 
      error: "Failed to update product images", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
};
