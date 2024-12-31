// /app/api/products/route.js

import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant'; // Import the SpecificCategoryVariant model
import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';

/**
 * GET /api/products
 * 
 * Retrieves all products with specificCategoryCode of 'win', 'bw', or 'tw',
 * transforms the data, and returns it as a downloadable CSV file.
 */
export async function GET() {
  try {
    // Establish a connection to the database
    await connectToDatabase();

    // Define the specificCategoryCodes to filter
    const specificCategoryCodes = ['win', 'bw', 'tw'];

    // Fetch SpecificCategory documents matching the specified codes
    const specificCategories = await SpecificCategory.find({
      specificCategoryCode: { $in: specificCategoryCodes },
    }).select('_id'); // Select only the _id field for efficiency

    // Extract the IDs of the matched SpecificCategories
    const specificCategoryIds = specificCategories.map(cat => cat._id);

    // Fetch Products that belong to the matched SpecificCategories
    const products = await Product.find({
      specificCategory: { $in: specificCategoryIds },
      available: true, // Assuming you only want available products
    })
      .populate('specificCategoryVariant') // Populate the specificCategoryVariant field
      .lean(); // Use lean() for faster Mongoose queries by returning plain JavaScript objects

    // Transform the product data to match the CSV requirements
    const csvData = products.map(product => ({
      id: product.sku,
      title: product.title,
      description: product.specificCategoryVariant && product.specificCategoryVariant.productDescription
        ? product.specificCategoryVariant.productDescription.replace('{uniqueName}', product.name)
        : '',
      availability: 'in stock', // Static value as per requirements
      condition: 'new',         // Static value as per requirements
      price: product.price,
      link: `https://www.maddycustom.com/shop${product.pageSlug}`,
      image_link: product.images[0]
        ? `https://d26w01jhwuuxpo.cloudfront.net${product.images[0]}`
        : '',
      brand: 'Maddy Custom', // Static value as per requirements
    }));

    // Define the CSV fields in the desired order
    const fields = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'brand',
    ];

    // Initialize the JSON to CSV parser with the defined fields
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    // Return the CSV as a downloadable file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=products.csv',
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
