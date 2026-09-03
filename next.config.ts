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
  },
  // Allow cross-origin access to the UCP MCP transport so external MCP
  // clients (agents, wallets, platforms) can connect directly.
  async headers() {
    return [
      {
        source: '/api/mcp/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, UCP-Agent' },
        ],
      },
      {
        source: '/api/ucp/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, UCP-Agent, Idempotency-Key' },
        ],
      },
    ];
  },
};

export default nextConfig;
