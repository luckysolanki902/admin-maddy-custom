// ./src/app/api/admin/manage/offers/[offerId]/route.js

import Offer from "@/models/Offer";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function PATCH(req, { params }) {
  try {
    const { offerId } = await params;

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

    if (!ObjectId.isValid(offerId)) {
      console.warn(`PATCH validation failed: Invalid Offer ID format (${offerId}).`);
      return new Response(JSON.stringify({ error: "Invalid Offer ID format." }), { status: 400 });
    }

    await connectToDatabase();

    const offer = await Offer.findByIdAndUpdate(
      offerId,
      {
        $set: {
          ...(actions[0].type !== "bundle" ? { name } : {}),
          description: description.trim(),
          showAsCard,
          autoApply,
          validFrom: new Date(validFrom),
          validUntil: new Date(validUntil),
          conditionMessage,
          discountCap,
          conditions:
            actions[0].type === "bundle"
              ? []
              : conditions.map(c => ({
                  type: c.type,
                  value: Number(c.value),
                  operator: c.type === "first_order" ? "==" : ">=",
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
        },
        $push: {
          couponCodes: { $each: couponCodes },
        },
      },
      { new: true }
    );

    return NextResponse.json(offer, { status: 201 });
  } catch (err) {
    if (err.code === 11000 && err?.keyPattern?.name) {
      return NextResponse.json({ message: "Offer name must be unique. Please choose a different name." }, { status: 400 });
    } else {
      console.error("Error in patch offer route:", err);
      return NextResponse.json({ message: err?.message ?? "Failed to edit offer" }, { status: 500 });
    }
  }
}
