// /app/api/admin/download/download-abandoned-carts-user/route.js

import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import SpecificCategory from '@/models/SpecificCategory';
import Product from '@/models/Product';
import User from '@/models/User';

// Ensure database connection
await connectToDatabase();

export async function GET(req) {
    try {
        // Parse query parameters from the request URL
        const { searchParams } = new URL(req.url);
        const queryParam = searchParams.get('query');

        if (!queryParam) {
            return NextResponse.json({ message: 'No query parameters provided.' }, { status: 400 });
        }

        const queryObj = JSON.parse(queryParam);
        const { createdAt, items, tags, columns, loyalty } = queryObj;

        // Initialize the base aggregation pipeline
        const pipeline = [];

        // Stage 1: Start with the User collection
        pipeline.push({
            $lookup: {
                from: 'orders',
                localField: '_id',
                foreignField: 'user',
                as: 'userOrders',
            }
        });

        // Stage 2: Add fields to count successful and total orders
        pipeline.push({
            $addFields: {
                totalOrders: { $size: '$userOrders' },
                successfulOrders: {
                    $size: {
                        $filter: {
                            input: '$userOrders',
                            as: 'order',
                            cond: { $in: ['$$order.paymentStatus', ['paidPartially', 'allPaid', 'allToBePaidCod']] }
                        }
                    }
                },
            }
        });

        // Stage 3: Match users with at least one order and no successful orders
        pipeline.push({
            $match: {
                totalOrders: { $gte: 1 },
                successfulOrders: { $eq: 0 },
            }
        });

        // Stage 4: Apply Date and Items Filters
        const matchStage = {};

        // Date Filter
        if (createdAt) {
            if (createdAt.$or && Array.isArray(createdAt.$or)) {
                matchStage.$or = createdAt.$or.map(cond => ({
                    createdAt: {
                        $gte: new Date(cond.createdAt.$gte),
                        $lte: new Date(cond.createdAt.$lte),
                    }
                }));
            }
        }

        // Items Filter
        if (items && Array.isArray(items) && items.length > 0) {
            // Fetch specific category IDs based on item names
            const specificCategories = await SpecificCategory.find({ name: { $in: items } }).select('_id');
            const specificCategoryIds = specificCategories.map(cat => cat._id);

            if (specificCategoryIds.length > 0) {
                // Fetch product IDs associated with these specific categories
                const productIds = await Product.find({ specificCategory: { $in: specificCategoryIds } }).distinct('_id');

                if (productIds.length > 0) {
                    matchStage['userOrders.items.product'] = { $in: productIds };
                } else {
                    // If no products match, the pipeline should return no results
                    return NextResponse.json({ message: 'No matching products found for the specified items.' }, { status: 404 });
                }
            } else {
                // If no specific categories match, the pipeline should return no results
                return NextResponse.json({ message: 'No matching specific categories found for the specified items.' }, { status: 404 });
            }
        }

        // Push the match stage if any additional filters are applied
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // Stage 5: Unwind userOrders to process items
        pipeline.push({ $unwind: '$userOrders' });

        // Stage 6: Unwind items within userOrders
        pipeline.push({ $unwind: '$userOrders.items' });

        // Stage 7: Lookup to join with Product collection to get specificCategory
        pipeline.push({
            $lookup: {
                from: 'products',
                localField: 'userOrders.items.product',
                foreignField: '_id',
                as: 'userOrders.items.product_details',
            }
        });

        // Stage 8: Unwind product_details
        pipeline.push({ $unwind: '$userOrders.items.product_details' });

        // Stage 9: Group by User to compute fields
        const groupStage = {
            _id: '$_id',
            fullName: { $first: '$name' },
            phoneNumber: { $first: '$phoneNumber' },
            city: { $first: { $ifNull: ['$addresses.0.city', ''] } },
            tags: { $first: { $ifNull: ['$tags', 'default'] } },
            purchaseCount: { $sum: 1 }, // Number of abandoned orders
            totalAmountSpent: { $sum: '$userOrders.totalAmount' }, // Assuming 'totalAmount' exists in Order schema
            itemPurchaseCounts: { $sum: '$userOrders.items.quantity' }, // Total items purchased in abandoned orders
            utmSource: { $first: '$userOrders.utmDetails.source' }, // Assuming 'utmDetails' exists in Order schema
            utmMedium: { $first: '$userOrders.utmDetails.medium' },
            utmCampaign: { $first: '$userOrders.utmDetails.campaign' },
            specificCategoryIds: { $addToSet: '$userOrders.items.product_details.specificCategory' },
        };

        pipeline.push({
            $group: groupStage
        });

        // Stage 10: Apply Loyalty Filters
        const havingConditions = [];
        if (loyalty) {
            if (loyalty.minAmountSpent) {
                havingConditions.push({ totalAmountSpent: { $gte: loyalty.minAmountSpent } });
            }
            if (loyalty.minNumberOfOrders) {
                havingConditions.push({ purchaseCount: { $gte: loyalty.minNumberOfOrders } });
            }
            if (loyalty.minItemsCount) {
                havingConditions.push({ itemPurchaseCounts: { $gte: loyalty.minItemsCount } });
            }
        }

        if (havingConditions.length > 0) {
            pipeline.push({
                $match: {
                    $and: havingConditions
                }
            });
        }

        // Stage 11: Lookup Specific Categories based on specificCategoryIds
        pipeline.push({
            $lookup: {
                from: 'specificcategories',
                localField: 'specificCategoryIds',
                foreignField: '_id',
                as: 'specificCategories',
            }
        });

        // Stage 12: Add Specific Category Names as comma-separated string
        pipeline.push({
            $addFields: {
                specificCategoryNames: {
                    $reduce: {
                        input: '$specificCategories.name',
                        initialValue: '',
                        in: {
                            $cond: [
                                { $eq: ['$$value', ''] },
                                '$$this',
                                { $concat: ['$$value', ', ', '$$this'] }
                            ]
                        }
                    }
                }
            }
        });

        // Stage 13: Project the required fields based on selected columns
        const projectStage = {};
        if (columns && Array.isArray(columns) && columns.length > 0) {
            columns.forEach(col => {
                switch (col) {
                    case 'fullName':
                        projectStage['Full Name'] = '$fullName';
                        break;
                    case 'firstName':
                        projectStage['First Name'] = {
                            $arrayElemAt: [{ $split: ['$fullName', ' '] }, 0]
                        };
                        break;
                    case 'lastName':
                        projectStage['Last Name'] = {
                            $arrayElemAt: [
                                { $split: ['$fullName', ' '] },
                                { $subtract: [{ $size: { $split: ['$fullName', ' '] } }, 1] }
                            ]
                        };
                        break;
                    case 'city':
                        projectStage['City'] = '$city';
                        break;
                    case 'phoneNumber':
                        projectStage['Phone Number'] = { $concat: ['91', '$phoneNumber'] };
                        break;
                    case 'purchaseCount':
                        projectStage['Purchase Count'] = '$purchaseCount';
                        break;
                    case 'itemPurchaseCounts':
                        projectStage['Item Purchase Counts'] = '$itemPurchaseCounts';
                        break;
                    case 'totalAmountSpent':
                        projectStage['Total Amount Spent'] = '$totalAmountSpent';
                        break;
                    case 'utmSource':
                        projectStage['UTM Source'] = '$utmSource';
                        break;
                    case 'utmMedium':
                        projectStage['UTM Medium'] = '$utmMedium';
                        break;
                    case 'utmCampaign':
                        projectStage['UTM Campaign'] = '$utmCampaign';
                        break;
                    case 'specificCategory':
                        projectStage['Specific Category'] = '$specificCategoryNames';
                        break;
                    case 'orderCount':
                        // Not applicable here as all orders are abandoned (no successful orders)
                        break;
                    default:
                        break;
                }
            });
        } else {
            // Default columns if none selected
            projectStage['Full Name'] = '$fullName';
            projectStage['Phone Number'] = { $concat: ['91', '$phoneNumber'] };
        }

        pipeline.push({
            $project: projectStage
        });

        // Stage 14: If Tags are provided, filter by tags
        if (tags) {
            // Assuming tags are in 'extraFields.tags' as a string, comma-separated or space-separated
            // Adjust the regex accordingly. Here, using word boundaries
            pipeline.push({
                $match: {
                    tags: { $regex: new RegExp(`\\b${tags}\\b`, 'i') } // Case-insensitive exact match within string
                }
            });
        }

        // Stage 15: Execute the aggregation pipeline
        const customers = await User.aggregate(pipeline).exec();

        // Handle no matching customers
        if (!customers.length) {
            return NextResponse.json({ message: 'No matching abandoned carts users found.' }, { status: 404 });
        }

        // Convert data to CSV format
        const fields = Object.keys(customers[0]);
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(customers);

        // Set response headers for CSV download
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=abandoned_carts_users.csv',
            },
        });
    } catch (error) {
        console.error('Error generating CSV for abandoned carts users:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
