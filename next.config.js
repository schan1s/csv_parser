/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // Remove or set to false if you're not using images
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
