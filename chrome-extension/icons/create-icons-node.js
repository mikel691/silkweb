#!/usr/bin/env node
/**
 * Generate SilkWeb extension icons using pure Node.js (no dependencies).
 * Creates minimal but valid PNG files with a purple circle design.
 *
 * Usage: node create-icons-node.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size) {
  const center = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.08;

  // Create RGBA pixel data
  const pixels = Buffer.alloc(size * size * 4, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      // Purple color: #6366f1
      const r = 99, g = 102, b = 241;

      // Center dot
      if (dist <= innerR) {
        pixels[idx] = r;
        pixels[idx+1] = g;
        pixels[idx+2] = b;
        pixels[idx+3] = 255;
        continue;
      }

      // Outer ring
      const ringWidth = Math.max(1, size * 0.03);
      if (Math.abs(dist - outerR) <= ringWidth) {
        pixels[idx] = r;
        pixels[idx+1] = g;
        pixels[idx+2] = b;
        pixels[idx+3] = 230;
        continue;
      }

      // Middle ring
      const midR = outerR * 0.66;
      if (Math.abs(dist - midR) <= ringWidth * 0.7) {
        pixels[idx] = r;
        pixels[idx+1] = g;
        pixels[idx+2] = b;
        pixels[idx+3] = 180;
        continue;
      }

      // Inner ring
      const innerRing = outerR * 0.33;
      if (Math.abs(dist - innerRing) <= ringWidth * 0.7) {
        pixels[idx] = r;
        pixels[idx+1] = g;
        pixels[idx+2] = b;
        pixels[idx+3] = 180;
        continue;
      }

      // Spokes (8 directions)
      if (dist <= outerR && dist > innerR) {
        const angle = Math.atan2(dy, dx);
        const spokeWidth = Math.max(0.5, size * 0.012);
        let onSpoke = false;
        for (let s = 0; s < 8; s++) {
          const spokeAngle = (s / 8) * Math.PI * 2;
          // Distance from point to spoke line
          const perpDist = Math.abs(
            dx * Math.sin(spokeAngle) - dy * Math.cos(spokeAngle)
          );
          if (perpDist <= spokeWidth) {
            // Check we're on the correct side
            const dotProd = dx * Math.cos(spokeAngle) + dy * Math.sin(spokeAngle);
            if (dotProd >= 0) {
              onSpoke = true;
              break;
            }
          }
        }
        if (onSpoke) {
          pixels[idx] = r;
          pixels[idx+1] = g;
          pixels[idx+2] = b;
          pixels[idx+3] = 130;
          continue;
        }
      }
    }
  }

  // Encode as PNG
  // Raw image data with filter byte (0 = None) per row
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rawData[y * (size * 4 + 1)] = 0; // filter: None
    pixels.copy(rawData, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(rawData);

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeB, data]);
    const crc = crc32(body);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, body, crcB]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);   // width
  ihdr.writeUInt32BE(size, 4);   // height
  ihdr[8] = 8;                   // bit depth
  ihdr[9] = 6;                   // color type: RGBA
  ihdr[10] = 0;                  // compression
  ihdr[11] = 0;                  // filter
  ihdr[12] = 0;                  // interlace

  const chunks = [
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat(chunks);
}

// CRC32 implementation
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate icons
const dir = __dirname;
[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  const outPath = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${outPath} (${png.length} bytes)`);
});

console.log('All icons generated!');
