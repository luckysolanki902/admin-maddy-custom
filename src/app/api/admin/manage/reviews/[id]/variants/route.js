import Review from '@/models/Review';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
    const { id } = await params;
    console.log(`Fetching variants for category ID: ${id}`);

    if (!ObjectId.isValid(id)) {
        console.warn('Validation failed: Invalid category ID format.');
        return new Response(JSON.stringify({ error: 'Invalid category ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();
        const variants = await SpecificCategoryVariant.find({ specificCategory: id });
        return new Response(JSON.stringify(variants), { status: 200 });
    } catch (error) {
        console.error('Error fetching variants:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch variants.' }), { status: 500 });
    }
}