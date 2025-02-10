'use client';
import React from 'react';
import Image from 'next/image';

export default function PDFPageProductCard({ product }) {
    const imageBaseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_BASEURL;
    const mainImage =
        product.images && product.images.length > 0
            ? `${imageBaseUrl}${product.images[0]}`
            : null;

    return (
        <div
        style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
        }}
        >

            <div
                style={{
                    width: '90%',
                    height: 'fit-content',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1mm',
                    boxSizing: 'border-box',
                }}
            >
                {mainImage && (
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}
                    >
                        <Image
                            src={mainImage}
                            alt={product.sku}
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                    </div>
                )}
            </div>

            <div style={{ fontSize: '14px', fontWeight: '400',fontFamily:'Jost', color:'black', textTransform:'uppercase', marginTop: '8px', backgroundColor:'white', borderRadius:'4px', padding: '0.5mm', boxSizing: 'border-box', display:'flex', alignItems:'center', justifyContent:'space-between',width:'90%', padding:'1mm 2mm' }}>
                <div>
                    {product.name.length > 15 ? (
                        <>{product.name.slice(0, 15)}...</>
                    ) : (
                        product.name
                    )}
                </div>
                <div>  {product.sku}  </div>
            </div>
        </div>
    );
}
