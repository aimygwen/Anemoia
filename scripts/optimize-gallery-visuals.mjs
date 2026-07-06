#!/usr/bin/env node
/**
 * Resize gallery masters and export WebP + JPEG display variants.
 * Reads visuals/img*.jpg → writes visuals/display/img*.{webp,jpg}
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcDir = path.join(root, "visuals");
const outDir = path.join(root, "visuals", "display");

const MAX_EDGE = 1600;
const WEBP_QUALITY = 82;
const JPEG_QUALITY = 82;

const sources = fs
    .readdirSync(srcDir)
    .filter((name) => /^img\d+\.jpg$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (!sources.length) {
    console.error("No visuals/img*.jpg files found.");
    process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const manifest = [];
let totalSrc = 0;
let totalOut = 0;

for (const file of sources) {
    const id = file.match(/img(\d+)/i)[1];
    const srcPath = path.join(srcDir, file);
    const base = `img${id}`;
    totalSrc += fs.statSync(srcPath).size;

    const resized = sharp(srcPath)
        .rotate()
        .resize(MAX_EDGE, MAX_EDGE, {
            fit: "inside",
            withoutEnlargement: true
        });

    const buffer = await resized.toBuffer();
    const meta = await sharp(buffer).metadata();
    const sized = sharp(buffer);

    const webpPath = path.join(outDir, `${base}.webp`);
    const jpgPath = path.join(outDir, `${base}.jpg`);

    await sized.clone().webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(webpPath);
    await sized.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(jpgPath);

    totalOut += fs.statSync(webpPath).size + fs.statSync(jpgPath).size;

    manifest.push({
        id: Number(id),
        width: meta.width,
        height: meta.height,
        webp: `visuals/display/${base}.webp`,
        jpg: `visuals/display/${base}.jpg`
    });

    console.log(
        `${base}: ${(fs.statSync(srcPath).size / 1024 / 1024).toFixed(1)}MB → ` +
        `webp ${(fs.statSync(webpPath).size / 1024).toFixed(0)}KB, ` +
        `jpg ${(fs.statSync(jpgPath).size / 1024).toFixed(0)}KB (${meta.width}×${meta.height})`
    );
}

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(
    `\nOptimized ${manifest.length} images. ` +
    `${(totalSrc / 1024 / 1024).toFixed(1)}MB source → ${(totalOut / 1024 / 1024).toFixed(1)}MB display variants.`
);
