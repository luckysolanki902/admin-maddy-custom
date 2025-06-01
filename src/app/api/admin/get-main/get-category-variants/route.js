// /app/api/admin/get-main/get-category-variants/route.js

import { connectToDatabase } from '@/lib/db';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import SpecificCategory from '@/models/SpecificCategory';
import { NextResponse } from 'next/server';

export const GET = async () => {
  try {
    await connectToDatabase();

    // First, get all available variants
    const variants = await SpecificCategoryVariant.find({ available: true })
      .select('_id name specificCategory thumbnail')
      .populate('specificCategory', 'name _id')
      .lean()
      .exec();

    // Get all the specific categories for grouping
    const specificCategories = await SpecificCategory.find({})
      .select('_id name')
      .lean()
      .exec();

    // Create a map of category IDs to names for faster lookup
    const categoryMap = specificCategories.reduce((acc, category) => {
      acc[category._id.toString()] = category.name;
      return acc;
    }, {});

    // Group variants by their specific category
    const groupedVariants = variants.reduce((acc, variant) => {
      const categoryId = variant.specificCategory?._id?.toString() || 'uncategorized';
      const categoryName = variant.specificCategory?.name || 'Uncategorized';
      
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          name: categoryName,
          options: []
        };
      }
      
      acc[categoryId].options.push({
        id: variant._id,
        name: variant.name,
        thumbnail: variant.thumbnail || null
      });
      
      return acc;
    }, {});

    // Convert the grouped object to an array
    const groupedVariantsArray = Object.values(groupedVariants);
    
    // Sort groups alphabetically by name
    groupedVariantsArray.sort((a, b) => a.name.localeCompare(b.name));
    
    // Sort options within each group
    groupedVariantsArray.forEach(group => {
      group.options.sort((a, b) => a.name.localeCompare(b.name));
    });

    return NextResponse.json(groupedVariantsArray);
  } catch (error) {
    console.error("Error fetching category variants:", error);
    return NextResponse.json({ error: 'Failed to fetch category variants' }, { status: 500 });
  }
};
