import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function Production() {
  const optionsWithLinks = [
            { text: 'Feature Requests Dashboard', link: '/admin/feature-requests/manage' },
            {text: 'RTO Dashboard', link: '/admin/rto/dashboard'},
    { text: 'Download Templates', link: '/admin/download/download-production-templates' },
    { text: 'Download Catalogue', link: '/admin/download/download-catalogue' },
    { text: 'Orders Dashboard', link: '/admin/manage/orders/order-list' },
    { text: 'Design Search', link: '/admin/manage/orders/sku-search' },
    { text: 'Analytics Dashboard', link: '/admin/analytics' },
    { text: 'ProductInfo Tabs', link: '/admin/manage/product-info' },
    { text: 'Review Manager', link: '/admin/manage/reviews' },
    { text: 'Download Inventory Orders Data', link: '/admin/download/download-inventory-orders' },
    { text: 'Manage Customer Queries', link: '/admin/manage/customer-support' },

  ];

  return (
    <DepartmentHomePage
      department="Production"
      quote="If you can’t describe what you are doing as a process, you don’t know what you’re doing"
      options={optionsWithLinks}
    />
  );
}
