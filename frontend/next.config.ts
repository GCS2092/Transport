import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  allowedDevOrigins: ['192.168.1.127'],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.wenddtransport.com' }],
        destination: 'https://wenddtransport.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
