'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { isNativeApp } from '@/lib/platform';
import {
  Download,
  Smartphone,
  Monitor,
  Apple,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Info,
  ChevronDown,
  ShieldCheck,
  QrCode
} from 'lucide-react';

type PlatformKey = 'android' | 'windows' | 'macos' | 'linux' | 'wallpaper' | 'ios';

interface PlatformInfo {
  id: PlatformKey;
  name: string;
  osLabel: string;
  badge: string;
  icon: typeof Monitor;
  fileType: string;
  size: string;
  version: string;
  primaryUrl: string;
  primaryLabel: string;
  secondaryUrl?: string;
  secondaryLabel?: string;
  instructions: string[];
  tips?: string;
}

const RELEASE_BASE = 'https://github.com/Tech-Genkai/TimeOrbit/releases/download/v1.0.0';
const GITHUB_RELEASE_PAGE = 'https://github.com/Tech-Genkai/TimeOrbit/releases/tag/v1.0.0';

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'android',
    name: 'Android Mobile & Tablet',
    osLabel: 'Android 8.0+',
    badge: 'Direct APK',
    icon: Smartphone,
    fileType: '.apk',
    size: '4.6 MB',
    version: 'v1.0.0',
    primaryUrl: `${RELEASE_BASE}/TimeOrbit-v1.0.0.apk`,
    primaryLabel: 'Download APK (.apk)',
    instructions: [
      'Download TimeOrbit-v1.0.0.apk to your Android device.',
      'Tap on the downloaded file in your browser or Downloads folder.',
      'If prompted, toggle "Allow install from this source" in system settings.',
      'Tap Install and launch TimeOrbit from your home screen or app drawer.'
    ],
    tips: 'Pure native performance with hardware-accelerated 3D globe rendering.'
  },
  {
    id: 'windows',
    name: 'Windows Desktop PC',
    osLabel: 'Windows 10 / 11 (64-bit)',
    badge: 'Desktop App',
    icon: Monitor,
    fileType: '.msi / .exe',
    size: '3.5 MB',
    version: 'v1.0.0',
    primaryUrl: `${RELEASE_BASE}/TimeOrbit_1.0.0_x64_en-US.msi`,
    primaryLabel: 'Download MSI Installer (.msi)',
    secondaryUrl: `${RELEASE_BASE}/TimeOrbit-v1.0.0.exe`,
    secondaryLabel: 'Download Standalone (.exe)',
    instructions: [
      'Download either the .msi installer or portable .exe.',
      'Run the downloaded installer.',
      'If Microsoft Defender SmartScreen appears ("Windows protected your PC"), click "More info" then "Run anyway" (the binary is open-source and newly compiled without an expensive enterprise certificate).',
      'Follow the setup wizard to complete installation.'
    ],
    tips: 'Runs ultra-fast on WebView2 with negligible background memory usage (<40MB).'
  },
  {
    id: 'macos',
    name: 'Apple macOS',
    osLabel: 'macOS 12.0+ (Universal / Apple Silicon & Intel)',
    badge: 'Disk Image',
    icon: Apple,
    fileType: '.dmg',
    size: '5.3 MB',
    version: 'v1.0.0',
    primaryUrl: `${RELEASE_BASE}/TimeOrbit.dmg`,
    primaryLabel: 'Download Disk Image (.dmg)',
    instructions: [
      'Download TimeOrbit.dmg to your Mac.',
      'Open the .dmg file and drag TimeOrbit into your Applications folder.',
      'If macOS Gatekeeper warns that the app cannot be opened because it is from an unidentified developer: Right-click (or Control-click) TimeOrbit in Applications and choose "Open", then click "Open" in the prompt.'
    ],
    tips: 'Supports native macOS dark mode, Retina display rendering, and multi-monitor setups.'
  },
  {
    id: 'linux',
    name: 'Linux Desktop',
    osLabel: 'Ubuntu, Debian, Fedora, Arch & Generic Linux',
    badge: 'Portable & Deb',
    icon: Terminal,
    fileType: '.AppImage / .deb',
    size: '84.5 MB',
    version: 'v1.0.0',
    primaryUrl: `${RELEASE_BASE}/timeorbit.AppImage`,
    primaryLabel: 'Download AppImage (Portable)',
    secondaryUrl: `${RELEASE_BASE}/timeorbit.deb`,
    secondaryLabel: 'Download Debian / Ubuntu (.deb)',
    instructions: [
      'For AppImage: Right-click -> Properties -> Permissions -> Check "Allow executing file as program" (or run `chmod +x timeorbit.AppImage`), then double-click to run.',
      'For Debian/Ubuntu (.deb): Install via `sudo dpkg -i timeorbit.deb` or open with your software installer.'
    ],
    tips: 'No complex dependencies required. AppImage runs out of the box on all major Linux distributions.'
  },
  {
    id: 'wallpaper',
    name: 'Windows Live Desktop Wallpaper',
    osLabel: 'Lively Wallpaper / Wallpaper Engine',
    badge: '3D Live Wallpaper',
    icon: Layers,
    fileType: '.zip',
    size: '14 KB',
    version: 'v1.0.0',
    primaryUrl: `${RELEASE_BASE}/TimeOrbit-Windows-LiveWallpaper.zip`,
    primaryLabel: 'Download Live Wallpaper (.zip)',
    instructions: [
      'Install the free, open-source Lively Wallpaper from Microsoft Store or GitHub (or Wallpaper Engine on Steam).',
      'Download TimeOrbit-Windows-LiveWallpaper.zip and extract it.',
      'Drag and drop the extracted folder into Lively Wallpaper to set your live 3D Earth wallpaper.'
    ],
    tips: 'Turns your desktop background into a live, interactive 3D observatory that updates continuously with day/night cycles.'
  },
  {
    id: 'ios',
    name: 'Apple iOS (iPhone & iPad)',
    osLabel: 'iOS 15.0+ / iPadOS',
    badge: 'Web Clip PWA',
    icon: Smartphone,
    fileType: 'PWA Web App',
    size: 'Instant / Cloud-Cached',
    version: 'v1.0.0',
    primaryUrl: 'https://timeorbit-chi.vercel.app',
    primaryLabel: 'Open in Safari & Add to Home Screen',
    instructions: [
      'Open https://timeorbit-chi.vercel.app in Safari on your iPhone or iPad.',
      'Tap the "Share" button (the square with an arrow pointing upward at the bottom of Safari).',
      'Scroll down and tap "Add to Home Screen".',
      'Tap "Add" in the top-right corner.',
      'TimeOrbit will appear as a standalone native app icon on your home screen, launching full-screen without browser URL bars.'
    ],
    tips: 'Runs in standalone fullscreen mode with offline caching and zero App Store storage overhead.'
  }
];

export default function DownloadPage() {
  const [detectedPlatform, setDetectedPlatform] = useState<PlatformKey>('windows');
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsNative(isNativeApp());
      if (typeof window === 'undefined') return;
      const ua = navigator.userAgent.toLowerCase();
      if (/android/.test(ua)) {
        setDetectedPlatform('android');
      } else if (/iphone|ipad|ipod/.test(ua)) {
        setDetectedPlatform('ios');
      } else if (/macintosh|mac os x/.test(ua)) {
        setDetectedPlatform('macos');
      } else if (/linux/.test(ua)) {
        setDetectedPlatform('linux');
      } else {
        setDetectedPlatform('windows');
      }
    });
  }, []);

  const currentPlatform = PLATFORMS.find((p) => p.id === detectedPlatform) || PLATFORMS[0];

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-[#07090e] text-zinc-100 flex flex-col justify-between selection:bg-[#fea082]/30 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-10 sm:space-y-12">
        {/* Header Hero Section */}
        <div className="text-center space-y-4 pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fea082]/10 border border-[#fea082]/30 text-[#fea082] text-xs font-mono tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TimeOrbit Multi-Platform Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-light tracking-[0.15em] uppercase text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            Download TimeOrbit
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base font-light text-zinc-400">
            Real-time planetary observatory, astronomical ephemeris, and ultra-precision global timekeeping.
            Available natively for desktop, mobile, and live wallpaper.
          </p>
        </div>

        {/* Native App Active Alert (If viewing inside the native app) */}
        {isNative && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5 flex items-center gap-3 text-emerald-300 text-xs font-mono shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold uppercase tracking-wider block text-white text-sm">You are using the Native TimeOrbit App</span>
              <span className="text-zinc-300 font-light">
                Version 1.0.0 is currently active on your device. You already have the native application installed!
              </span>
            </div>
          </div>
        )}

        {/* Recommended Download Hero Box (Auto-Detected Platform) */}
        <div className="relative rounded-3xl bg-radial from-[#fea082]/10 via-black/80 to-black/95 border border-[#fea082]/40 p-6 sm:p-10 backdrop-blur-2xl shadow-[0_0_40px_rgba(254,160,130,0.12)] overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#38bdf8]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Detected for your system: {currentPlatform.name}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-white">
                Get TimeOrbit for {currentPlatform.osLabel}
              </h2>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-mono text-zinc-400">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200">
                  Version {currentPlatform.version}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200">
                  Format: {currentPlatform.fileType}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-200">
                  Size: {currentPlatform.size}
                </span>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              <a
                href={currentPlatform.primaryUrl}
                download
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl glow-btn font-mono text-xs uppercase tracking-widest text-black font-semibold shadow-xl transition-all cursor-pointer active:scale-95 text-center whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>{currentPlatform.primaryLabel}</span>
              </a>

              {currentPlatform.secondaryUrl && (
                <a
                  href={currentPlatform.secondaryUrl}
                  download
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-mono text-xs uppercase tracking-widest text-white transition-all cursor-pointer active:scale-95 text-center whitespace-nowrap"
                >
                  <Download className="w-4 h-4 text-[#fea082]" />
                  <span>{currentPlatform.secondaryLabel}</span>
                </a>
              )}

              {currentPlatform.id === 'android' && (
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-zinc-300 font-mono text-xs transition-all cursor-pointer active:scale-95"
                  title="Scan QR Code on Phone"
                >
                  <QrCode className="w-4 h-4 text-[#38bdf8]" />
                  <span>QR Code</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Notice Banner */}
          {currentPlatform.tips && (
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2.5 text-xs font-mono text-zinc-400">
              <Info className="w-4 h-4 text-[#fea082] shrink-0" />
              <span>{currentPlatform.tips}</span>
            </div>
          )}
        </div>

        {/* All Platforms Grid */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-light tracking-[0.2em] uppercase text-white">
                All Available Platforms
              </h2>
              <p className="text-xs font-mono text-zinc-400">
                Choose your target operating system or package format
              </p>
            </div>

            <a
              href={GITHUB_RELEASE_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-mono text-zinc-300 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#fea082]" />
              <span>View GitHub Releases</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isDetected = platform.id === detectedPlatform;

              return (
                <div
                  key={platform.id}
                  className={`flex flex-col justify-between p-6 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
                    isDetected
                      ? 'bg-black/90 border-[#fea082]/60 shadow-[0_0_25px_rgba(254,160,130,0.15)] ring-1 ring-[#fea082]/40'
                      : 'bg-black/60 border-white/10 hover:border-white/25 hover:bg-black/80'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-[#fea082] shadow-sm">
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-widest bg-white/10 border border-white/15 text-zinc-300">
                          {platform.badge}
                        </span>
                        {isDetected && (
                          <span className="text-[9px] font-mono text-emerald-400 tracking-wider">
                            ● Your Device
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-light text-white tracking-wide">
                        {platform.name}
                      </h3>
                      <p className="text-xs font-mono text-zinc-400 mt-0.5">
                        {platform.osLabel}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono text-zinc-400 pt-2 border-t border-white/10">
                      <span>{platform.fileType}</span>
                      <span>•</span>
                      <span>{platform.size}</span>
                      <span>•</span>
                      <span>{platform.version}</span>
                    </div>

                    {/* Step-by-step installation instructions */}
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                        Quick Setup Guide:
                      </div>
                      <ul className="space-y-1.5 text-xs text-zinc-400">
                        {platform.instructions.map((step, idx) => (
                          <li key={`step-${platform.id}-${idx}`} className="flex items-start gap-2">
                            <span className="text-[#fea082] font-mono text-[11px] mt-0.5">
                              {idx + 1}.
                            </span>
                            <span className="leading-snug">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-6 space-y-2 mt-4 border-t border-white/10">
                    <a
                      href={platform.primaryUrl}
                      download={platform.id !== 'ios'}
                      target={platform.id === 'ios' ? '_blank' : undefined}
                      rel={platform.id === 'ios' ? 'noopener noreferrer' : undefined}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-mono uppercase tracking-wider text-white transition-all cursor-pointer active:scale-95 text-center"
                    >
                      <Download className="w-4 h-4 text-[#fea082]" />
                      <span>{platform.primaryLabel}</span>
                    </a>

                    {platform.secondaryUrl && (
                      <a
                        href={platform.secondaryUrl}
                        download
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-transparent hover:bg-white/5 border border-white/10 text-xs font-mono uppercase tracking-wider text-zinc-300 transition-all cursor-pointer active:scale-95 text-center"
                      >
                        <Download className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{platform.secondaryLabel}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Installation FAQ & Security Section */}
        <div className="space-y-4 rounded-3xl bg-black/60 border border-white/10 p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 text-sm font-mono uppercase tracking-wider text-zinc-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Installation Safety & Security FAQ</span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              {
                q: 'Why does Windows SmartScreen warn about "Unknown Publisher" for TimeOrbit.msi?',
                a: 'TimeOrbit is an open-source application and newly published. Microsoft Defender SmartScreen displays this advisory for any software that has not yet established reputation or is not signed with an enterprise EV code signing certificate ($400+/year). TimeOrbit is 100% safe and open-source on GitHub. To install: click "More info", then click "Run anyway".'
              },
              {
                q: 'How do I install the Android APK on my phone?',
                a: 'Download the APK directly on your Android device. When opening the file, Android security will ask for permission to install apps from your browser (Chrome/Firefox). Simply toggle "Allow from this source", return to the install dialog, and tap "Install".'
              },
              {
                q: 'How do I open TimeOrbit on macOS if Gatekeeper blocks it?',
                a: 'Apple Gatekeeper checks for developer certificates by default. To open TimeOrbit: Open Finder -> Applications -> Right-click (or Control-click) TimeOrbit -> Select "Open" -> Click "Open" in the security prompt. You will only need to do this once.'
              },
              {
                q: 'Are the downloads updated automatically?',
                a: 'All official installers are compiled and published directly by GitHub Actions from the main repository. You can verify SHA-256 digests and source code commits at any time on GitHub.'
              }
            ].map((faq, idx) => {
              const isOpen = activeFaq === `faq-${idx}`;
              return (
                <div
                  key={`faq-${idx}`}
                  className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : `faq-${idx}`)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left text-xs sm:text-sm font-medium text-white hover:text-[#fea082] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#fea082]' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-0 text-xs text-zinc-400 leading-relaxed font-light border-t border-white/5">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center sm:text-left">
          <div>
            <div className="text-sm font-light text-white">Prefer to inspect the source code?</div>
            <div className="text-xs font-mono text-zinc-500 mt-0.5">Explore the GitHub repository, workflow runs, and releases.</div>
          </div>
          <a
            href="https://github.com/Tech-Genkai/TimeOrbit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-mono uppercase tracking-wider text-zinc-200 transition-all shrink-0"
          >
            <span>View Source on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* QR Code Modal for Android / Mobile */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-light text-white uppercase tracking-wider">
              Scan with your Phone
            </h3>
            <p className="text-xs font-mono text-zinc-400">
              Scan this QR code with your mobile camera to download TimeOrbit directly to your phone:
            </p>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${RELEASE_BASE}/TimeOrbit-v1.0.0.apk`
                )}`}
                alt="TimeOrbit APK QR Code"
                width={192}
                height={192}
                unoptimized
                className="w-48 h-48 mx-auto"
              />
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              Direct link to TimeOrbit-v1.0.0.apk
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono uppercase tracking-wider text-white transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer System Telemetry */}
      <footer className="mt-8 text-center text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
        TimeOrbit Official Multi-Platform Distribution Hub • SHA-256 Verified Release Packages
      </footer>
    </div>
  );
}
