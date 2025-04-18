import Review from '@/models/Review';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
export async function GET(request, { params }) {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
        console.warn('Validation failed: Invalid variant ID format.');
        return new Response(JSON.stringify({ error: 'Invalid variant ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();
        const products = await Product.find({ specificCategoryVariant: id });
        return new Response(JSON.stringify(products), { status: 200 });
    } catch (error) {
        console.error('Error fetching products:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch products.' }), { status: 500 });
    }
}
