/**
 * Platform & Native App Environment Detector
 * Accurately determines if the user is running within an installed native package
 * (Android APK, Windows MSI/EXE, macOS DMG, Linux Desktop, or Standalone PWA)
 * vs. viewing on a public web browser.
 */

export function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true;
  return Boolean(isStandaloneMedia || isIosStandalone);
}

export function isAndroidWebView(): boolean {
  if (typeof window === 'undefined') return false;

  // Check custom injected JS bridge
  if ('TimeOrbitNative' in window) return true;

  const ua = window.navigator.userAgent || '';

  // Explicit TimeOrbit native app marker
  if (/TimeOrbitApp/i.test(ua)) return true;

  // Standard Android WebView indicators
  const isAndroid = /Android/i.test(ua);
  const isWv = /; wv\)/i.test(ua);
  const isVersionChrome = /Version\/[0-9.]+\s+Chrome\//i.test(ua);

  if (isAndroid && (isWv || isVersionChrome)) {
    return true;
  }

  // Android package referrer
  if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://com.timeorbit.app')) {
    return true;
  }

  return false;
}

/**
 * Universal check for whether the frontend is running inside a native TimeOrbit app
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;

  // Query parameter override for debugging/testing
  try {
    if (new URLSearchParams(window.location.search).get('app') === 'native') {
      return true;
    }
  } catch {}

  return isTauri() || isStandalonePWA() || isAndroidWebView();
}
