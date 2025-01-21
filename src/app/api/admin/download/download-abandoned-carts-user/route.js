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
        const { searchParams } = new URL(req.url);
        const queryParam = searchParams.get('query');

        if (!queryParam) {
            return NextResponse.json({ message: 'No query parameters provided.' }, { status: 400 });
        }

        const queryObj = JSON.parse(queryParam);
        const { createdAt, items, tags, columns, loyalty, page, pageSize } = queryObj;

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

        // Stage 2: Add field to identify the most recent order for each user
        pipeline.push({
            $addFields: {
                mostRecentOrder: {
                    $arrayElemAt: [
                        { $sortArray: { input: '$userOrders', sortBy: { createdAt: -1 } } },
                        0,
                    ],
                }
            }
        });

        // Stage 3: Match users whose most recent order is not successful
        pipeline.push({
            $match: {
                'mostRecentOrder.paymentStatus': {
                    $in: ['failed', 'pending', 'cancelled']
                },
            }
        });

        // Stage 4: Add fields to count total orders
        pipeline.push({
            $addFields: {
                orderCount: {
                    $size: {
                        $filter: {
                            input: '$userOrders',
                            as: 'order',
                            cond: {
                                $in: ['$$order.paymentStatus', ['paidPartially', 'allPaid', 'allToBePaidCod']],
                            },
                        },
                    },
                },
            },
        });

        // Stage 5: Apply Date and Items Filters
        const matchStage = {};

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

        if (items && Array.isArray(items) && items.length > 0) {
            const specificCategories = await SpecificCategory.find({ name: { $in: items } }).select('_id');
            const specificCategoryIds = specificCategories.map(cat => cat._id);

            if (specificCategoryIds.length > 0) {
                const productIds = await Product.find({ specificCategory: { $in: specificCategoryIds } }).distinct('_id');

                if (productIds.length > 0) {
                    matchStage['userOrders.items.product'] = { $in: productIds };
                } else {
                    return NextResponse.json({ customers: [], totalRecords: 0 }, { status: 200 });
                }
            } else {
                return NextResponse.json({ customers: [], totalRecords: 0 }, { status: 200 });
            }
        }

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // Stage 6: Unwind userOrders and items
        pipeline.push({ $unwind: '$userOrders' });
        pipeline.push({ $unwind: '$userOrders.items' });

        // Stage 7: Lookup product details
        pipeline.push({
            $lookup: {
                from: 'products',
                localField: 'userOrders.items.product',
                foreignField: '_id',
                as: 'userOrders.items.product_details',
            }
        });
        pipeline.push({ $unwind: '$userOrders.items.product_details' });

        // Stage 8: Group by User
        pipeline.push({
            $group: {
                _id: '$_id',
                fullName: { $first: '$name' },
                phoneNumber: { $first: '$phoneNumber' },
                city: { $first: { $ifNull: ['$addresses.city', ''] } },
                tags: { $first: { $ifNull: ['$tags', 'default'] } },
                orderCount: { $first: '$orderCount' },
                totalAmountSpent: { $sum: '$userOrders.totalAmount' },
                itemPurchaseCounts: { $sum: '$userOrders.items.quantity' },
                utmSource: { $first: '$userOrders.utmDetails.source' },
                utmMedium: { $first: '$userOrders.utmDetails.medium' },
                utmCampaign: { $first: '$userOrders.utmDetails.campaign' },
                specificCategoryIds: { $addToSet: '$userOrders.items.product_details.specificCategory' },
            }
        });

        // Stage 9: Apply Loyalty Filters
        const havingConditions = [];
        if (loyalty) {
            if (loyalty.minAmountSpent) {
                havingConditions.push({ totalAmountSpent: { $gte: loyalty.minAmountSpent } });
            }
            if (loyalty.minNumberOfOrders) {
                havingConditions.push({ orderCount: { $gte: loyalty.minNumberOfOrders } });
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

        // Stage 10: Lookup Specific Categories
        pipeline.push({
            $lookup: {
                from: 'specificcategories',
                localField: 'specificCategoryIds',
                foreignField: '_id',
                as: 'specificCategories',
            }
        });

        // Stage 11: Add Specific Category Names
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

        // Stage 12: Project Fields
        const projectStage = {};
        if (columns && Array.isArray(columns) && columns.length > 0) {
            columns.forEach(col => {
                switch (col) {
                    case 'fullName':
                        projectStage['Full Name'] = '$fullName';
                        break;
                    case 'firstName':
                        projectStage['First Name'] = { $arrayElemAt: [{ $split: ['$fullName', ' '] }, 0] };
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
                    case 'orderCount':
                        projectStage['Order Count'] = '$orderCount';
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
                    default:
                        break;
                }
            });
        } else {
            projectStage['Full Name'] = '$fullName';
            projectStage['Phone Number'] = { $concat: ['91', '$phoneNumber'] };
        }

        pipeline.push({ $project: projectStage });

        // Stage 13: Filter by Tags
        if (tags) {
            pipeline.push({
                $match: {
                    tags: { $regex: new RegExp(`\\b${tags}\\b`, 'i') }
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
