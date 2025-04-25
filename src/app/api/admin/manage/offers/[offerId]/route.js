// ./src/app/api/admin/manage/offers/[offerId]/route.js

import Offer from "@/models/Offer";
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

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
      [
        {
          $set: {
            name: name.trim(),
            description: description.trim(),
            showAsCard,
            autoApply,
            validFrom,
            validUntil,
            conditionMessage,
            discountCap,
            conditions: {
              $map: {
                input: conditions,
                as: "c",
                in: {
                  type: "$$c.type",
                  value: { $toDouble: "$$c.value" },
                  operator: {
                    $cond: [{ $eq: ["$$c.type", "first_order"] }, "==", ">="],
                  },
                },
              },
            },
            actions: {
              $map: {
                input: actions,
                as: "a",
                in: {
                  type: "$$a.type",
                  discountValue: { $toDouble: "$$a.discountValue" },
                },
              },
            },
            couponCodes: {
              $concatArrays: ["$couponCodes", couponCodes],
            },
          },
        },
      ],
      { new: true }
    );

    return new Response(JSON.stringify(offer), { status: 201 });
  } catch (error) {
    console.error("Error in changing active state of offer:", error);
    return new Response(JSON.stringify({ error: "Failed to change active state of offer" }), { status: 500 });
  }
}
