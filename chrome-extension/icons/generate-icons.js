/**
 * SilkWeb Icon Generator
 * Run with: node generate-icons.js
 *
 * Generates 16x16, 48x48, and 128x128 PNG icons using a spider web design.
 * Uses Node.js canvas (npm install canvas) or can be run in a browser console.
 *
 * Alternative: Run generate-icons.html in a browser to download the icons.
 */

// If running in Node.js with 'canvas' package:
// const { createCanvas } = require('canvas');
// const fs = require('fs');

function drawSpiderWeb(ctx, size) {
  const center = size / 2;
  const radius = size * 0.42;
  const purple = '#6366f1';

  ctx.clearRect(0, 0, size, size);

  // Radial lines
  const spokes = 8;
  ctx.strokeStyle = purple;
  ctx.lineWidth = Math.max(1, size * 0.015);
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + Math.cos(angle) * radius,
      center + Math.sin(angle) * radius
    );
    ctx.stroke();
  }

  // Concentric rings
  const rings = 3;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1, size * 0.02);
  for (let r = 1; r <= rings; r++) {
    const ringRadius = (radius / rings) * r;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2;
      const x = center + Math.cos(angle) * ringRadius;
      const y = center + Math.sin(angle) * ringRadius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Center dot
  ctx.globalAlpha = 1;
  ctx.fillStyle = purple;
  ctx.beginPath();
  ctx.arc(center, center, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = purple;
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();
}

// Browser usage: paste this in console
function generateInBrowser() {
  [16, 48, 128].forEach(size => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    drawSpiderWeb(ctx, size);

    const link = document.createElement('a');
    link.download = `icon${size}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

// To use: open generate-icons.html in browser, or call generateInBrowser() in console
if (typeof module !== 'undefined') {
  module.exports = { drawSpiderWeb, generateInBrowser };
}
