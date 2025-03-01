import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from '@clerk/themes';
import ThemeRegistry from "@/components/layout/ThemeRegistry";
import AuthHeader from "@/components/layout/AuthHeader";
import TopLoadingBar from "@/lib/utils/TopLoadingBar";

import { Jost } from 'next/font/google';
import { Suspense } from "react";

const jost = Jost({
  subsets: ['latin'],
  weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-jost',
  display: 'swap',
});

export const metadata = {
  title: "Admin Dashboard | Maddy Custom",
  description: "Uniqueness isn't an option, it's a necessity.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark, // Consider updating this to also respond to theme changes if needed
      }}>
      <html lang="en">
        <body>
          <ThemeRegistry>
            <Suspense fallback={null}>
              <TopLoadingBar />
            
            <AuthHeader />
            <main>{children}</main>
            </Suspense>
          </ThemeRegistry>
        </body>
      </html>
    </ClerkProvider>
  );
}
