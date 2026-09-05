import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Two dev servers started on this same folder otherwise compile into one .next and knock each
  // other's chunks out from under the browser. Setting NEXT_DIST_DIR gives a second one its own
  // build output; unset - which is every build and every normal `npm run dev` - it stays .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
