


import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import Option from "@/models/Option";
import Inventory from "@/models/Inventory";
import Brand from "@/models/Brand";

export async function POST(request) {
  try {
    await connectToDatabase();
    const { products } = await request.json();
    console.log("Received products:", products);

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { message: "Invalid payload. Expected an array of products." },
        { status: 400 }
      );
    }

    const summary = {
      processed: products.length,
      success: 0,
      errors: [],
    };
    const details = [];

    for (const prod of products) {
      // Prepare detailed result for this product
      const productDetail = {
        productName: prod.name,
        status: "Success",
        error: null,
      };

      try {
        // Determine the brand name from CSV.
        const brandNameVal =
          prod.brand && prod.brand.trim() !== "" ? prod.brand.trim() : "MaddyCustom";
        // Set productSource based on the brand value.
        const productSource = brandNameVal !== "MaddyCustom" ? "marketplace" : "inhouse";

        // Look up the Brand document using the brand name.
        const foundBrand = await Brand.findOne({ name: brandNameVal });
        const brandId = foundBrand ? foundBrand._id : null;

        // If product-level inventory is provided, create an Inventory document.
        let productInventoryRef = null;
        if (prod.inventoryData) {
          const inv = await Inventory.create(prod.inventoryData);
          productInventoryRef = inv._id;
        }

        // Build product data for the Product document.
        const productData = {
          name: prod.name,
          title: prod.title,
          mainTags: prod.mainTags || [],
          pageSlug: prod.pageSlug,
          category: prod.category,
          subCategory: prod.subCategory,
          specificCategory: prod.specificCategory,
          specificCategoryVariant: prod.specificCategoryVariant,
          deliveryCost: prod.deliveryCost || 100,
          price: prod.price,
          sku: prod.sku,
          ...(prod.designTemplate ? { designTemplate: prod.designTemplate } : {}),
          images: prod.images || [],
          displayOrder: prod.displayOrder || 0,
          available: prod.available !== undefined ? prod.available : true,
          productSource,
          brand: brandId,
          inventoryData: productInventoryRef,
        };

        console.log("Product data:", productData);

        // Create and save the Product document.
        const newProduct = new Product(productData);
        const savedProduct = await newProduct.save();
        console.log("Saved Product:", savedProduct);

        // Process each option if provided.
        if (prod.options && Array.isArray(prod.options) && prod.options.length > 0) {
          for (let i = 0; i < prod.options.length; i++) {
            const optionObj = prod.options[i];
            let optionInventoryRef = null;
            if (optionObj.inventoryData) {
              const invOption = await Inventory.create(optionObj.inventoryData);
              optionInventoryRef = invOption._id;
            }
            const optionData = {
              product: savedProduct._id,
              sku: optionObj.sku || `${savedProduct.sku}-O${i + 1}`,
              optionDetails: optionObj.optionDetails,
              inventoryData: optionInventoryRef,
              images: optionObj.images || [],
              thumbnail: optionObj.thumbnail || undefined, // Pass the thumbnail field
            };
            await Option.create(optionData);
          }
        }

        summary.success++;
      } catch (err) {
        productDetail.status = "Failed";
        productDetail.error = err.message;
        summary.errors.push(`Error processing product "${prod.name}": ${err.message}`);
      }
      details.push(productDetail);
    }

    return NextResponse.json(
      { message: "Bulk product upload complete", summary, details },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/admin/manage/bulk-products error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

