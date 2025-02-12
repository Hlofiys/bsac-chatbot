import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone'
  /* config options here */
  // output: "standalone",
  // webpack: (config) => {
  //   config.module.rules.push({
  //     test: /\.svg$/,
  //     use: ["@svgr/webpack"],
  //   });
  
  //   return config;
  // },
};

module.exports = nextConfig;
export default nextConfig