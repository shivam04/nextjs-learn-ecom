import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'utfs.io',
        port: ''
      },{
        protocol: 'https',
        hostname: 'miro.medium.com',
        port: ''
      }
    ]
  }
};

export default nextConfig;
