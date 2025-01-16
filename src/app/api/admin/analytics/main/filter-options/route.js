// /app/api/admin/analytics/main/filter-options/route.js

import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectToDatabase();

    const salesSources = await Order.distinct('utmDetails.source');
    const categories = await Product.distinct('category');

    return new Response(JSON.stringify({ salesSources, categories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
