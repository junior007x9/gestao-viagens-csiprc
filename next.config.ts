import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Desativa no PC para não atrapalhar, funciona só na Vercel
});

const nextConfig: NextConfig = {
  turbopack: {}, // <-- Esta é a linha que resolve o erro
};

export default withPWA(nextConfig);