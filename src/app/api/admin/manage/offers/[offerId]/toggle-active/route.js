// ./src/app/api/admin/manage/offers/[offerId]/isActive/route.js

import Offer from "@/models/Offer";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function PATCH(_req, { params }) {
  try {
    const { offerId } = await params;

    if (!ObjectId.isValid(offerId)) {
      console.warn(`PATCH validation failed: Invalid Offer ID format (${offerId}).`);
      return new Response(JSON.stringify({ error: "Invalid Offer ID format." }), { status: 400 });
    }

    await connectToDatabase();

    const offer = await Offer.findByIdAndUpdate(offerId, [{ $set: { isActive: { $not: "$isActive" } } }], { new: true }).select(
      "isActive"
    );

    return new Response(JSON.stringify(offer), { status: 201 });
  } catch (error) {
    console.error("Error in changing active state of offer:", error);
    return new Response(JSON.stringify({ error: "Failed to change active state of offer" }), { status: 500 });
  }
}
