import Review from '@/models/Review';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import User from '@/models/User';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import Product from '@/models/Product';

export async function GET(request) {
  try {
    await connectToDatabase();

    // Parse query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const variantFilter = searchParams.get('specificCategoryVariant');
    const isAdminReviewParam = searchParams.get('isAdminReview'); 
      // can be "true" or "false"

    const skip = (page - 1) * limit;

    // Build query object
    let query = {};

    // Date range filters
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      query.createdAt = { $gte: start, $lte: end };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    // Variant filter
    if (variantFilter) {
      query.specificCategoryVariant = new ObjectId(variantFilter);
    }

    // isAdminReview filter
    if (isAdminReviewParam === 'true') {
      query.isAdminReview = true;
    } else if (isAdminReviewParam === 'false') {
      query.isAdminReview = false;
    }

    // Count for pagination
    const totalReviews = await Review.countDocuments(query);

    // Fetch reviews with pagination
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('product', 'name')
      .populate('specificCategory', 'name')
      .populate('specificCategoryVariant', 'name')
      .populate('user', 'name phoneNumber');

    return new Response(
      JSON.stringify({
        reviews,
        totalReviews,
        totalPages: Math.ceil(totalReviews / limit),
        currentPage: page,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch reviews.' }),
      { status: 500 }
    );
  }
}


// Create a new review
export async function POST(request) {
    try {
        await connectToDatabase();
        const data = await request.json();

        console.log('[Reviews POST] Incoming request data:', JSON.stringify({
            name: data.name,
            comment: data.comment?.substring(0, 50) + '...',
            rating: data.rating,
            isAdminReview: data.isAdminReview,
            product: data.product,
            specificCategory: data.specificCategory,
            specificCategoryVariant: data.specificCategoryVariant,
            user: data.user,
        }, null, 2));

        // Perform necessary validations
        if (!data.name || !data.comment || !data.rating) {
            console.warn('[Reviews POST] Validation failed: Missing required fields.', {
                hasName: !!data.name,
                hasComment: !!data.comment,
                hasRating: !!data.rating
            });
            return new Response(JSON.stringify({ error: 'Name, comment, and rating are required.' }), { status: 400 });
        }

        if (!data.isAdminReview && !data.product) {
            console.warn('[Reviews POST] Validation failed: User reviews require a product reference.');
            return new Response(JSON.stringify({ error: 'User reviews must include a product reference.' }), { status: 400 });
        }

        if (data.isAdminReview && !data.product && !data.specificCategory && !data.specificCategoryVariant) {
            console.warn('[Reviews POST] Validation failed: Admin reviews require at least one scope reference.');
            return new Response(JSON.stringify({ error: 'Admin reviews must include a product, specific category, or variant reference.' }), { status: 400 });
        }

        // Remove empty string values for ObjectId fields to prevent cast errors
        const objectIdFields = ['product', 'specificCategory', 'specificCategoryVariant', 'user'];
        const removedFields = [];
        objectIdFields.forEach(field => {
            if (data[field] === '' || data[field] === null || data[field] === undefined) {
                removedFields.push({ field, originalValue: data[field] });
                delete data[field];
            }
        });

        if (removedFields.length > 0) {
            console.log('[Reviews POST] Removed empty/null ObjectId fields:', removedFields);
        }

        console.log('[Reviews POST] Sanitized data before create:', JSON.stringify({
            name: data.name,
            rating: data.rating,
            isAdminReview: data.isAdminReview,
            product: data.product,
            specificCategory: data.specificCategory,
            specificCategoryVariant: data.specificCategoryVariant,
            user: data.user,
        }, null, 2));

        const newReview = await Review.create(data);

        console.log('[Reviews POST] Review created successfully:', {
            reviewId: newReview._id,
            name: newReview.name,
            isAdminReview: newReview.isAdminReview
        });

        return new Response(JSON.stringify(newReview), { status: 201 });
    } catch (error) {
        console.error('[Reviews POST] Error creating review:', {
            errorMessage: error.message,
            errorName: error.name,
            errors: error.errors ? Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message,
                value: error.errors[key].value
            })) : null,
            stack: error.stack
        });
        return new Response(JSON.stringify({ error: 'Failed to create review.' }), { status: 500 });
    }
}

// ... You can keep your existing PUT, DELETE handlers, etc.
