import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Order from '@/models/Order';
import SpecificCategory from '@/models/SpecificCategory';
import Product from '@/models/Product';
import User from '@/models/User';
import mongoose from 'mongoose';

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
        const { 
            createdAt, items, tags, columns, loyalty, 
            page, pageSize, activeTag, start, end, applyItemFilter,
            specialFilter = 'incompletePayments' // Default to incompletePayments
        } = queryObj;

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

        // Stage 5: Apply Date Filter - Unified approach
        if (activeTag !== 'all' && start && end) {
            pipeline.push({
                $match: {
                    'mostRecentOrder.createdAt': { 
                        $gte: new Date(start),
                        $lte: new Date(end)
                    }
                }
            });
        } else if (createdAt && createdAt.$or && Array.isArray(createdAt.$or)) {
            // Backward compatibility for the old format
            const dateConditions = createdAt.$or.map(cond => ({
                'mostRecentOrder.createdAt': {
                    $gte: new Date(cond.createdAt.$gte),
                    $lte: new Date(cond.createdAt.$lte),
                }
            }));
            if (dateConditions.length > 0) {
                pipeline.push({ $match: { $or: dateConditions } });
            }
        }

        // Apply item filter
        if ((applyItemFilter && items && items.length > 0) || (items && Array.isArray(items) && items.length > 0)) {
            // Get specific categories first if names were provided
            let itemIds = items;
            
            // If items are strings and not IDs, we need to look them up
            if (items.length > 0 && typeof items[0] === 'string' && !mongoose.Types.ObjectId.isValid(items[0])) {
                const specificCategories = await SpecificCategory.find({ name: { $in: items } }).select('_id');
                itemIds = specificCategories.map(cat => cat._id);
            }

            if (itemIds.length > 0) {
                const productIds = await Product.find({ specificCategory: { $in: itemIds } }).distinct('_id');

                if (productIds.length > 0) {
                    pipeline.push({
                        $match: {
                            'userOrders.items.product': { $in: productIds }
                        }
                    });
                } else {
                    return NextResponse.json({ customers: [], totalRecords: 0 }, { status: 200 });
                }
            } else {
                return NextResponse.json({ customers: [], totalRecords: 0 }, { status: 200 });
            }
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

        // Stage 12: Apply Global Search
        if (tags) {
            const regex = new RegExp(tags, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { fullName: regex },
                        { phoneNumber: regex },
                        { city: regex },
                        { specificCategoryNames: regex },
                        { utmSource: regex },
                        { utmMedium: regex },
                        { utmCampaign: regex }
                    ]
                }
            });
        }

        // Stage 13: Project Fields
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

        // Stage 14: Pagination
        const currentPage = parseInt(page, 10) || 1;
        const currentPageSize = parseInt(pageSize, 10) || 10;
        const skip = (currentPage - 1) * currentPageSize;
        const limit = currentPageSize;

        pipeline.push({
            $facet: {
                customers: [
                    { $skip: skip },
                    { $limit: limit }
                ],
                totalRecords: [
                    { $count: 'count' }
                ]
            }
        });

        // Execute pipeline
        const results = await User.aggregate(pipeline).exec();
        const customers = results[0].customers || [];
        const totalRecordsCount = results[0].totalRecords[0] ? results[0].totalRecords[0].count : 0;

        return NextResponse.json({ customers, totalRecords: totalRecordsCount }, { status: 200 });
    } catch (error) {
        console.error('Error fetching abandoned carts user data:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}
