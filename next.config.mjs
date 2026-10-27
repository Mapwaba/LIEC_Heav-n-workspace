/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'nodemailer'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
