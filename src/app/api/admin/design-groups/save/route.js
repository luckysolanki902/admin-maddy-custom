import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import Product from '../../../../../models/Product';
import Option from '../../../../../models/Option';
import DesignGroup from '../../../../../models/DesignGroup';

export async function POST(request) {
  console.log('[DesignGroup Save] Starting create process...');
  try {
    await connectToDatabase();
    
    const { groupId, products, name, searchKeywords } = await request.json();
    
    // Validate products array
    if (!products || !Array.isArray(products) || products.length < 2) {
      console.error('[DesignGroup Save] Invalid products array:', { products, length: products?.length });
      return NextResponse.json(
        { error: 'At least 2 products are required' },
        { status: 400 }
      );
    }
    
    // Get the first product to use its name as the group name
    const firstProduct = await Product.findById(products[0]).select('name images optionsAvailable');
    if (!firstProduct) {
      console.error('[DesignGroup Save] First product not found:', products[0]);
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }
    
    // Use the first product's name as the group name (unless a custom name is provided)
    const groupName = name?.trim() || firstProduct.name || `Group ${Date.now()}`;
    if (groupName.length > 200) {
      console.error('[DesignGroup Save] Group name too long:', groupName.length);
      return NextResponse.json(
        { error: 'Group name must be 200 characters or less' },
        { status: 400 }
      );
    }
    
    // Validate and clean search keywords
    const cleanSearchKeywords = (searchKeywords || [])
      .filter(keyword => keyword && keyword.trim())
      .map(keyword => keyword.trim().toLowerCase())
      .slice(0, 20); // Ensure max 20 keywords
    
    console.log('[DesignGroup Save] Cleaned search keywords:', cleanSearchKeywords);
    
    // Determine thumbnail from product images or option images/thumbnails
    let thumbnail = null;
    
    // First try to get from product images
    if (firstProduct.images && firstProduct.images.length > 0) {
      thumbnail = firstProduct.images[0];
    } 
    // If no product images but has options, try to get from options
    else if (firstProduct.optionsAvailable) {
      try {
        const options = await Option.find({ product: firstProduct._id })
          .select('images thumbnail')
          .limit(3);
        
        if (options && options.length > 0) {
          // First check if any option has a specific thumbnail
          const optionWithThumbnail = options.find(opt => opt.thumbnail);
          if (optionWithThumbnail) {
            thumbnail = optionWithThumbnail.thumbnail;
          }
          // Otherwise use the first image from any option
          else {
            const optionWithImages = options.find(opt => opt.images && opt.images.length > 0);
            if (optionWithImages) {
              thumbnail = optionWithImages.images[0];
            }
          }
        }
      } catch (error) {
        console.error('Error fetching option thumbnail for product:', firstProduct._id, error);
      }
    }
    
    // Create new design group with provided name and search keywords (no tags)
    const designGroup = new DesignGroup({
      name: groupName,
      searchKeywords: cleanSearchKeywords,
      thumbnail: thumbnail,
      isActive: true
    });
    
    console.log('[DesignGroup Save] Creating design group:', { name: groupName, searchKeywords: cleanSearchKeywords.length });
    const savedGroup = await designGroup.save();
    console.log('[DesignGroup Save] Design group created with ID:', savedGroup._id);
    
    // Update all products with the design group ID (as ObjectId)
    const result = await Product.updateMany(
      { _id: { $in: products } },
      { $set: { designGroupId: savedGroup._id } }
    );
    
    console.log('[DesignGroup Save] Products update result:', { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount });
    
    if (result.modifiedCount === 0) {
      // If no products were updated, remove the created group
      await DesignGroup.findByIdAndDelete(savedGroup._id);
      console.error('[DesignGroup Save] No products updated, rolling back group creation');
      return NextResponse.json(
        { error: 'No products were updated' },
        { status: 400 }
      );
    }
    
    console.log('[DesignGroup Save] Successfully created design group:', savedGroup._id);
    return NextResponse.json({
      message: 'Design group created successfully',
      groupId: savedGroup._id.toString(),
      groupName: savedGroup.name,
      groupSearchKeywords: savedGroup.searchKeywords,
      productsUpdated: result.modifiedCount
    });
    
  } catch (error) {
    console.error('[DesignGroup Save] Error saving design group:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
