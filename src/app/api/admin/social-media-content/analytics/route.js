// /src/app/api/admin/social-media-content/analytics/route.js

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import SocialMediaContent from '@/models/admin/AdminSocialMediaContent';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const platform = searchParams.get('platform');
    const contentType = searchParams.get('contentType');
    const department = searchParams.get('department');
    
    // Build filter for date range
    await connectToDatabase();

    const dateFilter = {};
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      dateFilter.createdAt = { 
        ...dateFilter.createdAt, 
        $lte: new Date(endDate) 
      };
    }
    
    // Build additional filters
    const additionalFilters = {};
    if (platform && platform !== 'all') {
      additionalFilters.targetPlatforms = { $in: [platform] };
    }
    if (contentType && contentType !== 'all') {
      additionalFilters.contentType = contentType;
    }
    if (department && department !== 'all') {
      additionalFilters['submittedBy.department'] = department;
    }
    
    // Only include published content for analytics
    const baseFilter = { 
      status: 'Published',
      ...dateFilter,
      ...additionalFilters
    };
    
    // Aggregate analytics data
    const analyticsAggregation = await SocialMediaContent.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          totalContent: { $sum: 1 },
          totalViews: { $sum: '$analytics.views' },
          totalLikes: { $sum: '$analytics.likes' },
          totalShares: { $sum: '$analytics.shares' },
          totalComments: { $sum: '$analytics.comments' },
          avgViews: { $avg: '$analytics.views' },
          avgLikes: { $avg: '$analytics.likes' },
          avgShares: { $avg: '$analytics.shares' },
          avgComments: { $avg: '$analytics.comments' }
        }
      }
    ]);
    
    // Analytics by platform
    const platformAnalytics = await SocialMediaContent.aggregate([
      { $match: baseFilter },
      { $unwind: '$targetPlatforms' },
      {
        $group: {
          _id: '$targetPlatforms',
          count: { $sum: 1 },
          totalViews: { $sum: '$analytics.views' },
          totalLikes: { $sum: '$analytics.likes' },
          totalShares: { $sum: '$analytics.shares' },
          totalComments: { $sum: '$analytics.comments' },
          avgViews: { $avg: '$analytics.views' },
          avgEngagement: { 
            $avg: { 
              $divide: [
                { $add: ['$analytics.likes', '$analytics.shares', '$analytics.comments'] },
                { $max: ['$analytics.views', 1] }
              ]
            }
          }
        }
      },
      { $sort: { totalViews: -1 } }
    ]);
    
    // Analytics by content type
    const contentTypeAnalytics = await SocialMediaContent.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$contentType',
          count: { $sum: 1 },
          totalViews: { $sum: '$analytics.views' },
          totalLikes: { $sum: '$analytics.likes' },
          totalShares: { $sum: '$analytics.shares' },
          totalComments: { $sum: '$analytics.comments' },
          avgViews: { $avg: '$analytics.views' },
          avgEngagement: { 
            $avg: { 
              $divide: [
                { $add: ['$analytics.likes', '$analytics.shares', '$analytics.comments'] },
                { $max: ['$analytics.views', 1] }
              ]
            }
          }
        }
      },
      { $sort: { totalViews: -1 } }
    ]);
    
    // Analytics by department
    const departmentAnalytics = await SocialMediaContent.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$submittedBy.department',
          count: { $sum: 1 },
          totalViews: { $sum: '$analytics.views' },
          totalLikes: { $sum: '$analytics.likes' },
          totalShares: { $sum: '$analytics.shares' },
          totalComments: { $sum: '$analytics.comments' },
          avgViews: { $avg: '$analytics.views' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Top performing content
    const topContent = await SocialMediaContent.find(baseFilter)
      .select('title contentType targetPlatforms analytics submittedBy.name submittedBy.department publishedDate')
      .sort({ 'analytics.views': -1 })
      .limit(10)
      .lean();
    
    // Status distribution
    const statusDistribution = await SocialMediaContent.aggregate([
      { $match: { ...dateFilter, ...additionalFilters } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const summary = analyticsAggregation[0] || {
      totalContent: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      totalComments: 0,
      avgViews: 0,
      avgLikes: 0,
      avgShares: 0,
      avgComments: 0
    };
    
    // Calculate overall engagement rate
    const overallEngagementRate = summary.totalViews > 0 
      ? ((summary.totalLikes + summary.totalShares + summary.totalComments) / summary.totalViews) * 100
      : 0;
    
    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          ...summary,
          overallEngagementRate: parseFloat(overallEngagementRate.toFixed(2))
        },
        platformBreakdown: platformAnalytics,
        contentTypeBreakdown: contentTypeAnalytics,
        departmentBreakdown: departmentAnalytics,
        topPerformingContent: topContent,
        statusDistribution: statusDistribution,
        dateRange: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching aggregated analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}