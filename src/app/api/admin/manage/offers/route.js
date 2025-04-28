// ./src/app/api/admin/manage/offers/route.js

import Offer from "@/models/Offer";
import { connectToDatabase } from "@/lib/db";

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

    // Validation Logic

    // Create new offer
    const newOffer = await Offer.create({
      name: name.trim(),
      description: description.trim(),
      conditionMessage,
      showAsCard,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      couponCodes,
      autoApply,
      conditions: conditions.map(({ type, value }) => ({
        type,
        value: Number(value),
        operator: type === "first_order" ? "==" : ">=",
      })),
      actions: actions.map(({ type, discountValue }) => ({
        type,
        discountValue: Number(discountValue),
      })),
      discountCap: Number(discountCap || "Infinity"),
    });

    return new Response(JSON.stringify(newOffer), { status: 201 });
  } catch (error) {
    console.error("Error creating offer:", error);
    return new Response(JSON.stringify({ error: "Failed to create offer" }), { status: 500 });
  }
}
