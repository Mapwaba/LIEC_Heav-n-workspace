/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pg', '@electric-sql/pglite', 'nodemailer'],
};

export default nextConfig;
