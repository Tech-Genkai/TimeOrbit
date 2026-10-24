import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TimeOrbit — Global Time Zone Explorer & Developer API',
  description:
    'Interactive 3D globe with location markers, real-time multi-city clocks, seamless timezone comparisons, and high-performance REST API.',
  keywords: ['time zone API', 'world clock', 'time comparison', '3D globe', 'developer API', 'TimeOrbit'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#060814] text-gray-100 antialiased`}>
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
