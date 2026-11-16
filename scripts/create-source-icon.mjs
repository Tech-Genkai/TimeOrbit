import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

export function generateIconPng(width = 1024, height = 1024) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside outer planetary circle
      if (dist <= maxR) {
        // Deep space cosmic base
        const normDist = dist / maxR;
        let r = 10 + 20 * (1 - normDist);
        let g = 18 + 50 * (1 - normDist);
        let b = 35 + 90 * (1 - normDist);
        let a = 255;

        // Inner glowing core sphere
        const innerR = maxR * 0.55;
        if (dist <= innerR) {
          const coreNorm = 1 - (dist / innerR);
          // Planetary light (cyan-blue neon glow)
          r = Math.min(255, r + 20 + 60 * coreNorm);
          g = Math.min(255, g + 80 + 140 * coreNorm);
          b = Math.min(255, b + 140 + 115 * coreNorm);
        }

        // Orbital ring tilt: equation of rotated ellipse (dy*cos - dx*sin)^2 / a^2 + ...
        // An elliptical tilted orbit ring around the sphere
        const angle = -0.45; // ~25 deg tilt
        const rotX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotY = dx * Math.sin(angle) + dy * Math.cos(angle);
        const ringDist = Math.sqrt((rotX * 0.5) ** 2 + (rotY * 1.6) ** 2);
        const ringRadius = maxR * 0.72;
        const ringThickness = maxR * 0.055;
        const ringDiff = Math.abs(ringDist - ringRadius);

        if (ringDiff < ringThickness) {
          const ringIntensity = 1 - (ringDiff / ringThickness);
          r = Math.min(255, r + 100 * ringIntensity);
          g = Math.min(255, g + 230 * ringIntensity);
          b = Math.min(255, b + 255 * ringIntensity);
        }

        rawData[px] = Math.floor(r);
        rawData[px + 1] = Math.floor(g);
        rawData[px + 2] = Math.floor(b);
        rawData[px + 3] = a;
      } else {
        // Transparent outside
        rawData[px] = 0;
        rawData[px + 1] = 0;
        rawData[px + 2] = 0;
        rawData[px + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrType = Buffer.from('IHDR');
  const ihdrCrcBuf = Buffer.concat([ihdrType, ihdrData]);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrCrcBuf), 0);
  const ihdrChunk = Buffer.concat([Buffer.from([0, 0, 0, 13]), ihdrType, ihdrData, ihdrCrc]);

  const idatType = Buffer.from('IDAT');
  const idatCrcBuf = Buffer.concat([idatType, compressed]);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatCrcBuf), 0);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idatChunk = Buffer.concat([idatLen, idatType, compressed, idatCrc]);

  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);
  const iendChunk = Buffer.concat([Buffer.from([0, 0, 0, 0]), iendType, iendCrc]);

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const iconBuffer = generateIconPng(1024, 1024);
fs.writeFileSync(path.resolve(process.cwd(), 'app-icon.png'), iconBuffer);
console.log('Successfully generated app-icon.png (size: ' + iconBuffer.length + ' bytes)');
