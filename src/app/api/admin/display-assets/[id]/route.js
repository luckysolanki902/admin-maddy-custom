import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DisplayAsset from '@/models/DisplayAssets';

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    const asset = await DisplayAsset.findOne({ componentId: id });
    
    if (!asset) {
      return NextResponse.json(
        { success: false, error: 'Display asset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error('Error fetching display asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch display asset' },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const body = await req.json();
    
    const updatedAsset = await DisplayAsset.findOneAndUpdate(
      { componentId: id },
      body,
      { new: true, runValidators: true }
    );
    
    if (!updatedAsset) {
      return NextResponse.json(
        { success: false, error: 'Display asset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: updatedAsset });
  } catch (error) {
    console.error('Error updating display asset:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to update display asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();
    
    const { id } = params;
    const deletedAsset = await DisplayAsset.findOneAndDelete({ componentId: id });
    
    if (!deletedAsset) {
      return NextResponse.json(
        { success: false, error: 'Display asset not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Display asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting display asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete display asset' },
      { status: 500 }
    );
  }
}
