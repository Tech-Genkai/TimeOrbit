'use client';

import { useState, useEffect, useRef } from 'react';
import GlobeCanvas, { GlobeCanvasHandle } from '@/components/globe/GlobeCanvas';
import { CITIES } from '@/lib/cities';
import { getCityTime, compareCities } from '@/lib/timeEngine';
import { CityData, TimeDetail, ComparisonResult } from '@/types';
import { ArrowRightLeft, Eye, EyeOff, ChevronDown } from 'lucide-react';

export default function WallpaperPage() {
  const [cityA, setCityA] = useState<CityData>(() => CITIES.find(c => c.id === 'delhi') || CITIES[0]);
  const [cityB, setCityB] = useState<CityData>(() => CITIES.find(c => c.id === 'london') || CITIES[1] || CITIES[0]);
  const [timeA, setTimeA] = useState<TimeDetail | null>(null);
  const [timeB, setTimeB] = useState<TimeDetail | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
  const globeRef = useRef<GlobeCanvasHandle | null>(null);

  // Restore saved city preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedA = localStorage.getItem('timeorbit_wallpaper_city_a');
      const savedB = localStorage.getItem('timeorbit_wallpaper_city_b');
      if (savedA || savedB) {
        requestAnimationFrame(() => {
          if (savedA) {
            const foundA = CITIES.find((c) => c.id === savedA || c.name === savedA || c.city === savedA);
            if (foundA) setCityA(foundA);
          }
          if (savedB) {
            const foundB = CITIES.find((c) => c.id === savedB || c.name === savedB || c.city === savedB);
            if (foundB) setCityB(foundB);
          }
        });
      }
    } catch {
      // Storage unavailable in private browsing
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeA(getCityTime(cityA, now));
      setTimeB(getCityTime(cityB, now));
      setComparison(compareCities(cityA, cityB, now));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cityA, cityB]);

  const handleSwap = () => {
    const temp = cityA;
    setCityA(cityB);
    setCityB(temp);
    try {
      localStorage.setItem('timeorbit_wallpaper_city_a', cityB.id);
      localStorage.setItem('timeorbit_wallpaper_city_b', temp.id);
    } catch {
      // ignore
    }
  };

  const primaryLoc = { lat: cityA.lat, lng: cityA.lng, label: cityA.city };
  const secondaryLoc = { lat: cityB.lat, lng: cityB.lng, label: cityB.city };

  return (
    <div
      onDoubleClick={() => setIsHudVisible((prev) => !prev)}
      className="relative w-screen h-screen overflow-hidden bg-black text-white select-none"
    >
      {/* Full-Page Interactive 3D Three.js Globe & Space Canvas */}
      <div className="absolute inset-0 w-full h-full z-0">
        <GlobeCanvas
          ref={globeRef}
          primaryLocation={primaryLoc}
          secondaryLocation={secondaryLoc}
          autoRotate={true}
          focusedTarget="earth"
          className="w-full h-full"
        />
      </div>

      {/* Aesthetic Space Observatory HUD Overlay */}
      <div
        className={`relative z-10 w-full h-full flex flex-col justify-between p-6 sm:p-10 pointer-events-none transition-opacity duration-500 ${
          isHudVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar: Clean & Minimal (Header Title Banner Removed) */}
        <div className="flex items-center justify-end pointer-events-auto">
          <div className="flex items-center gap-3 glass-panel px-3.5 py-1.5 rounded-full text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
            <span className="text-zinc-300 text-[11px]">Live Desktop Wallpaper</span>
            <span className="text-zinc-600">|</span>
            <button
              type="button"
              onClick={() => setIsHudVisible((prev) => !prev)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              title="Double-click screen anytime to toggle HUD"
            >
              {isHudVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{isHudVisible ? 'Hide HUD' : 'Show HUD'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Floating Minimal Dock with Interactive Dual-City Selectors */}
        <div className="w-full flex justify-center pointer-events-auto">
          <div className="glass-panel px-5 py-2.5 rounded-full flex items-center gap-4 sm:gap-6 shadow-2xl backdrop-blur-2xl border border-white/10">
            {/* City A (Origin) */}
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
              <div>
                <div className="relative inline-flex items-center group">
                  <select
                    value={cityA.id}
                    onChange={(e) => {
                      const selected = CITIES.find((c) => c.id === e.target.value);
                      if (selected) {
                        setCityA(selected);
                        try {
                          localStorage.setItem('timeorbit_wallpaper_city_a', selected.id);
                        } catch {}
                      }
                    }}
                    className="appearance-none bg-transparent text-[11px] font-medium tracking-wider uppercase text-white pr-4 cursor-pointer focus:outline-none hover:text-[#38bdf8] transition-colors"
                    title="Click to Choose Origin City"
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0b1120] text-white py-1">
                        {c.city} ({c.country})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-2.5 h-2.5 absolute right-0 pointer-events-none text-zinc-400 group-hover:text-[#38bdf8] transition-colors" />
                </div>
                <div suppressHydrationWarning className="font-mono text-xs sm:text-sm text-white font-light">
                  {timeA?.currentTime || '--:--:--'}
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#fea082] transition-transform hover:rotate-180 duration-300 cursor-pointer"
              title="Swap Locations"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            {/* City B (Second City / Target) */}
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#fea082] shadow-[0_0_8px_#fea082]" />
              <div>
                <div className="relative inline-flex items-center group">
                  <select
                    value={cityB.id}
                    onChange={(e) => {
                      const selected = CITIES.find((c) => c.id === e.target.value);
                      if (selected) {
                        setCityB(selected);
                        try {
                          localStorage.setItem('timeorbit_wallpaper_city_b', selected.id);
                        } catch {}
                      }
                    }}
                    className="appearance-none bg-transparent text-[11px] font-medium tracking-wider uppercase text-[#fea082] pr-4 cursor-pointer focus:outline-none hover:text-[#ffbba6] transition-colors"
                    title="Click to Choose Second City / Time"
                  >
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#0b1120] text-white py-1">
                        {c.city} ({c.country})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-2.5 h-2.5 absolute right-0 pointer-events-none text-zinc-400 group-hover:text-[#fea082] transition-colors" />
                </div>
                <div suppressHydrationWarning className="font-mono text-xs sm:text-sm text-[#fea082] font-light">
                  {timeB?.currentTime || '--:--:--'}
                </div>
              </div>
            </div>

            {/* Time Difference Tag */}
            {comparison && (
              <>
                <div className="w-px h-6 bg-white/15 hidden sm:block" />
                <div className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase hidden sm:block">
                  {comparison.formattedDifference}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
