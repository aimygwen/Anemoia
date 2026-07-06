#!/usr/bin/env node
/**
 * Builds lowpoly/catalog.json from PNG files + catalog.overrides.json.
 *
 * Auto-detects color variants:  boxx.png + boxx_blue.png  OR  only boxx_blue.png siblings.
 * Manual fields (name, description, assetNumber, extensionPack) live in overrides.
 *
 *   node scripts/build-lowpoly-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "lowpoly", "hytale");
const OVERRIDES_PATH = path.join(ROOT, "lowpoly", "catalog.overrides.json");
const CATALOG_PATH = path.join(ROOT, "lowpoly", "catalog.json");
const CATALOG_JS_PATH = path.join(ROOT, "lowpoly-catalog-data.js");

const CATEGORY_FOLDERS = [
    "Furnishings",
    "Battlegear",
    "Cosmetics",
    "Collectibles",
    "Consumables",
    "Creatures",
    "Misc",
];

const FOLDER_TO_CATEGORY = {
    Furnishings: "furnishings",
    Battlegear: "battlegear",
    Cosmetics: "cosmetics",
    Collectibles: "collectibles",
    Consumables: "consumables",
    Creatures: "misc",
    Misc: "misc",
};

const CATEGORY_ORDER = [
    "furnishings",
    "battlegear",
    "cosmetics",
    "collectibles",
    "consumables",
    "misc",
];

const COLOR_SWATCHES = {
    default: "#D4D4D8",
    white: "#F5F5F4",
    ivory: "#F0EBE3",
    palewood: "#C4A882",
    pale: "#E8E4DC",
    black: "#27272A",
    gray: "#A1A1AA",
    grey: "#A1A1AA",
    red: "#EF4444",
    rose: "#FF6B9D",
    pink: "#FF7EB6",
    peach: "#FFB088",
    orange: "#F97316",
    ember: "#E85D04",
    yellow: "#FBBF24",
    gold: "#EAB308",
    green: "#22C55E",
    mint: "#6EE7B7",
    teal: "#2DD4BF",
    cyan: "#06B6D4",
    blue: "#3B82F6",
    azureblue: "#38BDF8",
    indigo: "#6366F1",
    purple: "#9B7EDE",
    lilac: "#CFA2FF",
    lavender: "#B794F4",
    violet: "#8B5CF6",
    brown: "#92400E",
    stargazer: "#9B7EDE",
    heartwrecker: "#FF6B9D",
    ethereal: "#A5F3FC",
    aether: "#7DD3FC",
    ashen: "#9CA3AF",
    blossom: "#FDA4AF",
    boreal: "#5EEAD4",
    cascade: "#67E8F9",
    everglade: "#4ADE80",
    hearthome: "#FB923C",
    monochrome: "#A1A1AA",
    classic: "#D4D4D8",
    cherryrose: "#FB7185",
    mintydreams: "#5EEAD4",
    sunkissedcitron: "#FDE047",
    sweet: "#F9A8D4",
    blushing: "#FCA5A5",
    bunnybeatz: "#FF7EB6",
};

const DEFAULT_EXTENSIONS = [
    {
        id: "crossroads",
        name: "Crossroads",
        category: "furnishings",
        image: "lowpoly/hytale/Thumbnails/crossroads.png",
        logo: "lowpoly/hytale/Thumbnails/crossroads_logo.png",
        images: ["lowpoly/hytale/Thumbnails/crossroads.png"],
        description:
            "My first modpack! A beautiful, serene integration of light-dappled forest biomes, customized wooden paths, frontier crossroads signals, and cozy lighting assets designed to make your Hytale journeys feel magical.",
        cardDescription:
            "Forest biomes, wooden paths, crossroads signals, and cozy lighting for magical journeys.",
        size: "normal",
        downloadAvailable: false,
        downloadUrl: "",
        curseforgeUrl: "",
    },
    {
        id: "timeless-tekk",
        name: "Timeless Tekk",
        category: "furnishings",
        image: "lowpoly/hytale/Thumbnails/timelesstekk.jpg",
        logo: "lowpoly/hytale/Thumbnails/timeless_tekk_logo.png",
        images: ["lowpoly/hytale/Thumbnails/timelesstekk.jpg"],
        description:
            "A techno-magical industrial expansion introducing steam-driven boilers, cog networks, copper tubing, and decorative factory blockouts.",
        cardDescription: "Steam boilers, cog networks, copper tubing, and decorative factory blockouts.",
        size: "normal",
        downloadAvailable: false,
        downloadUrl: "",
        curseforgeUrl: "",
    },
    {
        id: "plushies",
        name: "Plushies!!",
        category: "collectibles",
        image: "lowpoly/hytale/Thumbnails/plushies.png",
        logo: "lowpoly/hytale/Thumbnails/plushies_logo.png",
        images: ["lowpoly/hytale/Thumbnails/plushies.png"],
        description:
            "A collection of adorable, cuddle-ready lowpoly plush toys of legendary Hytale beasts, elementals, and cute forest critters.",
        cardDescription: "Cuddle-ready plush toys of Hytale beasts, elementals, and forest critters.",
        size: "normal",
        downloadAvailable: false,
        downloadUrl: "",
        curseforgeUrl: "",
    },
    {
        id: "dress-up",
        name: "Dress Up!",
        category: "cosmetics",
        image: "lowpoly/hytale/Thumbnails/dressup.jpg",
        images: ["lowpoly/hytale/Thumbnails/dressup.jpg"],
        description:
            "A wardrobe expansion of mix-and-match outfits, accessories, and flair — from stage-ready looks to cozy streetwear sets.",
        cardDescription: "Mix-and-match outfits, accessories, and flair for every adventure.",
        size: "normal",
        downloadAvailable: false,
        downloadUrl: "",
        curseforgeUrl: "",
    },
];

function stemFromPath(filePath) {
    return path.basename(filePath, ".png");
}

function humanizeToken(token) {
    if (!token) return "";
    if (/^\d+$/.test(token)) return `#${token}`;
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function humanizeStem(stem) {
    return stem
        .split("_")
        .filter(Boolean)
        .map(humanizeToken)
        .join(" ");
}

function swatchForColor(colorId) {
    const key = colorId.toLowerCase().replace(/[\s-]+/g, "");
    return COLOR_SWATCHES[key] || COLOR_SWATCHES.default;
}

const DEFAULT_STANDALONE_PREFIXES = ["wings", "plushies", "arcade"];

function getStandalonePrefix(stem, standalonePrefixes) {
    if (!stem.includes("_")) return null;
    const base = stem.slice(0, stem.lastIndexOf("_"));
    return standalonePrefixes.has(base) ? base : null;
}

function groupStemsInCategory(entries, standalonePrefixes = new Set(DEFAULT_STANDALONE_PREFIXES)) {
    const stems = entries.map((e) => e.stem);
    const stemSet = new Set(stems);
    const pathByStem = new Map(entries.map((e) => [e.stem, e.path]));
    const assigned = new Set();
    const groups = [];

    for (const stem of [...stems].sort()) {
        if (assigned.has(stem)) continue;

        if (getStandalonePrefix(stem, standalonePrefixes)) {
            groups.push({ id: stem, baseStem: stem, basePath: pathByStem.get(stem), variants: [] });
            assigned.add(stem);
            continue;
        }

        const children = stems.filter((s) => s.startsWith(`${stem}_`) && s !== stem);
        const childVariants = children.filter((s) => !getStandalonePrefix(s, standalonePrefixes));

        if (childVariants.length > 0 && !standalonePrefixes.has(stem)) {
            groups.push({
                id: stem,
                baseStem: stem,
                basePath: pathByStem.get(stem) || null,
                variants: childVariants.map((s) => ({ stem: s, path: pathByStem.get(s) })),
            });
            assigned.add(stem);
            childVariants.forEach((c) => assigned.add(c));
            children.filter((s) => getStandalonePrefix(s, standalonePrefixes)).forEach((s) => {
                if (!assigned.has(s)) {
                    groups.push({ id: s, baseStem: s, basePath: pathByStem.get(s), variants: [] });
                    assigned.add(s);
                }
            });
            continue;
        }

        if (!stem.includes("_")) {
            groups.push({ id: stem, baseStem: stem, basePath: pathByStem.get(stem), variants: [] });
            assigned.add(stem);
            continue;
        }

        const base = stem.slice(0, stem.lastIndexOf("_"));
        if (standalonePrefixes.has(base)) {
            groups.push({ id: stem, baseStem: stem, basePath: pathByStem.get(stem), variants: [] });
            assigned.add(stem);
            continue;
        }

        const siblings = stems.filter((s) => s === base || s.startsWith(`${base}_`));
        if (siblings.length >= 2) {
            groups.push({
                id: base,
                baseStem: base,
                basePath: pathByStem.get(base) || null,
                variants: siblings.filter((s) => s !== base).map((s) => ({ stem: s, path: pathByStem.get(s) })),
            });
            siblings.forEach((s) => assigned.add(s));
            continue;
        }

        groups.push({ id: stem, baseStem: stem, basePath: pathByStem.get(stem), variants: [] });
        assigned.add(stem);
    }

    return groups;
}

/** Merge standalone PNGs into another item's color variants (via overrides attachTo). */
function applyVariantAttachments(groups, entries, itemOverrides = {}) {
    const pathByStem = new Map(entries.map((e) => [e.stem, e.path]));
    const removeIds = new Set();

    for (const [stem, ov] of Object.entries(itemOverrides)) {
        if (!ov.attachTo) continue;

        const parent = groups.find((g) => g.id === ov.attachTo);
        const path = pathByStem.get(stem);
        if (!path) continue;
        if (!parent) {
            console.warn(`[Lowpoly catalog] attachTo "${ov.attachTo}" for "${stem}" — parent not found in category`);
            continue;
        }

        parent.variants.push({
            stem,
            path,
            variantId: ov.variantId || stem,
            variantLabel: ov.variantLabel || humanizeStem(ov.variantId || stem),
        });
        removeIds.add(stem);
    }

    return groups.filter((g) => !removeIds.has(g.id));
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_PATH)) {
        return { items: {}, extensions: {}, standalonePrefixes: DEFAULT_STANDALONE_PREFIXES, itemOrder: [], preferredDefaultVariants: DEFAULT_PREFERRED_VARIANTS };
    }
    try {
        const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8"));
        const prefixes = raw.standalonePrefixes || raw._config?.standalonePrefixes || DEFAULT_STANDALONE_PREFIXES;
        return {
            items: raw.items || {},
            extensions: raw.extensions || {},
            standalonePrefixes: new Set(prefixes),
            itemOrder: Array.isArray(raw.itemOrder) ? raw.itemOrder : [],
            preferredDefaultVariants: Array.isArray(raw.preferredDefaultVariants)
                ? raw.preferredDefaultVariants
                : DEFAULT_PREFERRED_VARIANTS,
        };
    } catch (err) {
        console.warn("Could not parse catalog.overrides.json:", err.message);
        return { items: {}, extensions: {}, standalonePrefixes: new Set(DEFAULT_STANDALONE_PREFIXES), itemOrder: [], preferredDefaultVariants: DEFAULT_PREFERRED_VARIANTS };
    }
}

function mergeExtension(base, override = {}) {
    return {
        id: override.id || base.id,
        name: override.name ?? base.name,
        category: override.category ?? base.category,
        image: override.image ?? base.image,
        logo: override.logo ?? base.logo,
        images: override.images ?? base.images,
        description: override.description ?? base.description ?? "",
        cardDescription: override.cardDescription ?? base.cardDescription ?? "",
        size: override.size ?? base.size ?? "normal",
        downloadAvailable: override.downloadAvailable ?? base.downloadAvailable ?? false,
        downloadUrl: override.downloadUrl ?? base.downloadUrl ?? "",
        curseforgeUrl: override.curseforgeUrl ?? base.curseforgeUrl ?? "",
    };
}

const DEFAULT_PREFERRED_VARIANTS = ["palewood", "purple", "ethereal", "lavender"];

function variantMatchesPreferred(variant, preferred) {
    const key = preferred.toLowerCase();
    if (variant.id.toLowerCase() === key) return true;
    return variant.image.toLowerCase().includes(`_${key}.png`);
}

function resolveDefaultVariant(variants, override = {}, preferredVariants = DEFAULT_PREFERRED_VARIANTS) {
    if (!variants?.length) return null;

    if (override.defaultVariant) {
        const explicit = variants.find((v) => v.id === override.defaultVariant);
        if (explicit) return explicit.id;
    }

    for (const preferred of preferredVariants) {
        const match = variants.find((v) => variantMatchesPreferred(v, preferred));
        if (match) return match.id;
    }

    return variants[0].id;
}

function buildItem(group, category, override = {}, assetNumberAuto, preferredVariants = DEFAULT_PREFERRED_VARIANTS) {
    const variants = [];

    if (group.basePath && group.variants.length > 0) {
        variants.push({
            id: "default",
            label: override.defaultVariantLabel || "Default",
            image: group.basePath,
            swatch: override.defaultSwatch || swatchForColor("default"),
        });
        for (const variant of [...group.variants].sort((a, b) => a.stem.localeCompare(b.stem))) {
            const colorId = variant.variantId || variant.stem.slice(group.baseStem.length + 1);
            variants.push({
                id: colorId,
                label: variant.variantLabel || humanizeStem(colorId),
                image: variant.path,
                swatch: swatchForColor(colorId),
            });
        }
    } else if (group.variants.length > 0) {
        for (const [index, variant] of [...group.variants].sort((a, b) => a.stem.localeCompare(b.stem)).entries()) {
            const colorId = variant.stem.slice(group.baseStem.length + 1);
            variants.push({
                id: index === 0 ? "default" : colorId,
                label: humanizeStem(colorId),
                image: variant.path,
                swatch: swatchForColor(colorId),
            });
        }
    }

    const primaryImage = group.basePath || variants[0]?.image || null;
    const defaultVariantId = resolveDefaultVariant(variants, override, preferredVariants);
    const previewVariant = defaultVariantId ? variants.find((v) => v.id === defaultVariantId) : null;

    const autoName = humanizeStem(group.baseStem);
    const assetNumber = override.assetNumber ?? assetNumberAuto;

    return {
        id: group.id,
        name: override.name ?? autoName,
        description: override.description ?? "",
        assetNumber,
        category: override.category ?? category,
        extensionPack: override.extensionPack ?? null,
        image: previewVariant?.image ?? primaryImage,
        ...(defaultVariantId ? { defaultVariant: defaultVariantId } : {}),
        ...(variants.length > 1 ? { variants } : {}),
    };
}

function scanAssetFiles() {
    const files = [];
    for (const folder of CATEGORY_FOLDERS) {
        const dir = path.join(ASSETS_DIR, folder);
        if (!fs.existsSync(dir)) continue;
        const category = FOLDER_TO_CATEGORY[folder];
        for (const name of fs.readdirSync(dir)) {
            if (!name.toLowerCase().endsWith(".png")) continue;
            const rel = `lowpoly/hytale/${folder}/${name}`;
            files.push({
                path: rel,
                stem: stemFromPath(name),
                category,
            });
        }
    }
    return files;
}

function normalizeForRuntime(item) {
    const normalized = {
        id: item.id,
        stem: item.id,
        name: item.name,
        title: item.name,
        desc: item.description,
        description: item.description,
        assetNumber: item.assetNumber,
        category: item.category,
        extensionPack: item.extensionPack,
        image: item.image,
        order: item.assetNumber,
    };
    if (item.defaultVariant) normalized.defaultVariant = item.defaultVariant;
    if (item.variants?.length) normalized.variants = item.variants;
    return normalized;
}

function normalizeExtension(ext) {
    return {
        id: ext.id,
        title: ext.name,
        name: ext.name,
        category: ext.category,
        image: ext.image,
        logo: ext.logo,
        images: ext.images,
        desc: ext.description,
        description: ext.description,
        cardDesc: ext.cardDescription,
        cardDescription: ext.cardDescription,
        size: ext.size,
        downloadAvailable: ext.downloadAvailable,
        downloadUrl: ext.downloadUrl,
        curseforgeUrl: ext.curseforgeUrl,
    };
}

// ── Main ──────────────────────────────────────────────────────────

const overrides = loadOverrides();
const files = scanAssetFiles();

const byCategory = new Map();
for (const file of files) {
    if (!byCategory.has(file.category)) byCategory.set(file.category, []);
    byCategory.get(file.category).push(file);
}

const items = [];
for (const category of CATEGORY_ORDER) {
    const entries = byCategory.get(category) || [];
    const groups = applyVariantAttachments(
        groupStemsInCategory(entries, overrides.standalonePrefixes),
        entries,
        overrides.items
    );
    let counter = 1;

    for (const group of groups.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
        const itemOverride = overrides.items[group.id] || {};
        if (itemOverride.hidden) continue;
        const built = buildItem(group, category, itemOverride, counter++, overrides.preferredDefaultVariants);
        items.push(built);
    }
}

const extensionMap = new Map(DEFAULT_EXTENSIONS.map((e) => [e.id, e]));
for (const [id, extOverride] of Object.entries(overrides.extensions)) {
    const base = extensionMap.get(id) || { id, name: humanizeStem(id), category: "misc", image: "", images: [] };
    extensionMap.set(id, mergeExtension(base, { ...extOverride, id }));
}

const extensions = [...extensionMap.values()].map(normalizeExtension);

if (overrides.itemOrder.length > 0) {
    const orderIndex = new Map(overrides.itemOrder.map((id, index) => [id, index]));
    const tailRank = overrides.itemOrder.length;
    items.sort((a, b) => {
        const aRank = orderIndex.has(a.id) ? orderIndex.get(a.id) : tailRank;
        const bRank = orderIndex.has(b.id) ? orderIndex.get(b.id) : tailRank;
        if (aRank !== bRank) return aRank - bRank;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
    items.forEach((item, index) => {
        item.assetNumber = index + 1;
    });
} else {
    items.sort((a, b) => {
        const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        if (catDiff !== 0) return catDiff;
        if (a.assetNumber !== b.assetNumber) return a.assetNumber - b.assetNumber;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
}

const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    extensions,
    items: items.map(normalizeForRuntime),
};

fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

const catalogJs = `/* AUTO-GENERATED by scripts/build-lowpoly-catalog.mjs — do not edit */
window.LOWPOLY_CATALOG = ${JSON.stringify(catalog, null, 4)};
`;

fs.writeFileSync(CATALOG_JS_PATH, catalogJs);

console.log(`Catalog: ${items.length} items, ${extensions.length} extensions`);
console.log(`Wrote ${path.relative(ROOT, CATALOG_PATH)}`);
console.log(`Wrote ${path.relative(ROOT, CATALOG_JS_PATH)}`);
