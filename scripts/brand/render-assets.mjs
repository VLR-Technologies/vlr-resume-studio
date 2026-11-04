/* global Image, document */
import { Buffer } from 'node:buffer';
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage();
const exports = [
  ['logo-light', 1568, 416],
  ['logo-dark', 1568, 416],
  ['emblem-light', 1024, 1536],
  ['emblem-dark', 1024, 1536],
  ['icon', 512, 512],
  ['icon-light', 512, 512],
  ['social-preview', 1200, 630],
];
for (const [name, width, height] of exports) {
  const source = await readFile(`public/brand/${name}.svg`, 'utf8');
  for (const format of ['png', 'webp']) {
    const data = await page.evaluate(
      async ({ source, width, height, format }) => {
        const img = new Image();
        img.src =
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        return canvas.toDataURL(`image/${format}`, 0.95).split(',')[1];
      },
      { source, width, height, format },
    );
    await writeFile(
      `public/brand/${name}.${format}`,
      Buffer.from(data, 'base64'),
    );
  }
}
for (const [name, size] of [
  ['favicon-16', 16],
  ['favicon-24', 24],
  ['favicon-32', 32],
  ['favicon-48', 48],
  ['favicon-128', 128],
  ['apple-touch-icon', 180],
  ['app-icon-192', 192],
  ['app-icon-512', 512],
  ['app-icon-maskable', 512],
]) {
  const source = await readFile('public/brand/icon.svg', 'utf8');
  const data = await page.evaluate(
    async ({ source, size, name }) => {
      const img = new Image();
      img.src =
        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
      await img.decode();
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (name.includes('maskable')) {
        ctx.fillStyle = '#111A2E';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, size * 0.12, size * 0.12, size * 0.76, size * 0.76);
      } else ctx.drawImage(img, 0, 0, size, size);
      return c.toDataURL('image/png').split(',')[1];
    },
    { source, size, name },
  );
  await writeFile(`public/brand/${name}.png`, Buffer.from(data, 'base64'));
}
const emblem = await readFile('public/brand/emblem-light.svg', 'utf8');
const icon = await readFile('public/brand/icon.svg', 'utf8');
const dark = await readFile('public/brand/logo-dark.svg', 'utf8');
const light = await readFile('public/brand/logo-light.svg', 'utf8');
const uri = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
await page.setViewportSize({ width: 1200, height: 780 });
await page.setContent(
  `<body style="margin:0;background:#F8F7F4;font-family:Arial;color:#111A2E"><div style="padding:48px"><h1 style="font-size:18px;font-weight:500;letter-spacing:2px">PERFECT TIE / IDENTITY & OPTICAL SCALE</h1><div style="display:flex;gap:40px;margin:48px 0"><img src="${uri(light)}" width="392" height="104"><div style="background:#111A2E;padding:24px;border-radius:16px"><img src="${uri(dark)}" width="392" height="104"></div></div><div style="display:flex;gap:64px;align-items:end;padding:36px;background:white;border-radius:16px">${[16, 24, 32, 48, 128].map((size) => `<div style="text-align:center"><img src="${uri(icon)}" width="${size}" height="${size}"><p style="font-size:13px">${size} px</p></div>`).join('')}<img src="${uri(emblem)}" height="180"></div><p style="margin-top:38px;color:#35445E">Folded Silk — midnight navy · warm ivory · champagne gold</p></div></body>`,
);
await page
  .locator('img')
  .evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
await page.screenshot({ path: 'docs/brand/perfect-tie/scaling-proof.png' });
await browser.close();
