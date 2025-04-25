// /app/api/testing/make-random-dummy-review-count/route.js
import { connectToDatabase } from '@/lib/db';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import { NextResponse } from 'next/server';

export const GET = async () => {
  try {
    // Connect to the database
    await connectToDatabase();

    // Fetch all available category variants
    const variants = await SpecificCategoryVariant.find({ available: true });

    // Update each document with a random tempReviewCount value between 60 and 80 (as per your code)
    const updatePromises = variants.map(async (variant) => {
      // Generate a random integer between 60 and 80 (inclusive)
      const randomReviewCount =
        Math.floor(Math.random() * (80 - 60 + 1)) + 60;
      variant.tempReviewCount = randomReviewCount;

      // We'll only generate counts for ratings 3, 4, and 5.
      const T = randomReviewCount;

      // Choose x (the count for rating 3)
      // x must be at least 1 and at most floor((T-2)/3)
      const maxX = Math.floor((T - 2) / 3);
      // Ensure maxX is at least 1
      const x = Math.floor(Math.random() * maxX) + 1;

      // Choose y (the second cut) such that:
      // y is at least 2*x + 1 (so that rating 4 count = y - x > x)
      // and y is less than (T + x)/2 (so that rating 5 count = T - y > y - x)
      const minY = 2 * x + 1;
      const maxY = Math.floor((T + x) / 2);

      let y;
      if (minY >= maxY) {
        y = minY;
      } else {
        y = Math.floor(Math.random() * (maxY - minY)) + minY;
      }

      const count3 = x;          // for rating 3
      const count4 = y - x;        // for rating 4
      const count5 = T - y;        // for rating 5

      // Set the tempReviewDistribution as an object
      variant.tempReviewDistribution = {
        1:0,
        2:0,
        3: count3,
        4: count4,
        5: count5,
      };

      // Save the updated variant document
      return variant.save();
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message:
        'tempReviewCount updated successfully for all available category variants.',
      updatedCount: variants.length,
    });
  } catch (error) {
    console.error('Error updating tempReviewCount:', error);
    return NextResponse.json(
      { error: 'Failed to update tempReviewCount' },
      { status: 500 }
    );
  }
};