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

        // Match Stage for Payment Status, Date, and Items Filters
        const matchStage = {};

        // Payment Status is always 'successful'
        matchStage.paymentStatus = { $in: ['allPaid', 'paidPartially'] };

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
                // Fetch product IDs associated with these categories
                const productIds = await Product.find({ specificCategory: { $in: specificCategoryIds } }).distinct('_id');

                if (productIds.length > 0) {
                    matchStage['items.product'] = { $in: productIds };
                } else {
                    // If no products match, the pipeline should return no results
                    return NextResponse.json({ message: 'No matching products found for the specified items.' }, { status: 404 });
                }
            } else {
                // If no specific categories match, the pipeline should return no results
                return NextResponse.json({ message: 'No matching specific categories found for the specified items.' }, { status: 404 });
            }
        }

        // Push the match stage if any filters are applied
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        // Lookup to join with User collection
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
            }
        });

        pipeline.push({
            $unwind: '$user'
        });

        // Unwind items to calculate itemPurchaseCounts correctly
        pipeline.push({
            $unwind: '$items'
        });

        // Group by User to compute loyalty metrics
        const groupStage = {
            _id: '$user._id',
            fullName: { $first: '$user.name' },
            phoneNumber: { $first: '$user.phoneNumber' },
            city: { $first: { $ifNull: ['$user.addresses.0.city', ''] } },
            tags: { $first: { $ifNull: ['$tags', 'default'] } },
            purchaseCount: { $sum: 1 },
            totalAmountSpent: { $sum: '$totalAmount' },
            itemPurchaseCounts: { $sum: '$items.quantity' },
            utmSource: { $first: '$utmDetails.source' },
            utmMedium: { $first: '$utmDetails.medium' },
            utmCampaign: { $first: '$utmDetails.campaign' },
            specificCategoryIds: { $addToSet: '$items.product' }, // Will be transformed later
        };


        pipeline.push({
            $group: groupStage
        });

        // Apply Loyalty Filters in the aggregation pipeline
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

        // Lookup Specific Categories based on product IDs
        pipeline.push({
            $lookup: {
                from: 'specificcategories',
                localField: 'specificCategoryIds',
                foreignField: '_id',
                as: 'specificCategories',
            }
        });

        // Add Specific Category Names as comma-separated string
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

        // Project the required fields based on selected columns
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

        // If Tags are provided, filter by tags
        if (tags) {
            // Determine if 'tags' is an array or a string in the database
            // Assuming 'tags' is stored as a string; if it's an array, use $in
            pipeline.push({
                $match: {
                    tags: { $regex: new RegExp(`\\b${tags}\\b`, 'i') } // Case-insensitive exact match within string
                    // If tags are stored as an array, use: tags: tags
                }
            });
        }

        // Execute the aggregation pipeline
        const customers = await Order.aggregate(pipeline).exec();

        // Handle no matching customers
        if (!customers.length) {
            return NextResponse.json({ message: 'No matching customers found.' }, { status: 404 });
        }

        // Convert data to CSV format
        const fields = Object.keys(customers[0]);
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(customers);

        // Set response headers for CSV download
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=customers_data.csv',
            },
        });
    } catch (error) {
        console.error('Error generating CSV:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
