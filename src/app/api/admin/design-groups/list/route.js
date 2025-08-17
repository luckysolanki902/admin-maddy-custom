import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import DesignGroup from '../../../../../models/DesignGroup';
import Product from '../../../../../models/Product';

export async function GET() {
  try {
    await connectToDatabase();

    // Get all active design groups with product count
    const designGroups = await DesignGroup.find({ isActive: true })
      .sort({ createdAt: -1 });

    const groupsWithCounts = await Promise.all(
      designGroups.map(async (group) => {
        const productCount = await Product.countDocuments({ 
          designGroupId: group._id, // Use ObjectId directly
          available: true 
        });

        return {
          _id: group._id,
          name: group.name,
          thumbnail: group.thumbnail,
          productCount,
          createdAt: group.createdAt
        };
      })
    );

    // Filter out groups with no products
    const activeGroups = groupsWithCounts.filter(group => group.productCount > 0);

    return NextResponse.json({
      success: true,
      designGroups: activeGroups
    });

  } catch (error) {
    console.error('Error fetching design groups for selection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch design groups' },
      { status: 500 }
    );
  }
}
