'use client';

import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import { CITIES } from '@/lib/cities';

interface Marker {
  location: [number, number]; // [lat, lng]
  size: number;
  color?: [number, number, number];
}

interface GlobeLocation {
  lat: number;
  lng: number;
  label: string;
}

interface GlobeCanvasProps {
  primaryLocation?: GlobeLocation;
  secondaryLocation?: GlobeLocation;
  autoRotate?: boolean;
}

function buildGlobeMarkers(
  primary: GlobeLocation,
  secondary: GlobeLocation
): Marker[] {
  const isClose = (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.hypot(lat1 - lat2, lng1 - lng2) < 0.6;

  const markers: Marker[] = [
    // Primary Location Pin: Radiant Neon Cyan
    {
      location: [primary.lat, primary.lng],
      size: 0.1,
      color: [0, 0.95, 1],
    },
    // Secondary Location Pin: Radiant Neon Purple
    {
      location: [secondary.lat, secondary.lng],
      size: 0.085,
      color: [0.85, 0.25, 1],
    },
  ];

  // Constellation micro-markers for all other cities in CITIES
  for (const city of CITIES) {
    if (
      isClose(city.lat, city.lng, primary.lat, primary.lng) ||
      isClose(city.lat, city.lng, secondary.lat, secondary.lng)
    ) {
      continue;
    }
    markers.push({
      location: [city.lat, city.lng],
      size: 0.028,
      color: [0.3, 0.5, 0.8],
    });
  }

  return markers;
}

export default function GlobeCanvas({
  primaryLocation = { lat: 35.6762, lng: 139.6503, label: 'Tokyo' },
  secondaryLocation = { lat: 40.7128, lng: -74.006, label: 'New York' },
  autoRotate = true,
}: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Focus & rotation angles
  const initialPhi = (-primaryLocation.lng * Math.PI) / 180 - Math.PI / 2;
  const initialTheta = Math.max(-0.4, Math.min(0.6, (primaryLocation.lat * Math.PI) / 180 * 0.7));

  const phiRef = useRef<number>(initialPhi);
  const thetaRef = useRef<number>(initialTheta);
  const targetPhiRef = useRef<number>(initialPhi);
  const targetThetaRef = useRef<number>(initialTheta);

  // Markers ref for dynamic uniforms
  const markersRef = useRef<Marker[]>(buildGlobeMarkers(primaryLocation, secondaryLocation));
  const markersNeedUpdateRef = useRef<boolean>(false);

  // Pointer drag interaction
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerX = useRef<number>(0);
  const lastPointerY = useRef<number>(0);

  // Smoothly refocus camera when primaryLocation changes
  useEffect(() => {
    const newTargetPhi = (-primaryLocation.lng * Math.PI) / 180 - Math.PI / 2;
    const newTargetTheta = Math.max(-0.4, Math.min(0.6, (primaryLocation.lat * Math.PI) / 180 * 0.7));

    // Calculate shortest angular distance
    const currentPhi = phiRef.current;
    let delta = (newTargetPhi - currentPhi) % (2 * Math.PI);
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    targetPhiRef.current = currentPhi + delta;
    targetThetaRef.current = newTargetTheta;

    // Update marker pins
    markersRef.current = buildGlobeMarkers(primaryLocation, secondaryLocation);
    markersNeedUpdateRef.current = true;
  }, [primaryLocation, secondaryLocation]);

  useEffect(() => {
    let width = 0;
    const currentCanvas = canvasRef.current;
    if (!currentCanvas) return;

    const onResize = () => {
      if (currentCanvas) {
        width = currentCanvas.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(currentCanvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.08, 0.12, 0.25],
      markerColor: [0, 0.95, 1], // Default Cyan
      glowColor: [0.1, 0.4, 0.9],
      markers: markersRef.current,
      onRender: (state) => {
        if (!isDraggingRef.current) {
          // Smoothly interpolate towards target focus
          const phiDiff = targetPhiRef.current - phiRef.current;
          const thetaDiff = targetThetaRef.current - thetaRef.current;

          if (Math.abs(phiDiff) > 0.005 || Math.abs(thetaDiff) > 0.005) {
            phiRef.current += phiDiff * 0.06;
            thetaRef.current += thetaDiff * 0.06;
            if (autoRotate) {
              targetPhiRef.current += 0.002;
            }
          } else if (autoRotate) {
            // Graceful auto-rotation once aligned
            phiRef.current += 0.0025;
            targetPhiRef.current = phiRef.current;
          }
        }

        state.phi = phiRef.current;
        state.theta = thetaRef.current;
        state.width = width * 2;
        state.height = width * 2;

        if (markersNeedUpdateRef.current) {
          state.markers = markersRef.current;
          markersNeedUpdateRef.current = false;
        }
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [autoRotate]);

  return (
    <div
      className="relative w-full aspect-square max-w-[500px] mx-auto flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      onPointerDown={(e) => {
        isDraggingRef.current = true;
        lastPointerX.current = e.clientX;
        lastPointerY.current = e.clientY;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!isDraggingRef.current) return;
        const dx = e.clientX - lastPointerX.current;
        const dy = e.clientY - lastPointerY.current;
        lastPointerX.current = e.clientX;
        lastPointerY.current = e.clientY;

        phiRef.current += dx * 0.005;
        targetPhiRef.current = phiRef.current;

        thetaRef.current = Math.max(-0.6, Math.min(0.8, thetaRef.current - dy * 0.005));
        targetThetaRef.current = thetaRef.current;
      }}
      onPointerUp={(e) => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
          } catch {
            // Ignore capture error
          }
        }
      }}
      onPointerCancel={() => {
        isDraggingRef.current = false;
      }}
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-purple-600/20 to-blue-600/15 blur-3xl pointer-events-none" />

      {/* Top Constellation Indicator Pill */}
      <div className="absolute top-2 inset-x-0 flex items-center justify-center pointer-events-none z-10">
        <div className="glass-panel px-3 py-1 rounded-full text-[11px] font-mono text-cyan-300/80 border border-white/10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm shadow-md shadow-black/40">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span>3D Constellation: {CITIES.length} Global Hubs Active</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-90 transition-opacity duration-500"
        style={{ width: '100%', height: '100%', contain: 'layout paint size' }}
      />

      {/* Floating Pills for Radiant Highlighted Pins */}
      <div className="absolute bottom-2 inset-x-0 flex flex-wrap items-center justify-center gap-3 px-3 pointer-events-none z-10">
        {/* Primary Pin Badge */}
        <div className="glass-panel px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2.5 border border-cyan-400/40 bg-cyan-950/40 shadow-lg shadow-cyan-500/20 backdrop-blur-md">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          </span>
          <span className="text-gray-200 font-medium text-[11px] sm:text-xs">
            Primary: <strong className="text-cyan-300 font-bold tracking-wide">{primaryLocation.label}</strong>
          </span>
        </div>

        {/* Target Pin Badge */}
        <div className="glass-panel px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2.5 border border-purple-400/40 bg-purple-950/40 shadow-lg shadow-purple-500/20 backdrop-blur-md">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400 shadow-[0_0_8px_#c084fc]" />
          </span>
          <span className="text-gray-200 font-medium text-[11px] sm:text-xs">
            Target: <strong className="text-purple-300 font-bold tracking-wide">{secondaryLocation.label}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
