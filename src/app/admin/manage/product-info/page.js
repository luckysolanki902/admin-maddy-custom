"use client";
import dynamic from "next/dynamic";

const ProductInfoAdminEditor = dynamic(
  () => import("@/components/full-page-comps/ProductInfoEditor"),
  { ssr: false }
);

export default function Page() {
  return <ProductInfoAdminEditor />;
}
