// Optional dev helper for file:// canvas testing. Homepage loads JPGs directly —
// run `scripts/optimize-homepage-images.sh` after updating thumbnail sources.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = {
    lowpoly: './assets/thumbnails/lowpoly.jpg',
    artwork: './assets/thumbnails/artwork.jpg',
    tapes: './assets/thumbnails/tapes.jpg',
    insights: './assets/thumbnails/insights.jpg'
};

const output = {};

for (const [key, relativePath] of Object.entries(files)) {
    const filePath = path.resolve(__dirname, relativePath);
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        const base64 = data.toString('base64');
        output[key] = `data:image/jpeg;base64,${base64}`;
        console.log(`Converted ${relativePath} (${data.length} bytes) to Base64`);
    } else {
        console.error(`File not found: ${filePath}`);
    }
}

const jsContent = `// Optional Base64 thumbnails for local file:// dev only
window.base64Thumbnails = ${JSON.stringify(output, null, 2)};
`;

fs.writeFileSync(path.resolve(__dirname, './assets/thumbnails/base64-thumbnails.js'), jsContent);
console.log('Wrote assets/thumbnails/base64-thumbnails.js (not loaded on homepage by default)');
