#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BOIS_ROOT = path.join(ROOT, "BOIS GUI");
const UTSUWA_DIR = path.join(BOIS_ROOT, "utsuwa_3d");
const ANIM_DIR = path.join(UTSUWA_DIR, "anim_bois");
const BVH_DIR = path.join(BOIS_ROOT, "LIB", "BVH", "BVH_Animations_Mixamo_No Character");
const MANIFEST_PATH = path.join(BOIS_ROOT, "assets", "data", "bois-manifest.json");

async function safeReadDir(dir) {
    try {
        return await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return [];
    }
}

function toSlug(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "item";
}

function toTitle(value) {
    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function buildModels() {
    const entries = await safeReadDir(UTSUWA_DIR);
    const bios = new Map();

    for (const entry of entries) {
        if (!entry.isFile()) {
            continue;
        }
        const lower = entry.name.toLowerCase();
        if (!lower.startsWith("bio_") || !lower.endsWith(".txt")) {
            continue;
        }
        const stem = entry.name.slice(4, -4).toLowerCase();
        bios.set(stem, `./utsuwa_3d/${entry.name}`);
    }

    const models = [];
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".fbx")) {
            continue;
        }
        const match = /^(.+)_mixamo_t-pose\.fbx$/i.exec(entry.name);
        if (!match) {
            continue;
        }
        const prefix = match[1];
        models.push({
            id: toSlug(prefix),
            name: toTitle(prefix),
            modelPath: `./utsuwa_3d/${entry.name}`,
            bioPath: bios.get(prefix.toLowerCase()) || "",
            defaultAnimations: []
        });
    }

    return models;
}

async function buildAnimationLibrary() {
    const entries = await safeReadDir(ANIM_DIR);
    const library = [];
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".fbx")) {
            continue;
        }
        const stem = entry.name.replace(/\.fbx$/i, "");
        library.push({
            id: toSlug(stem),
            name: toTitle(stem),
            path: `./utsuwa_3d/anim_bois/${entry.name}`,
            filename: entry.name
        });
    }
    return library;
}

async function buildBvhLibrary(limit = 600) {
    const entries = await safeReadDir(BVH_DIR);
    const library = [];
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".bvh")) {
            continue;
        }
        const stem = entry.name.replace(/\.bvh$/i, "");
        library.push({
            id: `bvh_${toSlug(stem)}`,
            name: toTitle(stem),
            path: `./LIB/BVH/BVH_Animations_Mixamo_No Character/${entry.name}`
        });
        if (library.length >= limit) {
            break;
        }
    }
    return library;
}

function assignDefaultAnimations(models, animationLibrary) {
    const byModel = new Map();
    for (const model of models) {
        const prefix = model.name.toLowerCase().replace(/\s+/g, "_");
        byModel.set(model.id, { model, prefix });
    }

    for (const item of animationLibrary) {
        const lower = item.filename.toLowerCase();
        for (const { model, prefix } of byModel.values()) {
            if (lower.startsWith(`${prefix}_mixamo_`) && !lower.includes("_t-pose")) {
                model.defaultAnimations.push(item.path);
            }
        }
    }
}

async function main() {
    const models = await buildModels();
    const animationLibraryRaw = await buildAnimationLibrary();
    assignDefaultAnimations(models, animationLibraryRaw);

    const payload = {
        version: 1,
        defaultModelId: models[0]?.id || "",
        models,
        animationLibrary: animationLibraryRaw.map(({ id, name, path }) => ({ id, name, path })),
        bvhLibrary: await buildBvhLibrary(600)
    };

    await fs.writeFile(MANIFEST_PATH, JSON.stringify(payload, null, 2), "utf8");

    console.log(`Manifest generated: ${MANIFEST_PATH}`);
    console.log(`Models: ${payload.models.length}`);
    console.log(`Animations: ${payload.animationLibrary.length}`);
    console.log(`BVH listed: ${payload.bvhLibrary.length}`);
}

main().catch((error) => {
    console.error("Manifest generation failed", error);
    process.exitCode = 1;
});
