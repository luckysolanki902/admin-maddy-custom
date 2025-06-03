// ./src/app/api/admin/manage/offers/route.js

import Offer from "@/models/Offer";
import { connectToDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();
    const coupons = await Offer.find().lean();
    return new Response(JSON.stringify(coupons), { status: 200 });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch offers" }), { status: 500 });
  }
}


export async function POST(req) {
  try {
    await connectToDatabase();

    const {
      name,
      description,
      showAsCard,
      validFrom,
      validUntil,
      couponCodes,
      autoApply,
      conditions,
      conditionMessage,
      actions,
      discountCap,
    } = await req.json();

    // Ensure dates are properly converted
    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);

    // Validate dates
    if (isNaN(validFromDate.getTime())) {
      return NextResponse.json({ message: "Invalid validFrom date" }, { status: 400 });
    }
    
    if (isNaN(validUntilDate.getTime())) {
      return NextResponse.json({ message: "Invalid validUntil date" }, { status: 400 });
    }

    if (validUntilDate <= validFromDate) {
      return NextResponse.json({ message: "validUntil must be after validFrom" }, { status: 400 });
    }

    // Create new offer
    const newOffer = await Offer.create({
      name,
      description: description.trim(),
      conditionMessage,
      showAsCard,
      validFrom: validFromDate,
      validUntil: validUntilDate,
      couponCodes,
      autoApply,
      conditions:
        actions[0].type === "bundle"
          ? []
          : conditions.map(({ type, value }) => ({
              type,
              value: Number(value),
              operator: type === "first_order" ? "==" : ">=",
            })),
      actions: actions.map(({ type, discountValue, bundlePrice, bundleComponents }) =>
        type === "bundle"
          ? {
              type,
              bundlePrice: Number(bundlePrice),
              bundleComponents: bundleComponents.map(({ scope, scopeValue, quantity }) => ({
                scope,
                scopeValue,
                quantity: Number(quantity),
              })),
            }
          : { type, discountValue: Number(discountValue) }
      ),
      discountCap: Number(discountCap || "Infinity"),
    });

    return NextResponse.json(newOffer.toObject(), { status: 201 });
  } catch (err) {
    console.error("Error creating offer:", err);
    return NextResponse.json({ message: err?.message ?? "Failed to create offer" }, { status: 500 });
  }
}
