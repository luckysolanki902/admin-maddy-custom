// src/app/api/admin/manage/coupons/[id]/route.js

import Coupon from '@/models/Coupon';
import { connectToDatabase } from "@/lib/db";
import { ObjectId } from 'mongodb';

// Handle PUT and DELETE requests for a specific coupon
export async function PUT(request, { params }) {
    const { id } = await params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
        console.warn(`PUT validation failed: Invalid coupon ID format (${id}).`);
        return new Response(JSON.stringify({ error: 'Invalid coupon ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();

        const data = await request.json();

        // Remove '_id' from updateFields if present
        if ('_id' in data) {
            delete data._id;
        }

        // Ensure code is uppercase if provided
        if (data.code) {
            data.code = data.code.toUpperCase();
        }

        // Validate discountType if provided
        if (data.discountType) {
            if (!['fixed', 'percentage'].includes(data.discountType)) {
                console.warn(`PUT validation failed: Invalid discount type (${data.discountType}).`);
                return new Response(JSON.stringify({ error: 'Invalid discount type.' }), { status: 400 });
            }
        }

        // Parse and validate dates if provided
        if (data.validFrom) {
            const parsedValidFrom = new Date(data.validFrom);
            if (isNaN(parsedValidFrom.getTime())) {
                console.warn(`PUT validation failed: Invalid validFrom date format (${data.validFrom}).`);
                return new Response(JSON.stringify({ error: 'Invalid validFrom date format.' }), { status: 400 });
            }
            data.validFrom = parsedValidFrom;
        }
        if (data.validUntil) {
            const parsedValidUntil = new Date(data.validUntil);
            if (isNaN(parsedValidUntil.getTime())) {
                console.warn(`PUT validation failed: Invalid validUntil date format (${data.validUntil}).`);
                return new Response(JSON.stringify({ error: 'Invalid validUntil date format.' }), { status: 400 });
            }
            data.validUntil = parsedValidUntil;
        }

        // Manual Validation: Ensure validUntil > validFrom if both are provided
        if (data.validFrom && data.validUntil) {
            if (data.validUntil <= data.validFrom) {
                console.warn('PUT validation failed: validUntil is not after validFrom.');
                return new Response(JSON.stringify({ error: 'Valid Until date must be after Valid From date.' }), { status: 400 });
            }
        }

        // Perform the update using findByIdAndUpdate
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!updatedCoupon) {
            console.warn(`PUT validation failed: Coupon not found (${id}).`);
            return new Response(JSON.stringify({ error: 'Coupon not found.' }), { status: 404 });
        }


        return new Response(JSON.stringify(updatedCoupon), { status: 200 });
    } catch (error) {
        console.error('Error updating coupon:', error);
        let errorMessage = 'Failed to update coupon.';
        if (error.code === 11000) { // Duplicate key error
            errorMessage = 'Coupon code must be unique.';
        } else if (error.name === 'ValidationError') {
            // Aggregate validation error messages
            const messages = Object.values(error.errors).map(err => err.message);
            errorMessage = messages.join(' ');
        }
        return new Response(JSON.stringify({ error: errorMessage, details: error.errors || error.message }), { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const { id } = await params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
        console.warn(`DELETE validation failed: Invalid coupon ID format (${id}).`);
        return new Response(JSON.stringify({ error: 'Invalid coupon ID format.' }), { status: 400 });
    }

    try {
        await connectToDatabase();
        const deletedCoupon = await Coupon.findByIdAndDelete(id);

        if (!deletedCoupon) {
            console.warn(`DELETE validation failed: Coupon not found (${id}).`);
            return new Response(JSON.stringify({ error: 'Coupon not found.' }), { status: 404 });
        }


        return new Response(JSON.stringify(deletedCoupon), { status: 200 });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete coupon.' }), { status: 500 });
    }
}

