
// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import Product from "@/models/Product";
// import Option from "@/models/Option";

// export async function POST(request) {
//   try {
//     await connectToDatabase();
//     const { products } = await request.json();
//     console.log("Received products:", products.options);

//     if (!products || !Array.isArray(products)) {
//       return NextResponse.json(
//         { message: "Invalid payload. Expected an array of products." },
//         { status: 400 }
//       );
//     }

//     const summary = {
//       processed: products.length,
//       success: 0,
//       errors: [],
//     };

//     const details = [];

//     for (const prod of products) {
//       // Prepare detailed result for this product
//       const productDetail = {
//         productName: prod.name,
//         status: "Success",
//         error: null,
//       };

//       try {
//         // Build the product data matching the updated Product schema.
//         // Note: optionsAvailable is true if prod.options is an array with at least one element.
//         const productData = {
//           name: prod.name,
//           title: prod.title,
//           mainTags: prod.mainTags || [],
//           pageSlug: prod.pageSlug,
//           category: prod.category,
//           subCategory: prod.subCategory,
//           specificCategory: prod.specificCategory, // as string/ObjectId
//           specificCategoryVariant: prod.specificCategoryVariant, // as string/ObjectId
//           deliveryCost: prod.deliveryCost || 100,
//           price: prod.price,
//           sku: prod.sku, // if not provided, you may generate one on the fly
//           designTemplate: prod.designTemplate, // expecting { designCode, imageUrl }
//           images: prod.images || [],
//           displayOrder: 0,
//           available: prod.available !== undefined ? prod.available : true,
//           optionsAvailable: prod.options && Array.isArray(prod.options) && prod.options.length > 0,
//         };

//         console.log("productData", productData);

//         // Create and save the product document
//         const newProduct = new Product(productData);
//         const savedProduct = await newProduct.save();
//         console.log("Saved Product", savedProduct);

//         // If options data is provided, loop through each option set.
//         if (productData.optionsAvailable) {
//           for (let index = 0; index < prod.options.length; index++) {
//             const optionObj = prod.options[index];
//             const optionData = {
//               product: savedProduct._id,
//               // Generate a unique option SKU using the product SKU with an "-OPT{index+1}" suffix.
//               sku: optionObj.sku || `${savedProduct.sku}-OPT${index + 1}`,
//               optionDetails: optionObj.optionDetails, // e.g., { color: "red", size: "M" }
//               availableQuantity: optionObj.availableQuantity || 0,
//               reservedQuantity: optionObj.reservedQuantity || 0,
//               reorderLevel: optionObj.reorderLevel || 50,
//               images: optionObj.images || [],
//             };
//             await Option.create(optionData);
//           }
//         }

//         summary.success++;
//       } catch (err) {
//         productDetail.status = "Failed";
//         productDetail.error = err.message;
//         summary.errors.push(`Error processing product "${prod.name}": ${err.message}`);
//       }

//       details.push(productDetail);
//     }

//     return NextResponse.json(
//       { message: "Bulk product upload complete", summary, details },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("POST /api/admin/manage/bulk-products error:", error);
//     return NextResponse.json(
//       { message: "Internal server error", error: error.message },
//       { status: 500 }
//     );
//   }
// }


import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Product from "@/models/Product";
import Option from "@/models/Option";
import Inventory from "@/models/Inventory";
import Brand from "@/models/Brand"

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
        // If none is provided, default to "MaddyCustom"
        const brandNameVal =
          prod.brand && prod.brand.trim() !== "" ? prod.brand.trim() : "MaddyCustom";
        // Set productSource based on the brand value.
        const productSource = brandNameVal !== "MaddyCustom" ? "marketplace" : "inhouse";

        // Look up the Brand document using the brand name (case sensitive or adjust query as needed)
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
          specificCategory: prod.specificCategory, // as ObjectId (from variant context)
          specificCategoryVariant: prod.specificCategoryVariant, // as ObjectId
          deliveryCost: prod.deliveryCost || 100,
          price: prod.price,
          sku: prod.sku,
          designTemplate: prod.designTemplate,
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
