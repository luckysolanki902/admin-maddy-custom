import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DisplayAsset from '@/models/DisplayAssets';

export async function GET(req) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || 'homepage';
    const componentType = searchParams.get('componentType');
    
    let query = { page };
    if (componentType) {
      query.componentType = componentType;
    }
    
    const assets = await DisplayAsset.find(query)
      .sort({ position: 1, createdAt: 1 });
    
    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
    console.error('Error fetching display assets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch display assets' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    
    // Validate required fields
    const { componentName, componentType, content, page } = body;
    if (!componentName || !componentType || !content || !page) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: componentName, componentType, content, page' },
        { status: 400 }
      );
    }
    
    const newAsset = new DisplayAsset(body);
    await newAsset.save();
    
    return NextResponse.json({ success: true, data: newAsset }, { status: 201 });
  } catch (error) {
    console.error('Error creating display asset:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to create display asset' },
      { status: 500 }
    );
  }
}
