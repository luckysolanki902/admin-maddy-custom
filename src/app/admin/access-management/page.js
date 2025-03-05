import DepartmentHomePage from '@/components/full-page-comps/DepartmentHomePage';
import React from 'react';

export default function Marketing() {
  const optionsWithLinks = [
    { text: ' Manage User Role', link: "/admin/access-management/userRole" },
    { text: ' Manage Path Role', link: '/admin/access-management/pathRole' },
    { text: 'Orders Dashboard', link: '/admin/super/orders/order-list' },
    { text: 'Analytics Dashboard', link: '/admin/super/analytics' },
    { text: 'Add a New Spec-cat', link: '/admin/manage/brand-new/spec-cat' },
  ];
  

  return (
    <DepartmentHomePage
      department="Admin"
      quote="Uniqueness is not an option, it's necessity"
      options={optionsWithLinks}
    />
  );
}
