// app/api/admin/manage/product-inventory/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";

export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const { productId, availableQuantity, reorderLevel } = await request.json();
    
    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 }
      );
    }

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    let inventory;

    if (product.inventoryData) {
      // Update existing inventory
      inventory = await Inventory.findById(product.inventoryData);
      if (inventory) {
        if (availableQuantity !== undefined && availableQuantity !== null) {
          inventory.availableQuantity = parseInt(availableQuantity);
        }
        if (reorderLevel !== undefined && reorderLevel !== null) {
          inventory.reorderLevel = parseInt(reorderLevel);
        }
        await inventory.save();
      } else {
        // Create new inventory if referenced inventory doesn't exist
        inventory = new Inventory({
          availableQuantity: availableQuantity ?? 0,
          reorderLevel: reorderLevel ?? 0,
          reservedQuantity: 0
        });
        await inventory.save();
        product.inventoryData = inventory._id;
        await product.save();
      }
    } else {
      // Create new inventory for product
      inventory = new Inventory({
        availableQuantity: availableQuantity ?? 0,
        reorderLevel: reorderLevel ?? 0,
        reservedQuantity: 0
      });
      await inventory.save();
      product.inventoryData = inventory._id;
      await product.save();
    }

    return NextResponse.json({
      message: "Inventory updated successfully",
      inventory: {
        availableQuantity: inventory.availableQuantity,
        reorderLevel: inventory.reorderLevel,
        reservedQuantity: inventory.reservedQuantity
      }
    });
    
  } catch (error) {
    console.error("Error updating product inventory:", error);
    return NextResponse.json(
      { message: error.message || "Failed to update inventory" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 }
      );
    }

    // Find the product with inventory data
    const product = await Product.findById(productId).populate('inventoryData');
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    const inventoryData = product.inventoryData || {
      availableQuantity: 0,
      reorderLevel: 0,
      reservedQuantity: 0
    };

    return NextResponse.json({
      inventory: inventoryData
    });
    
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
