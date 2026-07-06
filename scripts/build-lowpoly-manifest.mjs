#!/usr/bin/env node
/**
 * @deprecated Use scripts/build-lowpoly-catalog.mjs instead.
 * This script now delegates to the catalog builder.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [path.join(__dirname, "build-lowpoly-catalog.mjs")], {
    stdio: "inherit",
});
process.exit(result.status ?? 1);
