import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product"; // ensures model is registered
import SpecificCategoryVariant from "@/models/SpecificCategoryVariant"; // ensures model is registered
import { getPresignedUrl } from "@/lib/aws";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";

const JWT_SECRET = process.env.JWT_SECRET;

export const config = {
  runtime: "nodejs",
};

export async function GET(request) {
  return handleGetPresignedUrls(request);
}

async function handleGetPresignedUrls(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      console.warn("⚠️ Missing token in query parameters.");
      return NextResponse.json({ message: "Missing token in query parameters." }, { status: 400 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("❌ Invalid or expired token:", err.message);
      return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
    }

    const { startDate, endDate } = decoded;
    if (!startDate || !endDate) {
      console.warn("⚠️ Token missing startDate or endDate.", decoded);
      return NextResponse.json({ message: "Token does not contain startDate or endDate." }, { status: 400 });
    }

    const start = dayjs(startDate).toDate();
    const end = dayjs(endDate).toDate();

    if (!dayjs(start).isValid() || !dayjs(end).isValid()) {
      console.warn("⚠️ Invalid date format parsed from token:", { startDate, endDate });
      return NextResponse.json({ message: "Invalid date format in token." }, { status: 400 });
    }

    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: start, $lte: end },
      "paymentDetails.amountPaidOnline": { $gt: 0 },
    });

    const totalItemsAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          "paymentDetails.amountPaidOnline": { $gt: 0 },
        },
      },
      { $unwind: "$items" },
      { $group: { _id: null, totalItems: { $sum: "$items.quantity" } } },
    ]);
    const totalItems = totalItemsAgg[0] ? totalItemsAgg[0].totalItems : 0;

    // Aggregate by product (sku) collecting wrap finish distribution and templates (supports new designTemplates array)
    const aggregated = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          "paymentDetails.amountPaidOnline": { $gt: 0 },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "specificcategoryvariants",
          localField: "product.specificCategoryVariant",
          foreignField: "_id",
          as: "specificCategoryVariant",
        },
      },
      { $unwind: "$specificCategoryVariant" },
      {
        $match: {
          $or: [
            { "product.designTemplate.imageUrl": { $exists: true, $ne: "" } },
            { "product.designTemplates": { $exists: true, $type: "array", $ne: [] } },
          ],
        },
      },
      {
        $addFields: {
          normalizedWrapFinish: {
            $cond: {
              if: { $and: [{ $ne: ["$items.wrapFinish", null] }, { $ne: ["$items.wrapFinish", ""] }] },
              then: "$items.wrapFinish",
              else: "Matte",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            sku: "$product.sku",
            productId: "$product._id",
            productName: "$product.name",
            specificCategoryVariant: "$specificCategoryVariant.name",
            wrapFinish: "$normalizedWrapFinish",
          },
          quantity: { $sum: "$items.quantity" },
          designTemplate: { $first: "$product.designTemplate.imageUrl" },
          designTemplates: { $first: "$product.designTemplates" },
        },
      },
      {
        $group: {
          _id: {
            sku: "$_id.sku",
            productName: "$_id.productName",
            specificCategoryVariant: "$_id.specificCategoryVariant",
          },
          wrapFinishes: {
            $push: { k: "$_id.wrapFinish", v: "$quantity" },
          },
          totalCount: { $sum: "$quantity" },
          designTemplate: { $first: "$designTemplate" },
          designTemplates: { $first: "$designTemplates" },
        },
      },
      {
        $addFields: {
          wrapFinish: { $arrayToObject: "$wrapFinishes" },
        },
      },
      { $sort: { totalCount: -1 } },
    ]);

    // Build final structure with presigned URLs for each template (only used for downloading, table will use CloudFront)
    const images = await Promise.all(
      aggregated.map(async doc => {
        const sku = doc._id.sku;
        const productName = doc._id.productName || "";
        const specificCategoryVariant = doc._id.specificCategoryVariant;
        const wrapFinish = doc.wrapFinish || {};

        // Determine templates list (prefer new designTemplates array)
        let templatePaths = Array.isArray(doc.designTemplates) && doc.designTemplates.length > 0
          ? doc.designTemplates.filter(Boolean)
          : (doc.designTemplate ? [doc.designTemplate] : []);

        // Ensure uniqueness and cleanliness
        templatePaths = [...new Set(templatePaths.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean))];

        // Generate presigned URLs (only for first two templates if more, as per UI requirement)
        const templates = await Promise.all(
          templatePaths.slice(0, 2).map(async (path, idx) => {
            try {
              const { presignedUrl } = await getPresignedUrl(path, "image/png", "getObject");
              return {
                path,
                presignedUrl,
                letter: idx === 0 ? 'a' : 'b',
              };
            } catch (e) {
              console.error(`Failed presigned URL for template ${path} (SKU ${sku})`, e.message);
              return { path, presignedUrl: null, letter: idx === 0 ? 'a' : 'b' };
            }
          })
        );

        return {
          sku,
          productName,
          specificCategoryVariant,
            // number of orders (items quantity) for this sku
          count: doc.totalCount,
          wrapFinish,
          templateCount: templatePaths.length,
          templates, // up to two template entries with presignedUrl (for download) and path
          extraTemplatesHidden: templatePaths.length > 2 ? templatePaths.length - 2 : 0,
        };
      })
    );

    return NextResponse.json({ totalOrders, totalItems, images }, { status: 200 });
  } catch (error) {
    console.error("❌ Error in get-presigned-urls handler:", error.message, error.stack);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
