import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LIEC Education — Lyon Admin Platform (DRC & Congo-Brazzaville)',
  description:
    'Unified LIEC Education Lyon Platform: Student recruitment from DRC & Congo-Brazzaville for ISCOM, MyDigitalSchool, École Internationale Tunon, IHECF, Ipac Bachelor Factory, and MBway Lyon.',
  icons: {
    icon: '/logo_LIEC.jpeg',
    shortcut: '/logo_LIEC.jpeg',
    apple: '/logo_LIEC.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-[#f6f9fc] text-[#092342] antialiased">
        {children}
      </body>
    </html>
  );
}
