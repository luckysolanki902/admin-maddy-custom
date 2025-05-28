import React from 'react';
import { redirect } from 'next/navigation';

// This page just redirects to the feature requests management page
export default function FeatureRequestsRedirect() {
  redirect('/admin/feature-requests/manage');
  return null;
}
