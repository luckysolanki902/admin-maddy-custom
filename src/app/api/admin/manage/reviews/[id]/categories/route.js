import Review from '@/models/Review';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET_CATEGORIES() {
    console.log('Fetching categories for reviews');
    try {
        await connectToDatabase();
        const categories = await SpecificCategory.find();
        return new Response(JSON.stringify(categories), { status: 200 });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch categories.' }), { status: 500 });
    }
}