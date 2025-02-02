import Review from '@/models/Review';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

// Fetch all reviews
export async function GET() {
    console.log('Fetching all reviews');
    try {
        await connectToDatabase();
        const reviews = await Review.find()
            .populate('product', 'name')
            .populate('specificCategory', 'name')
            .populate('specificCategoryVariant', 'name')
            .populate('user', 'name phoneNumber');

        return new Response(JSON.stringify(reviews), { status: 200 });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch reviews.' }), { status: 500 });
    }
}

// Create a new review
export async function POST(request) {
    console.log('Creating a new review');
    try {
        await connectToDatabase();
        const data = await request.json();

        // Perform necessary validations
        if (!data.title || !data.comment || !data.rating) {
            console.warn('Validation failed: Missing required fields.');
            return new Response(JSON.stringify({ error: 'Title, comment, and rating are required.' }), { status: 400 });
        }

        if (!data.isAdminReview && !data.product) {
            console.warn('Validation failed: User reviews require a product reference.');
            return new Response(JSON.stringify({ error: 'User reviews must include a product reference.' }), { status: 400 });
        }

        if (data.isAdminReview && !data.product && !data.specificCategory && !data.specificCategoryVariant) {
            console.warn('Validation failed: Admin reviews require at least one scope reference.');
            return new Response(JSON.stringify({ error: 'Admin reviews must include a product, specific category, or variant reference.' }), { status: 400 });
        }

        const newReview = await Review.create(data);

        return new Response(JSON.stringify(newReview), { status: 201 });
    } catch (error) {
        console.error('Error creating review:', error);
        return new Response(JSON.stringify({ error: 'Failed to create review.' }), { status: 500 });
    }
}