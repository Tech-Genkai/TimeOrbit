# TimeOrbit Celestial Desktop Live Wallpaper 🪐

A minimalist, high-luxury desktop live wallpaper featuring a real-time rotating 3D Earth, glowing night city lights, shimmering polar aurora borealis, soft atmospheric limb glow, live celestial telemetry, and dual-clock time comparison.

---

## ✨ Features

- **Cinematic 3D Earth**: High-resolution procedural satellite Earth with bathymetric shallow coastal shelves, lush biomes, and night city light clusters.
- **Header-Free Desktop Clean View**: Unobstructed upper view designed specifically to preserve space for desktop icons and widgets.
- **Interactive Dual City Selectors**:
  - Click on either the Origin city or the Second city dropdown directly inside the bottom floating dock to pick from 25+ global hubs.
  - Quick Swap button (`⇄`) instantly flips your primary and secondary time zones.
  - Automatically saves your selected cities in `localStorage` across computer reboots.
- **Living Celestial Mechanics**:
  - **Distant 1.0 AU Sun**: Dynamically illuminates the globe according to current UTC date and equation-of-time solar declination.
  - **Solar Noon Beacon (`☀️ SOLAR NOON`)**: Live indicator marking the subsolar zenith point on Earth's surface.
  - **3D Moon in Space**: Real-time sublunar coordinates with illuminated lunar phases (0–100%) and dashed orbit line.
  - **ISS Spacecraft Orbit**: 3D International Space Station flying in real-time at 418 km altitude along its 51.64° orbital inclination.
  - **Glowing Geodesic Flight Arc**: Curved great-circle trajectory physically connecting your two chosen cities.
- **Double-Click Clean Mode**: Double-click anywhere on the desktop (or click "Hide HUD") to completely hide all clocks and indicators for a 100% distraction-free pure globe view.
- **Smooth Mouse Orbit & Zoom**: Click and drag on the desktop to orbit the 3D camera around Earth; use mouse-wheel to zoom in/out.
- **Ultra-Low Resource Footprint**: Optimized Three.js render loop running silky-smooth at 60 FPS with minimal CPU/GPU overhead.

---

## 🚀 How to Use (Free in 1 Minute)

### Option 1: Lively Wallpaper (Windows - Recommended)
1. Install **Lively Wallpaper** free from the [Microsoft Store](https://apps.microsoft.com/detail/9ntm2qc6qws7) or [GitHub](https://github.com/rocksdanister/lively).
2. Open Lively Wallpaper and click **`+ Add Wallpaper`**.
3. Select `wallpaper/index.html` (or drag the `wallpaper` folder into the Lively app window).
4. Right-click the wallpaper in Lively and select **Customize** to adjust Earth rotation speed or choose your default comparison city.
5. Enjoy your living desktop!

### Option 2: Wallpaper Engine (Steam)
1. Open Wallpaper Engine.
2. Select **Open Wallpaper** -> **Open from File** -> choose `wallpaper/index.html`.

### Option 3: Quick Browser Preview
- Double-click `wallpaper/index.html` to open directly in Chrome/Edge/Firefox, and press **F11** for full-screen.
- Or visit the web route at [`/wallpaper`](https://timeorbit.vercel.app/wallpaper).

---

## ⚙️ Lively Properties (`LivelyProperties.json`)

| Property | Type | Default | Description |
|---|---|---|---|
| `rotationSpeed` | Slider | `0.8` | Earth auto-rotation velocity (0 to 3.0) |
| `showHUD` | Checkbox | `true` | Show or hide floating clocks dock |
| `secondCity` | Dropdown | `London` | Default comparison city for the second clock |
