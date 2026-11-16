/**
 * Tauri 2.0 Rust Bridge Integration Helper
 * Allows seamless communication between Next.js React frontend and Rust core.
 * Gracefully falls back to TypeScript engine when running in standard browser/web mode.
 */

// Check if running inside native Tauri runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export interface RustSubsolarPoint {
  lat: number;
  lng: number;
}

export interface RustSolarElevation {
  altitude_deg: f64;
  azimuth_deg: f64;
  is_daylight: boolean;
  shadow_factor: f64;
}

type f64 = number;

/**
 * Invoke high-speed Rust subsolar point calculation with zero-latency fallback
 */
export async function invokeSubsolar(timestampMs: number = Date.now()): Promise<RustSubsolarPoint | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<RustSubsolarPoint>('get_subsolar_coordinates', { timestampMs });
    } catch (err) {
      console.warn('[Tauri Bridge] Rust invoke failed, using browser fallback:', err);
    }
  }
  return null;
}

/**
 * Invoke high-speed Rust solar elevation calculation
 */
export async function invokeSolarElevation(
  lat: number,
  lng: number,
  timestampMs: number = Date.now()
): Promise<RustSolarElevation | null> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<RustSolarElevation>('calculate_solar_elevation', { lat, lng, timestampMs });
    } catch (err) {
      console.warn('[Tauri Bridge] Rust invoke failed, using browser fallback:', err);
    }
  }
  return null;
}
