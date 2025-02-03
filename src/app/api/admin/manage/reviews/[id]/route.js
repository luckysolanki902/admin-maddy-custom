import Review from '@/models/Review';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';


// Update a review by ID
export async function PUT(request, { params }) {
    const { id } =await  params;
    console.log(`Updating review ID: ${id}`);

    if (!ObjectId.isValid(id)) {
        console.warn('Validation failed: Invalid review ID format.');
        return new Response(JSON.stringify({ error: 'Invalid review ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();
        const data = await request.json();

        if ('_id' in data) delete data._id;

        const updatedReview = await Review.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });

        if (!updatedReview) {
            console.warn('Review not found.');
            return new Response(JSON.stringify({ error: 'Review not found.' }), { status: 404 });
        }

        return new Response(JSON.stringify(updatedReview), { status: 200 });
    } catch (error) {
        console.error('Error updating review:', error);
        return new Response(JSON.stringify({ error: 'Failed to update review.' }), { status: 500 });
    }
}

// Delete a review by ID
export async function DELETE(request, { params }) {
    const { id } = await params;
    console.log(`Deleting review ID: ${id}`);

    if (!ObjectId.isValid(id)) {
        console.warn('Validation failed: Invalid review ID format.');
        return new Response(JSON.stringify({ error: 'Invalid review ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();

        const deletedReview = await Review.findByIdAndDelete(id);

        if (!deletedReview) {
            console.warn('Review not found.');
            return new Response(JSON.stringify({ error: 'Review not found.' }), { status: 404 });
        }

        return new Response(JSON.stringify(deletedReview), { status: 200 });
    } catch (error) {
        console.error('Error deleting review:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete review.' }), { status: 500 });
    }
}

// Fetch categories for review scope
// export async function GET_CATEGORIES() {
//     console.log('Fetching categories for reviews');
//     try {
//         await connectToDatabase();
//         const categories = await SpecificCategory.find();
//         return new Response(JSON.stringify(categories), { status: 200 });
//     } catch (error) {
//         console.error('Error fetching categories:', error);
//         return new Response(JSON.stringify({ error: 'Failed to fetch categories.' }), { status: 500 });
//     }
// }

// Fetch variants for a specific category
export async function GET_VARIANTS(request, { params }) {
    const { categoryId } = await params;
    console.log(`Fetching variants for category ID: ${categoryId}`);

    if (!ObjectId.isValid(categoryId)) {
        console.warn('Validation failed: Invalid category ID format.');
        return new Response(JSON.stringify({ error: 'Invalid category ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();
        const variants = await SpecificCategoryVariant.find({ specificCategory: categoryId });
        return new Response(JSON.stringify(variants), { status: 200 });
    } catch (error) {
        console.error('Error fetching variants:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch variants.' }), { status: 500 });
    }
}

// Fetch products for a specific variant
export async function GET_PRODUCTS(request, { params }) {
    const { variantId } = await params;
    console.log(`Fetching products for variant ID: ${variantId}`);

    if (!ObjectId.isValid(variantId)) {
        console.warn('Validation failed: Invalid variant ID format.');
        return new Response(JSON.stringify({ error: 'Invalid variant ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();
        const products = await Product.find({ specificCategoryVariant: variantId });
        return new Response(JSON.stringify(products), { status: 200 });
    } catch (error) {
        console.error('Error fetching products:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch products.' }), { status: 500 });
    }
}
