import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import SpecificCategoryVariant from "@/models/SpecificCategoryVariant";
import { getPresignedUrl } from "@/lib/aws";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { Promise } from "mongoose";

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
      return NextResponse.json({ message: "Missing token in query parameters." }, { status: 400 });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("Invalid or expired token:", err);
      return NextResponse.json({ message: "Invalid or expired token." }, { status: 401 });
    }

    const { startDate, endDate } = decoded;
    if (!startDate || !endDate) {
      return NextResponse.json({ message: "Token does not contain startDate or endDate." }, { status: 400 });
    }

    const start = dayjs(startDate).toDate();
    const end = dayjs(endDate).toDate();

    if (!dayjs(start).isValid() || !dayjs(end).isValid()) {
      return NextResponse.json({ message: "Invalid date format in token." }, { status: 400 });
    }

    // Get total orders (only paid orders)
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: start, $lte: end },
      "paymentDetails.amountPaidOnline": { $gt: 0 },
    });

    // Get total items across orders
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

    // Aggregate imagesData (only include items with designTemplate.imageUrl set)
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
      // Filter to include only products with designTemplate.imageUrl set and non-empty
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

    // Generate presigned URLs for each image where applicable
    const imagesWithPresignedUrls = await Promise.all(
      imagesData.map(async item => {
        const { sku, specificCategoryVariant, imageUrl } = item._id;
        if (!imageUrl) {
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
            "image/png", // Adjust MIME type if necessary
            "getObject"
          );
          const presignedUrl = presignedUrlObj.presignedUrl;
          return {
            sku,
            specificCategoryVariant,
            imageUrl,
            presignedUrl,
            count: item.count,
          };
        } catch (error) {
          console.error(`Error generating presigned URL for SKU ${sku}:`, error);
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

    return NextResponse.json({ totalOrders, totalItems, images: imagesWithPresignedUrls }, { status: 200 });
  } catch (error) {
    console.error("Error in get-presigned-urls:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
