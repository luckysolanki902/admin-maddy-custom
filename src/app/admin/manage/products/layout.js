'use client';

import { Suspense } from "react";
import CategoryContextWrapper from "@/components/layout/CategoryContextWrapper";

export default function ProductsLayout({ children }) {
    return (
      <CategoryContextWrapper>
        <Suspense fallback={null}>{children}</Suspense>
      </CategoryContextWrapper>
    );
  }
  