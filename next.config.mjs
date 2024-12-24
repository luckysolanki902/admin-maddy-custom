/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'd26w01jhwuuxpo.cloudfront.net',
          },
          {
            protocol: 'https',
            hostname: 'd3efr8i3xj2spn.cloudfront.net',
          },
          {
            protocol: 'https',
            hostname: 'maddy-assets.s3.ap-south-1.amazonaws.com',
          }
        ],
      },

};

export default nextConfig;
