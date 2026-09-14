/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_URL || '',
  trailingSlash: true,
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      'react-router-dom': './src/routes/react-router-dom-shim.js',
    },
  },
};

export default nextConfig;
