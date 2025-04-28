import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import SpecificCategoryVariant from "@/models/SpecificCategoryVariant";
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
    console.log("📢 Connecting to database...");
    await connectToDatabase();
    console.log("✅ Connected to database.");

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    console.log("🔍 Extracted token from query:", token);

    if (!token) {
      console.warn("⚠️ Missing token in query parameters.");
      return NextResponse.json({ message: "Missing token in query parameters." }, { status: 400 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("✅ Token verified successfully:", decoded);
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

    console.log(`📅 Date range parsed: ${start.toISOString()} → ${end.toISOString()}`);

    console.log("📦 Counting total paid orders...");
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: start, $lte: end },
      "paymentDetails.amountPaidOnline": { $gt: 0 },
    });
    console.log(`✅ Total paid orders: ${totalOrders}`);

    console.log("📦 Calculating total items sold...");
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
    console.log(`✅ Total items sold: ${totalItems}`);

    console.log("🖼️ Aggregating images data...");
    const imagesData = await Order.aggregate([
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
        $match: {
          "product.designTemplate.imageUrl": { $exists: true, $ne: "", $type: "string" },
        },
      },
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
        $group: {
          _id: {
            sku: "$product.sku",
            specificCategoryVariant: "$specificCategoryVariant.name",
            imageUrl: "$product.designTemplate.imageUrl",
          },
          count: { $sum: "$items.quantity" },
        },
      },
      { $sort: { count: -1 } },
    ]);
    console.log(`✅ Aggregated ${imagesData.length} images.`);

    console.log("🔗 Generating presigned URLs...");
    const imagesWithPresignedUrls = await Promise.all(
      imagesData.map(async item => {
        const { sku, specificCategoryVariant, imageUrl } = item._id;
        if (!imageUrl) {
          console.warn(`⚠️ No imageUrl for SKU: ${sku}`);
          return {
            sku,
            specificCategoryVariant,
            imageUrl: null,
            presignedUrl: null,
            count: item.count,
          };
        }
        try {
          const presignedUrlObj = await getPresignedUrl(
            imageUrl,
            "image/png",
            "getObject"
          );
          const presignedUrl = presignedUrlObj.presignedUrl;
          console.log(`✅ Presigned URL generated for SKU: ${sku}`);
          return {
            sku,
            specificCategoryVariant,
            imageUrl,
            presignedUrl,
            count: item.count,
          };
        } catch (error) {
          console.error(`❌ Error generating presigned URL for SKU ${sku}:`, error.message);
          return {
            sku,
            specificCategoryVariant,
            imageUrl,
            presignedUrl: null,
            count: item.count,
          };
        }
      })
    );

    console.log("🏁 Successfully prepared response.");
    return NextResponse.json({ totalOrders, totalItems, images: imagesWithPresignedUrls }, { status: 200 });

  } catch (error) {
    console.error("❌ Error in get-presigned-urls handler:", error.message, error.stack);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
