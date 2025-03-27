import type { NextConfig } from "next";

const nextConfig: NextConfig = {
        experimental: {
          clientInstrumentationHook: true,
        },
};

export default nextConfig;
