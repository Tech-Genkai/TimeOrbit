import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'TimeOrbit — Planetary Time & Solar Celestial Explorer',
  description:
    'Experience Earth in real-time space 3D with live Sun and Moon celestial telemetry, sunlight terminator, and precision world time calculation engine.',
  keywords: ['solar system', 'planet Earth', 'time zone API', 'world clock', 'celestial observatory', 'TimeOrbit'],
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-black">
      <body className="min-h-screen flex flex-col bg-black text-slate-100 antialiased selection:bg-[#fea082]/30 selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
