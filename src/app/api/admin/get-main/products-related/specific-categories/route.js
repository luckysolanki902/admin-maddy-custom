// /app/api/admin/get-main/products-related/specific-categories/route.js

import { connectToDatabase } from '@/lib/db';
import SpecificCategory from '@/models/SpecificCategory';

export async function GET(request) {
  try {
    await connectToDatabase();

    const categories = await SpecificCategory.find({})
      .select('name specificCategoryCode _id')
      .lean();

    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching specific categories:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
