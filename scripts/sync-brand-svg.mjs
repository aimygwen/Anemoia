#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "assets", "branding.svg");
const uiPath = path.join(root, "ui.js");

const svg = fs.readFileSync(svgPath, "utf8");
const inner = svg
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim()
    .split("\n")
    .map((line) => `        ${line}`)
    .join("\n");

const brandSvg = `    // 1B. INLINE BRAND LOGO SVG (light = accent: face, bow, bubble · dark = primary: hair, ears)
    const BRAND_SVG = \`<svg viewBox="0 0 2000 2000" aria-hidden="true">
${inner}
    </svg>\`;`;

let ui = fs.readFileSync(uiPath, "utf8");
const start = ui.indexOf("    // 1B. INLINE BRAND LOGO");
const end = ui.indexOf("\n\n    // Site sections");
if (start === -1 || end === -1 || end <= start) {
    console.error("Could not find BRAND_SVG anchors in ui.js");
    process.exit(1);
}
ui = ui.slice(0, start) + brandSvg + ui.slice(end);
fs.writeFileSync(uiPath, ui);
console.log("Synced BRAND_SVG from assets/branding.svg");
