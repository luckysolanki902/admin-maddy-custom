// /app/api/admin/manage/reviews/route.js

import Review from '@/models/Review';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

// Fetch all reviews
// ... Existing imports ...

export async function GET(request) {
    console.log('Fetching all reviews');
    try {
        await connectToDatabase();

        // Parse query parameters
        const url = new URL(request.url);
        const searchParams = url.searchParams;

        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100); // Max limit to prevent abuse
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const skip = (page - 1) * limit;

        // Build query object with date filtering
        let query = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            query.createdAt = { $gte: start, $lte: end };
        } else if (startDate) {
            const start = new Date(startDate);
            query.createdAt = { $gte: start };
        } else if (endDate) {
            const end = new Date(endDate);
            query.createdAt = { $lte: end };
        }

        // Optionally, add more filters here (e.g., status, product, etc.)

        // Fetch total count for pagination
        const totalReviews = await Review.countDocuments(query);

        // Fetch reviews with pagination and populate related fields
        const reviews = await Review.find(query)
            .sort({ createdAt: -1 }) // Sort by newest first
            .skip(skip)
            .limit(limit)
            .populate('product', 'name')
            .populate('specificCategory', 'name')
            .populate('specificCategoryVariant', 'name')
            .populate('user', 'name phoneNumber');

        return new Response(JSON.stringify({
            reviews,
            totalReviews,
            totalPages: Math.ceil(totalReviews / limit),
            currentPage: page,
        }), { status: 200 });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch reviews.' }), { status: 500 });
    }
}

// ... Existing POST, PUT, DELETE handlers ...


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