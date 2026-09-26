/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "playwright-core",
      "@sparticuz/chromium",
    ],

    outputFileTracingIncludes: {
      "/api/probe": [
        "./node_modules/@sparticuz/chromium/**",
      ],
      "/api/verify": [
        "./node_modules/@sparticuz/chromium/**",
      ],
    },
  },
};

export default nextConfig;