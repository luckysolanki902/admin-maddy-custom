import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/db';
import DesignGroup from '../../../../../models/DesignGroup';

// Create an empty Design Group (no products yet)
// Body: { name: string, searchKeywords?: string[] }
export async function POST(request) {
  try {
    await connectToDatabase();

    const { name, searchKeywords = [] } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    if (cleanName.length > 200) {
      return NextResponse.json(
        { error: 'Group name must be 200 characters or less' },
        { status: 400 }
      );
    }

    // Normalize keywords: lowercase, trim, max 20
    const cleanKeywords = Array.isArray(searchKeywords)
      ? searchKeywords
          .filter(k => typeof k === 'string')
          .map(k => k.toLowerCase().trim())
          .filter(k => k.length > 0)
          .slice(0, 20)
      : [];

    const group = new DesignGroup({
      name: cleanName,
      searchKeywords: cleanKeywords,
      thumbnail: null,
      isActive: true,
    });

    const saved = await group.save();

    return NextResponse.json({
      success: true,
      group: {
        _id: saved._id.toString(),
        name: saved.name,
        searchKeywords: saved.searchKeywords,
        thumbnail: saved.thumbnail,
        isActive: saved.isActive,
        productCount: 0,
      }
    });
  } catch (error) {
    console.error('Error creating empty design group:', error);
    return NextResponse.json(
      { error: 'Failed to create design group' },
      { status: 500 }
    );
  }
}
