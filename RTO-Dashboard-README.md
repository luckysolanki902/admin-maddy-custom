# RTO Dashboard System

A comprehensive Return to Origin (RTO) management and analytics system for e-commerce order tracking and analysis.

## 🚀 Features

### 📊 Main Dashboard (`/admin/rto/dashboard`)
- **Real-time RTO Metrics**: Total RTOs, RTO Rate, Lost Revenue, Average RTO Value
- **Interactive Charts**: RTO trends, reason distribution, state-wise analysis
- **Advanced Filtering**: By date range, state, RTO reason, search functionality
- **Order Management**: Detailed RTO order listing with status tracking
- **Export Functionality**: CSV export for detailed analysis
- **Email Reports**: Automated daily/weekly reports

### 📈 Advanced Analytics (`/admin/rto/analytics`)
- **Daily Trend Analysis**: RTO patterns over time
- **Value Range Analysis**: RTOs by order value segments
- **Traffic Source Analysis**: RTOs by UTM source/medium
- **Payment Method Analysis**: RTO patterns by payment type
- **Hourly/Daily Patterns**: Time-based RTO analysis
- **High-Risk Pattern Detection**: Automated risk identification
- **Recovery Analytics**: Tracking recovered RTO orders

### 🔄 Automated Features
- **Shiprocket Sync**: Automatic status updates from Shiprocket API
- **Daily Email Reports**: Sent to sg.gupta2241@gmail.com at 9 AM daily
- **Weekly Summary**: Comprehensive weekly RTO analysis
- **Risk Pattern Detection**: Automated identification of high-risk order patterns
- **Recovery Tracking**: Monitor orders that were initially RTO but later delivered

## 🛠️ Technical Implementation

### Database Schema Extensions
```javascript
// Order Model Extensions
rtoReason: {
  type: String,
  enum: [
    'Customer Refused',
    'Customer Not Available', 
    'Incorrect Address',
    'Address Issue',
    'Customer Not Reachable',
    'Out of Delivery Area',
    'Customer Return',
    'Order Cancelled',
    'Lost in Transit',
    'Delivery Failed',
    'Damaged in Transit',
    'Quality Issues',
    'Wrong Product',
    'Unknown'
  ]
}
```

### API Endpoints

#### Core APIs
- `GET /api/admin/rto/dashboard` - Main dashboard data
- `GET /api/admin/rto/analytics` - Advanced analytics
- `POST /api/admin/rto/refresh` - Sync with Shiprocket
- `POST /api/admin/rto/send-report` - Send email reports
- `GET /api/admin/rto/export` - Export RTO data

#### Cron Jobs
- `GET /api/cron/daily-rto-report` - Daily automated reports
- `GET /api/cron/weekly-rto-report` - Weekly automated reports

### Automated Email Reports

#### Daily Report Features
- Key metrics summary
- RTO trend comparison
- Top RTO reasons
- State-wise breakdown
- Actionable recommendations

#### Report Schedule
- **Daily**: 9:00 AM (Monday-Sunday)
- **Weekly**: 9:00 AM (Mondays)
- **Manual**: On-demand via dashboard

### Vercel Configuration
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-rto-report",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/weekly-rto-report", 
      "schedule": "0 9 * * 1"
    }
  ]
}
```

## 📋 Environment Variables

Add these to your `.env.local` and Vercel environment:

```bash
# Email Configuration (already configured)
EMAIL_FROM=your-email@domain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Shiprocket Configuration (already configured)
SHIPROCKET_EMAIL=your-shiprocket@email.com
SHIPROCKET_PASSWORD=your-shiprocket-password

# Cron Security
CRON_SECRET=your-secure-random-string

# App URL
NEXTAUTH_URL=https://your-domain.vercel.app
```

## 🎯 Key Metrics Tracked

### Primary Metrics
- **Total RTOs**: Count of returned orders
- **RTO Rate**: Percentage of orders that become RTOs
- **Lost Revenue**: Total value of RTO orders
- **Average RTO Value**: Mean value per RTO order

### Advanced Analytics
- **Daily/Hourly Patterns**: Time-based RTO trends
- **Geographic Analysis**: State-wise RTO distribution
- **Source Analysis**: RTOs by traffic source (UTM)
- **Payment Analysis**: RTOs by payment method
- **Risk Patterns**: High-risk order combinations
- **Recovery Rate**: Successfully delivered after initial RTO

## 🔍 RTO Reason Classification

The system automatically categorizes RTOs based on delivery status and Shiprocket data:

### Customer-Related
- Customer Refused
- Customer Not Available
- Customer Not Reachable

### Address-Related  
- Incorrect Address
- Address Issue
- Out of Delivery Area

### Logistics-Related
- Lost in Transit
- Delivery Failed
- Damaged in Transit

### Business-Related
- Order Cancelled
- Quality Issues
- Wrong Product

## 📊 Dashboard Features

### Visual Components
- **Line Charts**: RTO trend over time
- **Bar Charts**: Value range and hourly analysis
- **Doughnut Charts**: RTO reasons and day-of-week patterns
- **Data Tables**: Detailed order listings and analytics
- **KPI Cards**: Key metric highlights

### Interactive Features
- **Date Range Selection**: Custom period analysis
- **Real-time Filtering**: Search, state, reason filters
- **Export Options**: CSV download for external analysis
- **Drill-down Capability**: Order-level detail views

## 🚨 Risk Management Features

### High-Risk Pattern Detection
Automatically identifies order patterns with ≥20% RTO rate:
- State + UTM Source + Items Count combinations
- Minimum 5 orders threshold
- Risk level classification (Low/Medium/High/Critical)

### Alerts and Notifications
- Daily email reports with trend analysis
- High RTO rate alerts
- Recovery opportunity identification
- Actionable recommendations

## 🔧 Setup Instructions

1. **Install Dependencies**: Chart.js packages should be installed
   ```bash
   npm install chart.js react-chartjs-2
   ```

2. **Configure Environment Variables**: Add required env vars to Vercel

3. **Set up Cron Jobs**: Deploy with vercel.json configuration

4. **Test Email Setup**: Verify nodemailer configuration

5. **Initialize RTO Reasons**: Run initial data sync to populate RTO reasons

## 📈 Performance Optimizations

- **Database Indexing**: Optimized queries for large datasets
- **Caching**: Redis caching for frequently accessed analytics
- **Pagination**: Efficient data loading for large order lists
- **Aggregation Pipelines**: MongoDB aggregation for complex analytics

## 🔮 Future Enhancements

- **Machine Learning**: Predictive RTO risk scoring
- **Real-time Alerts**: Instant notifications for critical RTO rates
- **Integration APIs**: Connect with multiple logistics partners
- **Mobile App**: Dedicated mobile interface for RTO management
- **Advanced Reporting**: Custom report builder with scheduling

## 📞 Support

For critical issues or questions about the RTO dashboard:
- Email: sg.gupta2241@gmail.com
- System generates automated reports and alerts
- All RTO data is backed up and recoverable

## 🎨 UI/UX Features

### Professional Design
- **Material-UI Components**: Consistent, modern interface
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Follows system theme settings
- **Interactive Charts**: Hover effects and drill-down capabilities
- **Color-coded Status**: Intuitive status and risk level indicators

### User Experience
- **Intuitive Navigation**: Tab-based organization
- **Fast Loading**: Optimized queries and caching
- **Real-time Updates**: Live data refresh capabilities
- **Export Ready**: One-click CSV downloads
- **Mobile Friendly**: Touch-optimized interface

---

*This RTO Dashboard system provides comprehensive insights into return patterns, enabling data-driven decisions to reduce RTO rates and recover lost revenue.*
