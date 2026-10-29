'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { CITIES } from '@/lib/cities';
import { getSubsolarPoint, getSublunarPoint, getISSOrbitalPosition, ISSPosition } from '@/lib/timeEngine';

export interface GlobeCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
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
  focusedTarget?: 'primary' | 'secondary' | 'sun' | 'moon' | 'earth' | 'iss';
  onFocusChange?: (target: 'primary' | 'secondary' | 'sun' | 'moon' | 'earth' | 'iss') => void;
  className?: string;
}

// Convert geographic coordinates (lat, lng) to 3D Cartesian vector
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Creates a geodesic arc geometry connecting two geographic coordinates
function createGreatCircleArc(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radius: number
): THREE.BufferGeometry {
  const v1 = latLngToVector3(lat1, lng1, radius);
  const v2 = latLngToVector3(lat2, lng2, radius);
  const points: THREE.Vector3[] = [];
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new THREE.Vector3().lerpVectors(v1, v2, t);
    const altitude = 1 + Math.sin(t * Math.PI) * 0.14;
    p.normalize().multiplyScalar(radius * altitude);
    points.push(p);
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

// Creates an elegant celestial sprite label
function createMarkerSprite(text: string, color = '#ffffff', bgColor = 'rgba(0, 0, 0, 0.75)'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 24);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '300 20px Montserrat, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(0.65, 0.17, 1);
  return sprite;
}

// Generates an equirectangular Earth texture with clear oceans, landmasses, night city lights, and coordinate grid
function createProceduralEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const w = canvas.width;
  const h = canvas.height;

  // 1. Deep Blue Ocean Base with subtle depth gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#0284c7');
  oceanGrad.addColorStop(0.2, '#0369a1');
  oceanGrad.addColorStop(0.5, '#072b4f');
  oceanGrad.addColorStop(0.8, '#0369a1');
  oceanGrad.addColorStop(1, '#0284c7');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  const toX = (lng: number) => ((lng + 180) / 360) * w;
  const toY = (lat: number) => ((90 - lat) / 180) * h;

  // 2. Continental Landmasses
  const drawLandmass = (points: [number, number][], fill = '#16a34a', stroke = '#15803d') => {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach(([lat, lng], idx) => {
      const x = toX(lng);
      const y = toY(lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Eurasia (Europe + Asia)
  drawLandmass(
    [
      [70, 20], [72, 60], [75, 110], [72, 140], [65, 175], [55, 160], [45, 140],
      [35, 130], [25, 120], [20, 110], [10, 105], [5, 100], [15, 95], [25, 80],
      [8, 77], [22, 70], [25, 60], [15, 45], [30, 35], [38, 25], [36, -5],
      [43, -9], [48, -4], [55, 5], [60, 5], [70, 20],
    ],
    '#1e7e48',
    '#14532d'
  );

  // Scandinavia & UK
  drawLandmass([[58, 5], [64, 12], [70, 25], [60, 28], [55, 12]], '#14532d');
  drawLandmass([[50, -5], [58, -4], [55, -2], [50, 0]], '#166534');

  // Africa & Sahara Desert
  drawLandmass(
    [
      [35, -5], [37, 10], [32, 32], [28, 34], [12, 51], [2, 45], [-12, 40],
      [-25, 33], [-34, 26], [-34, 18], [-20, 12], [-5, 8], [5, 0], [5, -10],
      [15, -17], [25, -15], [35, -5],
    ],
    '#4d7c0f',
    '#365314'
  );
  drawLandmass([[30, -10], [32, 30], [22, 35], [16, 30], [16, -12], [25, -14]], '#92400e', '#78350f');

  // North America
  drawLandmass(
    [
      [72, -155], [70, -130], [60, -90], [55, -55], [45, -60], [35, -75], [25, -80],
      [22, -97], [15, -92], [20, -105], [30, -115], [38, -123], [48, -125], [58, -140],
      [65, -165], [72, -155],
    ],
    '#1e7e48',
    '#14532d'
  );

  // Greenland
  drawLandmass([[60, -45], [75, -20], [82, -30], [80, -65], [68, -55]], '#f8fafc', '#cbd5e1');

  // South America & Amazon
  drawLandmass(
    [
      [12, -72], [10, -60], [0, -50], [-10, -35], [-23, -42], [-35, -55], [-55, -68],
      [-50, -75], [-35, -72], [-18, -70], [-5, -80], [8, -77], [12, -72],
    ],
    '#14532d',
    '#052e16'
  );

  // Australia
  drawLandmass(
    [
      [-12, 131], [-15, 136], [-12, 142], [-22, 150], [-33, 151], [-38, 145],
      [-35, 135], [-35, 115], [-22, 114], [-15, 125], [-12, 131],
    ],
    '#92400e',
    '#78350f'
  );

  // Antarctica Ice Shelf
  drawLandmass([[-65, -180], [-65, 180], [-85, 180], [-90, 0], [-85, -180]], '#f8fafc', '#e2e8f0');

  // 3. Shimmering Night City Lights on continents
  ctx.fillStyle = '#fef08a';
  for (const city of CITIES) {
    const cx = toX(city.lng);
    const cy = toY(city.lat);
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Subtle Celestial Coordinate Grid
  ctx.strokeStyle = 'rgba(140, 186, 255, 0.18)';
  ctx.lineWidth = 1;

  for (let lat = -60; lat <= 60; lat += 30) {
    const y = toY(lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 45) {
    const x = toX(lng);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Equator Highlight
  ctx.strokeStyle = 'rgba(254, 160, 130, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(w, toY(0));
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

// Procedural Cloud Canvas Texture
function createProceduralCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';

  for (let i = 0; i < 75; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 20 + Math.random() * 40;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

const GlobeCanvas = forwardRef<GlobeCanvasHandle, GlobeCanvasProps>(function GlobeCanvas(
  {
    primaryLocation = { lat: 35.6762, lng: 139.6503, label: 'Tokyo' },
    secondaryLocation = { lat: 40.7128, lng: -74.006, label: 'New York' },
    autoRotate = false,
    focusedTarget = 'earth',
    className = '',
  }: GlobeCanvasProps,
  ref
) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const isRotatingRef = useRef<boolean>(autoRotate);

  useEffect(() => {
    isRotatingRef.current = autoRotate;
  }, [autoRotate]);

  // Live celestial state
  const [sunCoords, setSunCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [moonState, setMoonState] = useState<{
    lat: number;
    lng: number;
    phase: string;
    illumination: number;
    phaseEmoji: string;
  } | null>(null);
  const [issState, setIssState] = useState<ISSPosition | null>(null);

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cloudMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const sunMeshRef = useRef<THREE.Group | null>(null);
  const sunZenithMarkerRef = useRef<THREE.Group | null>(null);
  const moonMeshRef = useRef<THREE.Group | null>(null);
  const issMeshRef = useRef<THREE.Group | null>(null);
  const issOrbitLineRef = useRef<THREE.Line | null>(null);
  const auroraNorthRef = useRef<THREE.Mesh | null>(null);
  const auroraSouthRef = useRef<THREE.Mesh | null>(null);
  const primaryPinRef = useRef<THREE.Group | null>(null);
  const secondaryPinRef = useRef<THREE.Group | null>(null);
  const flightArcRef = useRef<THREE.Line | null>(null);

  // Camera Orbit Orientation
  const targetLatRef = useRef<number>(primaryLocation.lat);
  const targetLngRef = useRef<number>(primaryLocation.lng);
  const currentLatRef = useRef<number>(primaryLocation.lat);
  const currentLngRef = useRef<number>(primaryLocation.lng);

  // Camera Zoom Distance (min: 3.2, max: 8.5)
  const targetDistRef = useRef<number>(5.8);
  const currentDistRef = useRef<number>(5.8);

  // Expose Zoom and Reset APIs to parent page
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      targetDistRef.current = Math.max(3.2, targetDistRef.current - 0.7);
    },
    zoomOut: () => {
      targetDistRef.current = Math.min(8.5, targetDistRef.current + 0.7);
    },
    resetZoom: () => {
      targetDistRef.current = 5.8;
    },
  }));

  // Drag interaction state
  const isDraggingRef = useRef<boolean>(false);
  const prevPointerX = useRef<number>(0);
  const prevPointerY = useRef<number>(0);

  // Shortest-path angle normalization to smoothly pivot camera without wild multi-turn spinning
  const focusOnCoordinates = useCallback((lat: number, lng: number, distance = 5.8) => {
    targetLatRef.current = Math.max(-75, Math.min(75, lat));
    targetDistRef.current = distance;

    const current = currentLngRef.current;
    const diff = ((((lng - current) % 360) + 540) % 360) - 180;
    targetLngRef.current = current + diff;
  }, []);

  // Track previous inputs to ensure camera only pivots on actual user/selection changes
  const prevTargetRef = useRef<string | undefined>(undefined);
  const prevCityALatRef = useRef<number>(primaryLocation.lat);
  const prevCityALngRef = useRef<number>(primaryLocation.lng);
  const prevCityBLatRef = useRef<number>(secondaryLocation.lat);
  const prevCityBLngRef = useRef<number>(secondaryLocation.lng);

  // Synchronize camera focus ONLY when target or city coordinates explicitly change
  useEffect(() => {
    const targetChanged = prevTargetRef.current !== focusedTarget;
    const cityAChanged =
      prevCityALatRef.current !== primaryLocation.lat ||
      prevCityALngRef.current !== primaryLocation.lng;
    const cityBChanged =
      prevCityBLatRef.current !== secondaryLocation.lat ||
      prevCityBLngRef.current !== secondaryLocation.lng;

    prevTargetRef.current = focusedTarget;
    prevCityALatRef.current = primaryLocation.lat;
    prevCityALngRef.current = primaryLocation.lng;
    prevCityBLatRef.current = secondaryLocation.lat;
    prevCityBLngRef.current = secondaryLocation.lng;

    if (targetChanged || (focusedTarget === 'primary' && cityAChanged)) {
      if (focusedTarget === 'primary') {
        focusOnCoordinates(primaryLocation.lat, primaryLocation.lng, 4.8);
      }
    }
    if (targetChanged || (focusedTarget === 'secondary' && cityBChanged)) {
      if (focusedTarget === 'secondary') {
        focusOnCoordinates(secondaryLocation.lat, secondaryLocation.lng, 4.8);
      }
    }
    if (targetChanged && focusedTarget === 'sun' && sunCoords) {
      focusOnCoordinates(sunCoords.lat, sunCoords.lng, 5.2);
    }
    if (targetChanged && focusedTarget === 'moon' && moonState) {
      focusOnCoordinates(moonState.lat, moonState.lng, 5.2);
    }
    if (targetChanged && focusedTarget === 'iss' && issState) {
      focusOnCoordinates(issState.lat, issState.lng, 4.4);
    }
    if (targetChanged && focusedTarget === 'earth') {
      targetDistRef.current = 5.8;
    }
  }, [
    focusedTarget,
    primaryLocation.lat,
    primaryLocation.lng,
    secondaryLocation.lat,
    secondaryLocation.lng,
    sunCoords,
    moonState,
    issState,
    focusOnCoordinates,
  ]);

  // 1. Initial Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    // Elevate Earth slightly in the viewport so it never collides with the bottom floating dock
    const vOffset = Math.round(height * 0.12);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.setViewOffset(width, height, 0, vOffset, width, height);
    camera.position.set(0, 0, 5.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // --- Starfield in Space (Deep Space Stars) ---
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 25 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      transparent: true,
      opacity: 0.8,
    });
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // --- Ambient Light (Crucial: Illuminates the dark side so it is NEVER pitch black nothingness!) ---
    const ambientLight = new THREE.AmbientLight(0x475569, 0.78);
    scene.add(ambientLight);

    // --- Sun Directional Light (Physically illuminates day hemisphere) ---
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(sunLight.target);
    sunLightRef.current = sunLight;

    // --- Earth Sphere ---
    const earthRadius = 1.45;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthTex = createProceduralEarthTexture();
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.65,
      metalness: 0.08,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // --- Cloud Layer ---
    const cloudGeo = new THREE.SphereGeometry(earthRadius * 1.015, 64, 64);
    const cloudTex = createProceduralCloudTexture();
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudMesh);
    cloudMeshRef.current = cloudMesh;

    // --- Atmospheric Limb Glow (Soft Ice-Blue Halo from Solar Explorer #8cbaff) ---
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.05, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x8cbaff,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmoGeo, atmoMat));

    // --- Dashed Orbital Trajectory Ring for Moon (Directly inspired by .trajectory in attached CSS) ---
    const orbitPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      orbitPoints.push(
        new THREE.Vector3(Math.cos(angle) * 2.35, Math.sin(angle) * 0.25, Math.sin(angle) * 2.35)
      );
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x8cbaff,
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.35,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    scene.add(orbitLine);

    // --- Earth Polar Rotational Axis & Pole Indicators ---
    const axisPoints = [
      new THREE.Vector3(0, -earthRadius * 1.32, 0),
      new THREE.Vector3(0, earthRadius * 1.32, 0),
    ];
    const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisMat = new THREE.LineDashedMaterial({
      color: 0x8cbaff,
      dashSize: 0.08,
      gapSize: 0.06,
      transparent: true,
      opacity: 0.4,
    });
    const polarAxis = new THREE.Line(axisGeo, axisMat);
    polarAxis.computeLineDistances();
    scene.add(polarAxis);

    const northPoleSprite = createMarkerSprite('N. POLE', '#8cbaff', 'rgba(0, 0, 0, 0.75)');
    northPoleSprite.position.set(0, earthRadius * 1.38, 0);
    northPoleSprite.scale.set(0.38, 0.10, 1);
    scene.add(northPoleSprite);

    const southPoleSprite = createMarkerSprite('S. POLE', '#8cbaff', 'rgba(0, 0, 0, 0.75)');
    southPoleSprite.position.set(0, -earthRadius * 1.38, 0);
    southPoleSprite.scale.set(0.38, 0.10, 1);
    scene.add(southPoleSprite);

    // --- Aurora Borealis (North Polar Shimmering Glow Ring at +71° N) ---
    const auroraNorthGeo = new THREE.TorusGeometry(0.47, 0.04, 16, 64);
    const auroraNorthMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const auroraNorth = new THREE.Mesh(auroraNorthGeo, auroraNorthMat);
    auroraNorth.position.set(0, earthRadius * Math.sin((71 * Math.PI) / 180), 0);
    auroraNorth.rotation.x = Math.PI / 2;
    scene.add(auroraNorth);
    auroraNorthRef.current = auroraNorth;

    // --- Aurora Australis (South Polar Shimmering Glow Ring at -71° S) ---
    const auroraSouthGeo = new THREE.TorusGeometry(0.47, 0.04, 16, 64);
    const auroraSouthMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const auroraSouth = new THREE.Mesh(auroraSouthGeo, auroraSouthMat);
    auroraSouth.position.set(0, -earthRadius * Math.sin((71 * Math.PI) / 180), 0);
    auroraSouth.rotation.x = Math.PI / 2;
    scene.add(auroraSouth);
    auroraSouthRef.current = auroraSouth;

    // --- Real-Time 3D International Space Station (ISS) Model ---
    const issGroup = new THREE.Group();
    const issCoreMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.3,
    });
    const issCore = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 16), issCoreMat);
    issCore.rotation.z = Math.PI / 2;
    issGroup.add(issCore);

    const issTrussMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.4,
    });
    const issTruss = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 12), issTrussMat);
    issGroup.add(issTruss);

    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
    });
    const solarGeo = new THREE.BoxGeometry(0.045, 0.08, 0.003);

    const panel1 = new THREE.Mesh(solarGeo, solarMat);
    panel1.position.set(0, 0.075, 0);
    issGroup.add(panel1);

    const panel2 = new THREE.Mesh(solarGeo, solarMat);
    panel2.position.set(0, -0.075, 0);
    issGroup.add(panel2);

    const issSprite = createMarkerSprite('🛰️ ISS (418 km)', '#38bdf8', 'rgba(0, 0, 0, 0.85)');
    issSprite.position.set(0, 0.14, 0);
    issSprite.scale.set(0.55, 0.14, 1);
    issGroup.add(issSprite);

    scene.add(issGroup);
    issMeshRef.current = issGroup;

    // --- ISS Inclined Orbital Ring (51.64° orbital inclination) ---
    const issRadius = earthRadius * (1 + 418 / 6371);
    const issOrbitPoints: THREE.Vector3[] = [];
    const issSegments = 96;
    const incRad = (51.64 * Math.PI) / 180;
    for (let i = 0; i <= issSegments; i++) {
      const theta = (i / issSegments) * Math.PI * 2;
      const x = issRadius * Math.cos(theta);
      const y = issRadius * Math.sin(theta) * Math.sin(incRad);
      const z = issRadius * Math.sin(theta) * Math.cos(incRad);
      issOrbitPoints.push(new THREE.Vector3(x, y, z));
    }
    const issOrbitGeo = new THREE.BufferGeometry().setFromPoints(issOrbitPoints);
    const issOrbitMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.08,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.35,
    });
    const issOrbitLine = new THREE.Line(issOrbitGeo, issOrbitMat);
    issOrbitLine.computeLineDistances();
    scene.add(issOrbitLine);
    issOrbitLineRef.current = issOrbitLine;

    // --- Geodesic Flight Arc connecting Location A & Location B ---
    const flightArcMat = new THREE.LineDashedMaterial({
      color: 0xfea082,
      dashSize: 0.08,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.75,
    });
    const flightArc = new THREE.Line(new THREE.BufferGeometry(), flightArcMat);
    scene.add(flightArc);
    flightArcRef.current = flightArc;

    // --- Distant 3D Sun in Deep Cosmic Space (True Astronomical Perspective) ---
    const sunGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfffdf5 })
    );
    sunGroup.add(sunCore);

    // Radiant Solar Photosphere
    const sunPhotosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe4a0,
        transparent: true,
        opacity: 0.85,
        side: THREE.BackSide,
      })
    );
    sunGroup.add(sunPhotosphere);

    // Dynamic Corona
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(3.6, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xf39041,
        transparent: true,
        opacity: 0.45,
        side: THREE.BackSide,
      })
    );
    sunGroup.add(corona);

    // Outer Solar Flare Radiance
    const flare = new THREE.Mesh(
      new THREE.SphereGeometry(6.2, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff8a00,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
      })
    );
    sunGroup.add(flare);

    const sunSprite = createMarkerSprite('☀️ SUN (1.0 AU)', '#fea082', 'rgba(0, 0, 0, 0.85)');
    sunSprite.position.set(0, 3.2, 0);
    sunSprite.scale.set(1.6, 0.4, 1);
    sunGroup.add(sunSprite);

    scene.add(sunGroup);
    sunMeshRef.current = sunGroup;

    // --- Solar Zenith Surface Beacon (Subsolar Point: Where Sun is at 90° Overhead) ---
    const zenithGroup = new THREE.Group();
    const zenithCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    zenithGroup.add(zenithCore);

    const ringGeo1 = new THREE.RingGeometry(0.065, 0.085, 24);
    const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    zenithGroup.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(0.11, 0.13, 24);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    zenithGroup.add(ring2);

    const zenithSprite = createMarkerSprite('☀️ SOLAR NOON', '#f59e0b', 'rgba(0, 0, 0, 0.85)');
    zenithSprite.position.set(0, 0.18, 0);
    zenithSprite.scale.set(0.55, 0.14, 1);
    zenithGroup.add(zenithSprite);

    scene.add(zenithGroup);
    sunZenithMarkerRef.current = zenithGroup;

    // --- 3D Moon in Space ---
    const moonGroup = new THREE.Group();
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.8,
        metalness: 0.05,
      })
    );
    moonGroup.add(moonMesh);

    const moonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0x8cbaff,
        transparent: true,
        opacity: 0.28,
        side: THREE.BackSide,
      })
    );
    moonGroup.add(moonHalo);

    const moonSprite = createMarkerSprite('🌙 MOON', '#ffffff', 'rgba(0, 0, 0, 0.85)');
    moonSprite.position.set(0, 0.35, 0);
    moonGroup.add(moonSprite);

    scene.add(moonGroup);
    moonMeshRef.current = moonGroup;

    // --- Location Pin Factory ---
    const createPin = (color: number) => {
      const group = new THREE.Group();
      const markerGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color });
      group.add(new THREE.Mesh(markerGeo, markerMat));

      const ringGeo = new THREE.RingGeometry(0.065, 0.085, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      return group;
    };

    const primaryPin = createPin(0x38bdf8); // Sky Ice Pin
    const secondaryPin = createPin(0xfea082); // Starlight Gold Pin
    scene.add(primaryPin);
    scene.add(secondaryPin);
    primaryPinRef.current = primaryPin;
    secondaryPinRef.current = secondaryPin;

    // --- Wheel Event for Smooth Zooming ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.003;
      targetDistRef.current = Math.max(3.2, Math.min(8.5, targetDistRef.current + zoomDelta));
    };
    container.addEventListener('wheel', handleWheel, { passive: false });

    // --- Animation & Render Loop ---
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      currentLatRef.current += (targetLatRef.current - currentLatRef.current) * 0.07;
      currentLngRef.current += (targetLngRef.current - currentLngRef.current) * 0.07;
      currentDistRef.current += (targetDistRef.current - currentDistRef.current) * 0.08;

      if (isRotatingRef.current && !isDraggingRef.current) {
        targetLngRef.current += 0.07;
      }

      if (cloudMeshRef.current) {
        cloudMeshRef.current.rotation.y += 0.0004;
      }

      // Shimmering breathing glow for Aurora polar rings
      const timeSec = Date.now() * 0.0018;
      if (auroraNorthRef.current) {
        (auroraNorthRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.14 * Math.sin(timeSec);
        auroraNorthRef.current.rotation.z += 0.0008;
      }
      if (auroraSouthRef.current) {
        (auroraSouthRef.current.material as THREE.MeshBasicMaterial).opacity = 0.32 + 0.12 * Math.cos(timeSec);
        auroraSouthRef.current.rotation.z -= 0.0008;
      }

      const camPos = latLngToVector3(
        currentLatRef.current,
        currentLngRef.current,
        currentDistRef.current
      );
      camera.position.copy(camPos);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const vOffset = Math.round(h * 0.12);
      cameraRef.current.aspect = w / h;
      cameraRef.current.setViewOffset(w, h, 0, vOffset, w, h);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('wheel', handleWheel);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Synchronize Real-Time Sun, Moon & Location Positions
  useEffect(() => {
    const updatePositions = () => {
      const now = new Date();
      const sun = getSubsolarPoint(now);
      const moon = getSublunarPoint(now);

      setSunCoords(sun);
      setMoonState(moon);

      const earthRadius = 1.45;

      // Position Directional Sun Light far in deep space (True Astronomical Parallel Rays)
      const sunVec = latLngToVector3(sun.lat, sun.lng, 1);
      const sunCosmicDistance = 42;
      if (sunLightRef.current) {
        sunLightRef.current.position.set(
          sunVec.x * sunCosmicDistance,
          sunVec.y * sunCosmicDistance,
          sunVec.z * sunCosmicDistance
        );
      }

      // Position Distant 3D Sun in Deep Cosmic Space (42 units away in cosmic void)
      if (sunMeshRef.current) {
        sunMeshRef.current.position.set(
          sunVec.x * sunCosmicDistance,
          sunVec.y * sunCosmicDistance,
          sunVec.z * sunCosmicDistance
        );
      }

      // Position Solar Zenith Surface Beacon on Earth (Exact True Solar Noon point)
      if (sunZenithMarkerRef.current) {
        const zVec = latLngToVector3(sun.lat, sun.lng, earthRadius * 1.012);
        sunZenithMarkerRef.current.position.copy(zVec);
        sunZenithMarkerRef.current.lookAt(zVec.clone().multiplyScalar(2));
      }

      // Position 3D Moon Orb in space
      const moonVec = latLngToVector3(moon.lat, moon.lng, 1);
      if (moonMeshRef.current) {
        moonMeshRef.current.position.set(moonVec.x * 2.35, moonVec.y * 2.35, moonVec.z * 2.35);
      }

      // Position Real-Time 3D ISS in orbit
      const iss = getISSOrbitalPosition(now);
      setIssState(iss);
      if (issMeshRef.current) {
        const issAltitudeRadius = earthRadius * (1 + iss.altitudeKm / 6371);
        const issVec = latLngToVector3(iss.lat, iss.lng, issAltitudeRadius);
        issMeshRef.current.position.copy(issVec);
        issMeshRef.current.lookAt(issVec.clone().multiplyScalar(2));
      }

      // Position Primary and Secondary City Pins
      if (primaryPinRef.current) {
        const pVec = latLngToVector3(primaryLocation.lat, primaryLocation.lng, earthRadius * 1.012);
        primaryPinRef.current.position.copy(pVec);
        primaryPinRef.current.lookAt(pVec.clone().multiplyScalar(2));
      }
      if (secondaryPinRef.current) {
        const sVec = latLngToVector3(secondaryLocation.lat, secondaryLocation.lng, earthRadius * 1.012);
        secondaryPinRef.current.position.copy(sVec);
        secondaryPinRef.current.lookAt(sVec.clone().multiplyScalar(2));
      }

      // Update Geodesic Flight Arc between Location A and Location B
      if (flightArcRef.current) {
        flightArcRef.current.geometry.dispose();
        flightArcRef.current.geometry = createGreatCircleArc(
          primaryLocation.lat,
          primaryLocation.lng,
          secondaryLocation.lat,
          secondaryLocation.lng,
          earthRadius
        );
        flightArcRef.current.computeLineDistances();
      }
    };

    updatePositions();
    const interval = setInterval(updatePositions, 3000);
    return () => clearInterval(interval);
  }, [primaryLocation.lat, primaryLocation.lng, secondaryLocation.lat, secondaryLocation.lng]);

  // Pointer drag to orbit camera around Earth, Sun & Moon
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevPointerX.current = e.clientX;
    prevPointerY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevPointerX.current;
    const deltaY = e.clientY - prevPointerY.current;
    prevPointerX.current = e.clientX;
    prevPointerY.current = e.clientY;

    targetLngRef.current -= deltaX * 0.42;
    targetLatRef.current = Math.max(-75, Math.min(75, targetLatRef.current + deltaY * 0.32));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          isDraggingRef.current = false;
        }}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
      />
    </div>
  );
});

export default GlobeCanvas;
