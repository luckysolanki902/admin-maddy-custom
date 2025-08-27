// /app/api/admin/manage/product/sku-search/route.js
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import SpecificCategory from '@/models/SpecificCategory';
import SpecificCategoryVariant from '@/models/SpecificCategoryVariant';
import Option from '@/models/Option';
import crypto from 'crypto';

function normalizePath(p) {
  if (!p) return '';
  if (p.startsWith('http')) return p; // full URL
  return p.startsWith('/') ? p : `/${p}`;
}

function buildEtag(products) {
  const hash = crypto.createHash('sha1');
  for (const p of products) {
    hash.update(p._id.toString());
    if (p.updatedAt) hash.update(new Date(p.updatedAt).getTime().toString());
  }
  return 'W/"' + hash.digest('base64') + '"';
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const skuQuery = searchParams.get('sku') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 30);
    const skip = (page - 1) * limit;

    // Build the SKU search filter
    let filter = {};
    if (skuQuery) {
      // Use case-insensitive partial matching for SKU
      filter = {
        sku: { $regex: skuQuery, $options: 'i' },
      };
    }

  const ifNoneMatch = req.headers.get('if-none-match');

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;

    const productsRaw = await Product.find(filter)
      .select('sku images optionsAvailable name category subCategory specificCategory specificCategoryVariant available updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('specificCategory')
      .populate('specificCategoryVariant')
      .lean();

    // Determine which products need option-based images
    const needsOptionImageIds = productsRaw
      .filter(p => p.optionsAvailable && (!p.images || p.images.length === 0))
      .map(p => p._id);

    let optionImageMap = new Map();
    if (needsOptionImageIds.length) {
      const optionDocs = await Option.find({ product: { $in: needsOptionImageIds } })
        .select('product images thumbnail')
        .lean();
      // Pick first viable image per product
      for (const opt of optionDocs) {
        if (optionImageMap.has(opt.product.toString())) continue; // already have one
        const img = (opt.images && opt.images.length ? opt.images[0] : opt.thumbnail) || '';
        if (img) optionImageMap.set(opt.product.toString(), normalizePath(img));
      }
    }

    const products = productsRaw.map(p => {
      // Normalize existing product images
      let primaryImage = '';
      if (p.images && p.images.length) {
        primaryImage = normalizePath(p.images[0]);
      } else if (optionImageMap.has(p._id.toString())) {
        primaryImage = optionImageMap.get(p._id.toString());
      }
      return {
        ...p,
        effectiveImage: primaryImage || '/images/dark-circular-logo.png',
      };
    });

    const payload = { products, total, totalPages, currentPage: page };
    const etag = buildEtag(products);
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120',
        ETag: etag,
        'Content-Type': 'application/json'
      }});
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120',
        ETag: etag,
      },
    });
  } catch (error) {
    console.error("Error in SKU search API:", error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
