// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import Product from "@/models/Product";
// import Option from "@/models/Option";

// export async function POST(request) {
//   try {
//     await connectToDatabase();
//     const { products } = await request.json();
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



//     for (const prod of products) {
//       try {
//         // Create the product document
//         const newProduct = new Product(prod);
//         const savedProduct = await newProduct.save();

//         // If options data is provided, create Option documents
//         if (prod.options && Array.isArray(prod.options) && prod.options.length > 0) {
//           for (const opt of prod.options) {
//             // Associate each option with the product
//             opt.product = savedProduct._id;
//             await Option.create(opt);
//           }
//         }
//         summary.success++;
//       } catch (err) {
//         summary.errors.push(`Error processing product "${prod.name}": ${err.message}`);
//       }
//     }

//     return NextResponse.json(
//       { message: "Bulk product upload complete", summary },
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


// import { NextResponse } from "next/server";
// import { connectToDatabase } from "@/lib/db";
// import Product from "@/models/Product";
// import Option from "@/models/Option";

// export async function POST(request) {
//   try {
//     await connectToDatabase();
//     const { products } = await request.json();

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
//     console.log(products,"in api")
//     for (const prod of products) {
//       try {
//         // Create and save the product document
//         const newProduct = new Product(prod);
//         const savedProduct = await newProduct.save();

//         // If option details are provided, create a single Option document.
//         // Expect prod.options to be an object with keys: optionDetails, availableQuantity, reservedQuantity, reorderLevel, and sku.
//         if (
//           prod.options &&
//           typeof prod.options === "object" &&
//           Object.keys(prod.options).length > 0
//         ) {
//           const optionData = {
//             product: savedProduct._id,
//             sku: prod.options.sku, // You can generate this as needed if not provided
//             optionDetails: prod.options.optionDetails, // This should be an object like { color: 'red', size: 'M' }
//             availableQuantity: prod.options.availableQuantity || 0,
//             reservedQuantity: prod.options.reservedQuantity || 0,
//             reorderLevel: prod.options.reorderLevel || 50,
//           };
//           await Option.create(optionData);
//         }

//         summary.success++;
//       } catch (err) {
//         summary.errors.push(
//           `Error processing product "${prod.name}": ${err.message}`
//         );
//       }
//     }

//     return NextResponse.json(
//       { message: "Bulk product upload complete", summary },
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

        // console.log(products,"in api")

    for (const prod of products) {
      try {
        // Build the product data matching the updated Product schema:
        // Expecting keys: name, title, mainTags, pageSlug, category, subCategory,
        // specificCategory, specificCategoryVariant, deliveryCost, price, sku,
        // designTemplate, images, displayOrder, available.
        // Additionally, set optionsAvailable based on whether option data is provided.
        const productData = {
          name: prod.name,
          title: prod.title,
          mainTags: prod.mainTags || [], // Expecting an array (e.g., [mainTag])
          pageSlug: prod.pageSlug,
          category: prod.category,
          subCategory: prod.subCategory,
          specificCategory: prod.specificCategory, // should be an ObjectId (as string)
          specificCategoryVariant: prod.specificCategoryVariant, // as string
          deliveryCost: prod.deliveryCost || 100,
          price: prod.price,
          sku: prod.sku, // optional; if not provided, you can generate one on the fly
          designTemplate: prod.designTemplate, // Expecting { designCode, imageUrl }
          images: prod.images || [],
          displayOrder: 0,
          available: prod.available !== undefined ? prod.available : true,
          optionsAvailable: prod.options && Object.keys(prod.options).length > 0,
        };

        console.log(productData,"productData")

        // Create and save the Product document
        const newProduct = new Product(productData);
        const savedProduct = await newProduct.save();
        console.log("saved PRoduct",savedProduct)

        // If options data is provided, create a single Option document.
        // Expect prod.options to be an object with:
        // optionDetails (an object of key:value pairs),
        // availableQuantity, reservedQuantity, reorderLevel, and optionally sku.
        if (productData.optionsAvailable) {
          const optionData = {
            product: savedProduct._id,
            sku: prod.options.sku || `${savedProduct.sku}-OPT1`,
            optionDetails: prod.options.optionDetails, // e.g., { color: "red", size: "M" }
            availableQuantity: prod.options.availableQuantity || 0,
            reservedQuantity: prod.options.reservedQuantity || 0,
            reorderLevel: prod.options.reorderLevel || 50,
          };
          await Option.create(optionData);
        }

        summary.success++;
        console.log(summary)
      } catch (err) {
        summary.errors.push(
          `Error processing product "${prod.name}": ${err.message}`
        );
      }
    }

    return NextResponse.json(
      { message: "Bulk product upload complete", summary },
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
