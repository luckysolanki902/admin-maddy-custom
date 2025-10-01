# Download Route & Templates Handling

This document explains how the production template download flow works, the data aggregation logic, folder + file naming conventions, and the UI presentation rules you requested.

## Overview
The admin page `app/admin/download/download-production-templates/page.js` lets internal users:
- Select a date range (today / yesterday / custom etc.)
- Fetch all ordered SKUs (paid orders only) that have at least one design template (old single `designTemplate.imageUrl` OR new multi `designTemplates[]`).
- View a compact table showing per–SKU summary with up to 2 template previews (letters `a`, `b`).
- Download a structured ZIP where templates are duplicated per ordered quantity and wrap finish distribution.

All preview images in the table use `NEXT_PUBLIC_CLOUDFRONT_BASEURL` (instant CDN path) — **no presigned URLs for table thumbnails**. Presigned URLs are generated only for real downloading (client-side zipping) to avoid server timeouts on serverless infra.

## Backend Aggregation (API Route)
`/api/admin/aws/get-presigned-urls` now:
1. Verifies JWT token containing `startDate`, `endDate`.
2. Matches paid orders in the date window.
3. Unwinds items, joins Product + SpecificCategoryVariant.
4. Filters products that have either:
   - `product.designTemplate.imageUrl` (legacy), or
   - Non-empty `product.designTemplates[]` (new schema).
5. Normalizes `wrapFinish` (defaults to `Matte` when blank) to build per-finish quantity distribution.
6. Groups by SKU, collecting:
   - Total ordered quantity (`totalCount`).
   - Wrap finish distribution object: `{ Matte: x, Glossy: y, None: z, ... }` ("None" means no finish variant; displayed as `N/A`).
   - Product name & specific category variant name.
   - Full template paths array: prefer `designTemplates[]`; fallback to legacy single template.
7. For the first two templates, generates `getObject` presigned URLs (used ONLY for zipping). Returns:
```
{
  sku,
  productName,
  specificCategoryVariant,
  count: totalCount,
  wrapFinish: { Matte: 10, Glossy: 4, None: 2 },
  templateCount: N,
  templates: [
    { path, presignedUrl, letter: 'a' },
    { path, presignedUrl, letter: 'b' }
  ],
  extraTemplatesHidden: templateCount > 2 ? (templateCount - 2) : 0
}
```

## Table UI Rules
- Columns: SKU | Product Name | Orders Qty | Specific Category Variant | Templates (count) | Wrap Finish distribution | Preview (first two templates only, letters implicit in alt text).
- Preview uses raw CloudFront path: `${CLOUDFRONT_BASEURL}/${key}` (no borders, no radius, width = 40px, height auto, intrinsic aspect ratio preserved).
- If more than 2 templates: show `+n more` caption.
- Letters `a` and `b` are reserved ONLY for template differentiation (not order counts). Order counts come from quantities aggregation.
- Skeleton loaders (MUI `Skeleton`) display while fetching.
- No warning banners about missing/unavailable S3 objects.

## Download (Client Side)
- User clicks "Download Images".
- For each SKU:
  - For each available template (max first two with presigned URLs): fetch via presigned URL.
  - For each wrap finish (excluding `None`): replicate the binary `qty` times naming with incremental index.
  - For `wrapFinish['None']` entries, place under a `regular/` folder.
- ZIP is built fully client-side (JSZip) to avoid serverless timeouts.
- Filename pattern:
  `Orders_<StartDate>_downloaded_On_<CurrentTimestamp>.zip`
  Example: `Orders_Sep_25_2025_downloaded_On_Sep_25_2025_At_11_42_AM.zip`

## Folder & File Structure Inside ZIP
```
<specificCategoryVariantSanitized>/
  <wrapFinishSanitized>/
    <sku-sanitized>-a-1.jpg
    <sku-sanitized>-a-2.jpg
    <sku-sanitized>-b-1.jpg
    ...
  regular/ (when wrapFinish 'None')
    <sku-sanitized>-a-1.jpg
```
Notes:
- `-a-` or `-b-` denotes which template image (first or second) was used.
- Finish letter previously used (like `-m` for matte) is replaced by the clearer folder separation; template letter is stable and not quantity-dependent.
- More than 2 templates are NOT downloaded beyond `a` and `b` (per requirement). Can be extended later if needed.

## CloudFront vs S3
- Table preview uses CloudFront for speed: `NEXT_PUBLIC_CLOUDFRONT_BASEURL`.
- S3 presigned URLs only used when actually assembling the ZIP.
- This separation keeps UI snappy and secure (no presigned URL leakage in table).

## Edge Cases & Behavior
- Product with only one template => only template `a` shown and downloaded.
- Product with two or more templates => templates `a` and `b` shown; remainder collapsed behind `+n more`.
- Missing product name returns `—` fallback (shouldn’t happen after aggregation but is safe).
- Wrap finish-only `None` => show `N/A` in table.
- Empty results => table shows "No data available." row.

## Adding More Templates Later
If you need more than two templates surfaced:
1. Increase the slice in the API route where `templatePaths.slice(0, 2)` is applied.
2. Adjust table preview iteration and naming convention accordingly (introduce letters c, d, etc.).
3. Update README to reflect new logic.

## Security / Access
- JWT token flow ensures only permitted date-range queries.
- No exposure of secret env values to client; only public CloudFront base URL is used.

## Future Improvements (Optional)
- Add pagination if SKU count grows large.
- Introduce checksum manifest for printer verification.
- Allow toggling whether to include wrap finish segmentation.

---
Last updated: 2025-09-25
