/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Disables ESLint during production builds
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d26w01jhwuuxpo.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "d3efr8i3xj2spn.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "maddy-assets.s3.ap-south-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "testingmaddy2.s3.ap-south-1.amazonaws.com",
      },
    ],
  },
  // Ensure the development server uses port 3001
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      // Any experimental features if needed
    }
  }),
};

export default nextConfig;
