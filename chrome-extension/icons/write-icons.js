const fs = require('fs');

function createIcon(size) {
  // Create a simple PNG with white spider web on transparent background
  // Using raw PNG format
  
  const canvas = Buffer.alloc(size * size * 4, 0); // RGBA
  
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  
  function setPixel(x, y, r, g, b, a) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < size && y >= 0 && y < size) {
      const idx = (y * size + x) * 4;
      // Alpha blend
      const srcA = a / 255;
      canvas[idx] = Math.min(255, canvas[idx] + r * srcA);
      canvas[idx+1] = Math.min(255, canvas[idx+1] + g * srcA);
      canvas[idx+2] = Math.min(255, canvas[idx+2] + b * srcA);
      canvas[idx+3] = Math.min(255, canvas[idx+3] + a);
    }
  }
  
  function drawLine(x0, y0, x1, y1, r, g, b, a, thickness) {
    const dist = Math.sqrt((x1-x0)**2 + (y1-y0)**2);
    const steps = Math.max(dist * 2, 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      for (let dx = -thickness; dx <= thickness; dx++) {
        for (let dy = -thickness; dy <= thickness; dy++) {
          if (dx*dx + dy*dy <= thickness*thickness) {
            setPixel(x + dx, y + dy, r, g, b, a);
          }
        }
      }
    }
  }
  
  const thick = Math.max(1, size / 32);
  
  // Radial lines (8 spokes) - white
  for (let angle = 0; angle < 360; angle += 45) {
    const rad = angle * Math.PI / 180;
    const ex = cx + r * Math.cos(rad);
    const ey = cy + r * Math.sin(rad);
    drawLine(cx, cy, ex, ey, 255, 255, 255, 220, thick);
  }
  
  // Concentric rings (3 rings) - white
  for (let ring = 1; ring <= 3; ring++) {
    const ringR = r * ring / 3.5;
    const segments = 48;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      drawLine(
        cx + ringR * Math.cos(a1), cy + ringR * Math.sin(a1),
        cx + ringR * Math.cos(a2), cy + ringR * Math.sin(a2),
        255, 255, 255, 180, thick * 0.8
      );
    }
  }
  
  // Center dot - bright white
  for (let dx = -thick*1.5; dx <= thick*1.5; dx++) {
    for (let dy = -thick*1.5; dy <= thick*1.5; dy++) {
      if (dx*dx + dy*dy <= (thick*1.5)**2) {
        setPixel(cx + dx, cy + dy, 255, 255, 255, 255);
      }
    }
  }
  
  // Encode as PNG
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let r = n;
      for (let k = 0; k < 8; k++) r = r & 1 ? 0xedb88320 ^ (r >>> 1) : r >>> 1;
      table[n] = r;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }
  
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  
  // Raw image data with filter bytes
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    canvas.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw);
  
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
  
  return png;
}

fs.writeFileSync('icon16.png', createIcon(16));
fs.writeFileSync('icon48.png', createIcon(48));
fs.writeFileSync('icon128.png', createIcon(128));
console.log('White spider web icons generated');
