// /app/api/admin/get-main/products-related/specific-category-variants/[categoryId]/route.js

import { connectToDatabase } from '@/lib/db';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';

export async function GET(request, { params }) {
  const { categoryId } = await params;

  if (!categoryId) {
    return new Response(JSON.stringify({ error: 'Category ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectToDatabase();

    const variants = await SpecificCategoryVariant.find({ specificCategory: categoryId })
      .select('name variantCode _id')
      .lean();

    return new Response(JSON.stringify(variants), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching specific category variants:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
