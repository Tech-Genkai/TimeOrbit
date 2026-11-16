import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import AgeVerificationModal from '@/components/auth/AgeVerificationModal';
import { ToastProvider } from '@/context/ToastContext';

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://timeorbit-chi.vercel.app'),
  title: {
    default: 'TimeOrbit — Planetary Time & Celestial Observatory',
    template: '%s | TimeOrbit',
  },
  description:
    'Experience Earth in real-time 3D space with live Sun and Moon celestial telemetry, sunlight terminator, precision world clocks, chronological calendar, and developer time APIs.',
  keywords: [
    'planetary time',
    'solar observatory',
    'celestial telemetry',
    '3D Earth globe',
    'world clock API',
    'time zone converter',
    'ISS flyover tracker',
    'astronomical calendar',
    'TimeOrbit',
  ],
  authors: [{ name: 'TimeOrbit Planetary Team' }],
  creator: 'TimeOrbit',
  publisher: 'TimeOrbit Planetary Observatory',
  manifest: '/manifest.json',
  icons: {
    icon: '/globe.svg',
    shortcut: '/globe.svg',
    apple: '/globe.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://timeorbit-chi.vercel.app',
    siteName: 'TimeOrbit Planetary Observatory',
    title: 'TimeOrbit — Planetary Time & Solar Celestial Explorer',
    description:
      'Real-time 3D Earth, live solar terminator, multi-city time comparison, digital chronometer, and developer REST APIs.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TimeOrbit — Planetary Time & Celestial Explorer',
    description:
      'Explore Earth in 3D space with real-time celestial telemetry, precision time comparison, and developer APIs.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-black">
      <body className="min-h-screen flex flex-col bg-black text-slate-100 antialiased selection:bg-[#fea082]/30 selection:text-white">
        <ToastProvider>
          <ServiceWorkerRegister />
          <AgeVerificationModal />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
