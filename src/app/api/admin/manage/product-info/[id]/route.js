// /app/api/productinfo/[id]/route.js
import ProductInfoTab from '@/models/ProductInfoTab';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

/**
 * PUT /api/productinfo/[id]
 *
 * Updates an existing product info document.
 *
 * Expected JSON payload (one or more fields to update):
 * {
 *   content: { ... },
 *   product: "productId" (optional),
 *   specificCategoryVariant: "variantId" (optional),
 *   specificCategory: "categoryId" (optional),
 *   // Other fields if required
 * }
 */
export async function PUT(request, { params }) {
  const { id } = await params;

  // Validate id format
  if (!ObjectId.isValid(id)) {
    return new Response(
      JSON.stringify({ error: "Invalid document id." }),
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    await connectToDatabase();

    const updatedProductInfo = await ProductInfoTab.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );

    if (!updatedProductInfo) {
      return new Response(
        JSON.stringify({ error: "Document not found." }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify(updatedProductInfo), { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/productinfo/[id]:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * DELETE /api/productinfo/[id]
 *
 * Deletes an existing product info document.
 */
export async function DELETE(request, { params }) {
  const { id } = params;

  // Validate id format
  if (!ObjectId.isValid(id)) {
    return new Response(
      JSON.stringify({ error: "Invalid document id." }),
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const deleted = await ProductInfoTab.findByIdAndDelete(id);
    if (!deleted) {
      return new Response(
        JSON.stringify({ error: "Document not found." }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ message: "Product info deleted successfully." }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/productinfo/[id]:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
