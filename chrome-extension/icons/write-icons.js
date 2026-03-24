#!/usr/bin/env node
/**
 * Writes SilkWeb icon PNGs. Run: node write-icons.js
 * No dependencies required.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const body = Buffer.concat([t, data]);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(body));
  return Buffer.concat([l, body, cr]);
}

function makePNG(size) {
  const cx = size/2, cy = size/2, R = size*0.42, ir = Math.max(1,size*0.08);
  const raw = Buffer.alloc(size*(size*4+1));
  for (let y = 0; y < size; y++) {
    const row = y*(size*4+1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const px = row+1+x*4;
      const dx=x-cx+.5, dy=y-cy+.5, d=Math.sqrt(dx*dx+dy*dy);
      let a=0;
      if (d<=ir) a=255;
      else if (Math.abs(d-R)<=Math.max(1,size*.03)) a=230;
      else if (Math.abs(d-R*.66)<=Math.max(.7,size*.015)) a=170;
      else if (Math.abs(d-R*.33)<=Math.max(.7,size*.015)) a=170;
      else if (d<=R && d>ir) {
        for (let s=0;s<8;s++){
          const sa=(s/8)*Math.PI*2;
          const pd=Math.abs(dx*Math.sin(sa)-dy*Math.cos(sa));
          if(pd<=Math.max(.5,size*.012)&&(dx*Math.cos(sa)+dy*Math.sin(sa))>=0){a=120;break;}
        }
      }
      if(a>0){raw[px]=99;raw[px+1]=102;raw[px+2]=241;raw[px+3]=a;}
    }
  }
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4);
  ihdr[8]=8; ihdr[9]=6;
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]);
}

const dir = __dirname;
[16,48,128].forEach(s=>{
  const p = path.join(dir,`icon${s}.png`);
  fs.writeFileSync(p, makePNG(s));
  console.log(`icon${s}.png written`);
});
