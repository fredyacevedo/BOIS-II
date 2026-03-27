import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { BVHLoader } from "three/addons/loaders/BVHLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { addCombinerReferenceLights, loadFbxWithManager } from "./bois-repo-bridges.js";

if (!THREE.BufferGeometry.prototype.computeBoundsTree) {
    THREE.BufferGeometry.prototype.computeBoundsTree = function noopComputeBoundsTree() {};
}
if (!THREE.BufferGeometry.prototype.disposeBoundsTree) {
    THREE.BufferGeometry.prototype.disposeBoundsTree = function noopDisposeBoundsTree() {};
}

const ui = {
    view: document.getElementById("boi-view"),
    stateBadge: document.getElementById("boi-model-state"),
    log: document.getElementById("boi-log"),
    scaleInput: document.getElementById("boi-scale"),
    rotateInput: document.getElementById("boi-rotate"),
    lightInput: document.getElementById("boi-light"),
    speedInput: document.getElementById("boi-speed"),
    timeline: document.getElementById("boi-timeline"),
    timeReadout: document.getElementById("boi-time-readout"),
    framePrevBtn: document.getElementById("boi-frame-prev"),
    frameNextBtn: document.getElementById("boi-frame-next"),
    navUpBtn: document.getElementById("boi-nav-up"),
    navDownBtn: document.getElementById("boi-nav-down"),
    navLeftBtn: document.getElementById("boi-nav-left"),
    navRightBtn: document.getElementById("boi-nav-right"),
    navCenterBtn: document.getElementById("boi-nav-center"),
    transportPrevBtn: document.getElementById("boi-transport-prev"),
    transportPlayBtn: document.getElementById("boi-transport-play"),
    transportNextBtn: document.getElementById("boi-transport-next"),
    speedDownBtn: document.getElementById("boi-speed-down"),
    speedUpBtn: document.getElementById("boi-speed-up"),
    lightDownBtn: document.getElementById("boi-light-down"),
    lightUpBtn: document.getElementById("boi-light-up"),
    scaleDownBtn: document.getElementById("boi-scale-down"),
    scaleUpBtn: document.getElementById("boi-scale-up"),
    turnLeftBtn: document.getElementById("boi-turn-left"),
    turnRightBtn: document.getElementById("boi-turn-right"),
    rimToggle: document.getElementById("boi-rim-toggle"),
    wireToggle: document.getElementById("boi-wire-toggle"),
    envToggle: document.getElementById("boi-env-toggle"),
    gridToggle: document.getElementById("boi-grid-toggle"),
    groundToggle: document.getElementById("boi-ground-toggle"),
    helperToggle: document.getElementById("boi-helpers-toggle"),
    turntableToggle: document.getElementById("boi-light-rig-toggle"),
    bvhToggle: document.getElementById("boi-bvh-toggle"),
    presetGroup: document.getElementById("boi-preset"),
    localFileInput: document.getElementById("boi-local-file"),
    loadLocalBtn: document.getElementById("boi-load-local"),
    loadAnimBtn: document.getElementById("boi-load-animation"),
    animFileInput: document.getElementById("boi-animation-file"),
    catalogModelSelect: document.getElementById("boi-catalog-model"),
    catalogLoadModelBtn: document.getElementById("boi-catalog-load-model"),
    catalogLoadAssignedBtn: document.getElementById("boi-catalog-load-assigned"),
    catalogImportFolderBtn: document.getElementById("boi-catalog-import-folder"),
    catalogResetSourceBtn: document.getElementById("boi-catalog-reset-source"),
    catalogFolderInput: document.getElementById("boi-catalog-folder-input"),
    catalogAnimationSelect: document.getElementById("boi-catalog-animation"),
    catalogAddAnimationBtn: document.getElementById("boi-catalog-add-animation"),
    catalogAddAllBtn: document.getElementById("boi-catalog-add-all"),
    catalogBVHSelect: document.getElementById("boi-catalog-bvh"),
    catalogLoadBVHBtn: document.getElementById("boi-catalog-load-bvh"),
    modelBio: document.getElementById("boi-model-bio"),
    animationList: document.getElementById("boi-animation-list"),
    layerList: document.getElementById("boi-layer-list"),
    addLayerBtn: document.getElementById("boi-add-layer"),
    clearLayersBtn: document.getElementById("boi-clear-layers"),
    playToggle: document.getElementById("boi-play-toggle"),
    loopToggle: document.getElementById("boi-loop-toggle"),
    morphList: document.getElementById("boi-morph-list"),
    morphResetBtn: document.getElementById("boi-morph-reset"),
    morphRandomBtn: document.getElementById("boi-morph-random"),
    morphSaveBtn: document.getElementById("boi-morph-save"),
    morphRestoreBtn: document.getElementById("boi-morph-restore"),
    retargetBtn: document.getElementById("boi-retarget-selected"),
    sourceClipSelect: document.getElementById("boi-retarget-source-clip"),
    retargetReport: document.getElementById("boi-retarget-report"),
    offsetBoneSelect: document.getElementById("boi-offset-bone"),
    offsetX: document.getElementById("boi-offset-x"),
    offsetY: document.getElementById("boi-offset-y"),
    offsetZ: document.getElementById("boi-offset-z"),
    gizmoTranslate: document.getElementById("boi-gizmo-translate"),
    gizmoRotate: document.getElementById("boi-gizmo-rotate"),
    gizmoScale: document.getElementById("boi-gizmo-scale"),
    gizmoReset: document.getElementById("boi-gizmo-reset"),
    snapTranslate: document.getElementById("boi-snap-translate"),
    snapRotate: document.getElementById("boi-snap-rotate"),
    exportJsonBtn: document.getElementById("boi-export-json"),
    exportGlbBtn: document.getElementById("boi-export-glb"),
    importJsonBtn: document.getElementById("boi-import-json"),
    importJsonFile: document.getElementById("boi-import-json-file")
};

if (!ui.view) {
    throw new Error("#boi-view not found");
}

function getStartupOverrides() {
    const params = new URLSearchParams(window.location.search || "");
    const modelId = (params.get("model") || "").trim();
    const hasLoadAssigned = params.has("loadAssigned");
    const loadAssignedRaw = (params.get("loadAssigned") || "").trim().toLowerCase();
    const loadAssigned = loadAssignedRaw === "1" || loadAssignedRaw === "true" || loadAssignedRaw === "yes";
    return { modelId, hasLoadAssigned, loadAssigned };
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
ui.view.appendChild(renderer.domElement);
ui.view.dataset.threeReady = "1";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
camera.position.set(0, 1.45, 4.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.1, 0);
controls.minDistance = 1;
controls.maxDistance = 14;

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.visible = false;
transformControls.addEventListener("dragging-changed", (event) => {
    controls.enabled = !event.value;
});
scene.add(transformControls);

const lightRig = new THREE.Group();
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x454545, 0.9);
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
const fillLight = new THREE.DirectionalLight(0xbfd4ff, 0.45);
const rimLight = new THREE.DirectionalLight(0xe0ebff, 0.65);
keyLight.position.set(3, 6, 3);
fillLight.position.set(-3, 3.5, 2.5);
rimLight.position.set(-2.5, 2.2, -3.5);
lightRig.add(keyLight, fillLight, rimLight);
scene.add(hemiLight, lightRig);
addCombinerReferenceLights(scene);

const gridHelper = new THREE.GridHelper(12, 24, 0x8d8d8d, 0x676767);
const axesHelper = new THREE.AxesHelper(1.2);
axesHelper.visible = false;
scene.add(gridHelper, axesHelper);

const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.MeshStandardMaterial({
        color: 0x9a9a9a,
        roughness: 0.8,
        metalness: 0.05,
        transparent: true,
        opacity: 0.35
    })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.015;
scene.add(ground);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const clock = new THREE.Clock();
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const bvhLoader = new BVHLoader();

const FALLBACK_MANIFEST = {
    version: 1,
    defaultModelId: "franko",
    models: [
        {
            id: "franko",
            name: "Franko",
            modelPath: "./utsuwa_3d/Franko_mixamo_T-Pose.fbx",
            bioPath: "./utsuwa_3d/bio_franko.txt",
            defaultAnimations: [
                "./utsuwa_3d/anim_bois/Franko_mixamo_Breathing Idle.fbx",
                "./utsuwa_3d/anim_bois/Franko_mixamo_Looking Around.fbx",
                "./utsuwa_3d/anim_bois/Franko_mixamo_Looking Behind.fbx",
                "./utsuwa_3d/anim_bois/Franko_mixamo_Neutral Idle.fbx"
            ]
        },
        {
            id: "test_boi",
            name: "TEST_BOI_3D",
            modelPath: "./utsuwa_3d/TEST_BOI_3D.fbx",
            defaultAnimations: []
        }
    ],
    animationLibrary: [
        {
            id: "franko_breathing_idle",
            name: "Breathing Idle",
            path: "./utsuwa_3d/anim_bois/Franko_mixamo_Breathing Idle.fbx"
        },
        {
            id: "franko_looking_around",
            name: "Looking Around",
            path: "./utsuwa_3d/anim_bois/Franko_mixamo_Looking Around.fbx"
        },
        {
            id: "franko_looking_behind",
            name: "Looking Behind",
            path: "./utsuwa_3d/anim_bois/Franko_mixamo_Looking Behind.fbx"
        },
        {
            id: "franko_neutral_idle",
            name: "Neutral Idle",
            path: "./utsuwa_3d/anim_bois/Franko_mixamo_Neutral Idle.fbx"
        }
    ],
    bvhLibrary: [
        {
            id: "bvh_acknowledging",
            name: "Acknowledging",
            path: "./LIB/BVH/BVH_Animations_Mixamo_No Character/acknowledging.bvh"
        },
        {
            id: "bvh_agreeing",
            name: "Agreeing",
            path: "./LIB/BVH/BVH_Animations_Mixamo_No Character/agreeing.bvh"
        }
    ]
};

const state = {
    avatarRoot: null,
    skinnedMeshes: [],
    skeleton: null,
    clips: [],
    sourceClips: [],
    sourceSkeleton: null,
    mixer: null,
    layers: [],
    layerCount: 0,
    fitScale: 1,
    autoRotateSpeed: 0.16,
    wireframe: false,
    rim: true,
    useEnvironment: false,
    grid: true,
    ground: true,
    helpers: false,
    turntableLights: true,
    loop: true,
    isPlaying: true,
    speed: 1,
    timelineScrubbing: false,
    duration: 1,
    morphEntries: [],
    savedMorphState: null,
    morphRaf: 0,
    bvhPicking: true,
    boneOffsets: new Map(),
    fpsCounter: {
        frames: 0,
        elapsed: 0,
        last: 60
    },
    manifest: null,
    manifestDefault: null,
    activeModelId: "",
    loadedCatalogAnimations: new Set(),
    catalogSource: "manifest",
    localAssetUrlMap: new Map(),
    localAssetFileMap: new Map()
};

const BODY_MASKS = {
    full: () => true,
    upper: (name) => /spine|chest|neck|head|shoulder|arm|hand/i.test(name),
    lower: (name) => /hips|thigh|leg|knee|foot|toe/i.test(name),
    arms: (name) => /shoulder|arm|forearm|hand/i.test(name),
    head: (name) => /neck|head|jaw|eye/i.test(name)
};

function setBadge(text) {
    if (ui.stateBadge) {
        ui.stateBadge.textContent = text;
    }
}

function pushLog(level, message, error) {
    const time = new Date().toLocaleTimeString();
    const line = `[${time}] ${level.toUpperCase()} ${message}`;
    if (ui.log) {
        ui.log.textContent = `${line}\n${ui.log.textContent}`.slice(0, 14000);
    }
    if (error) {
        console.error(line, error);
    }
}

function resize() {
    const width = ui.view.clientWidth;
    const height = ui.view.clientHeight;
    if (!width || !height) {
        return;
    }
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function normalizeBoneName(name) {
    return name
        .toLowerCase()
        .replace("mixamorig:", "")
        .replace("mixamorig", "")
        .replace(/[^a-z0-9]/g, "");
}

function getFileType(filename) {
    return (filename.split(".").pop() || "").toLowerCase();
}

function normalizeManifest(raw) {
    const safeRaw = raw && typeof raw === "object" ? raw : {};
    const models = Array.isArray(safeRaw.models) ? safeRaw.models : [];
    const animationLibrary = Array.isArray(safeRaw.animationLibrary) ? safeRaw.animationLibrary : [];
    const bvhLibrary = Array.isArray(safeRaw.bvhLibrary) ? safeRaw.bvhLibrary : [];
    const normalizedModels = models
        .map((model) => ({
            id: String(model.id || "").trim(),
            name: String(model.name || model.id || "Unnamed BOI").trim(),
            modelPath: String(model.modelPath || "").trim(),
            bioPath: String(model.bioPath || "").trim(),
            defaultAnimations: Array.isArray(model.defaultAnimations)
                ? model.defaultAnimations.map((path) => String(path || "").trim()).filter(Boolean)
                : []
        }))
        .filter((model) => model.id && model.modelPath);

    return {
        version: Number(safeRaw.version) || 1,
        defaultModelId: String(safeRaw.defaultModelId || normalizedModels[0]?.id || "").trim(),
        models: normalizedModels,
        animationLibrary: animationLibrary
            .map((entry) => ({
                id: String(entry.id || "").trim(),
                name: String(entry.name || entry.id || "Unnamed Animation").trim(),
                path: String(entry.path || "").trim()
            }))
            .filter((entry) => entry.id && entry.path),
        bvhLibrary: bvhLibrary
            .map((entry) => ({
                id: String(entry.id || "").trim(),
                name: String(entry.name || entry.id || "Unnamed BVH").trim(),
                path: String(entry.path || "").trim()
            }))
            .filter((entry) => entry.id && entry.path)
    };
}

async function loadManifest() {
    try {
        const response = await fetch("./assets/data/bois-manifest.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        return normalizeManifest(json);
    } catch (error) {
        pushLog("warn", `Manifest load fallback activated: ${error.message}`);
        return normalizeManifest(FALLBACK_MANIFEST);
    }
}

function clearLocalCatalogOverrides() {
    state.localAssetUrlMap.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    state.localAssetUrlMap.clear();
    state.localAssetFileMap.clear();
}

function resolveCatalogAssetPath(path) {
    return state.localAssetUrlMap.get(path) || path;
}

function getCatalogAssetFile(path) {
    return state.localAssetFileMap.get(path) || null;
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
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeLocalRelativePath(inputPath) {
    const normalized = String(inputPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length === 0) {
        return "";
    }
    const rootIdx = segments.findIndex((segment) => /^(utsuwa_3d|lib)$/i.test(segment));
    if (rootIdx >= 0) {
        return segments.slice(rootIdx).join("/");
    }
    return segments.join("/");
}

function makeLocalAssetKey(relativePath) {
    return `local://${relativePath}`;
}

function modelPrefixFromFilename(filename) {
    const lower = String(filename || "").toLowerCase();
    const marker = "_mixamo_t-pose.fbx";
    if (!lower.endsWith(marker)) {
        return "";
    }
    return filename.slice(0, filename.length - marker.length);
}

function createLocalCatalogManifest(entries) {
    clearLocalCatalogOverrides();

    const models = [];
    const animations = [];
    const bvh = [];
    const bioByPrefix = new Map();

    entries.forEach(({ file, relativePath }) => {
        const safeRelativePath = normalizeLocalRelativePath(relativePath || file?.name || "");
        if (!safeRelativePath || !file) {
            return;
        }
        const lowerPath = safeRelativePath.toLowerCase();
        const key = makeLocalAssetKey(safeRelativePath);
        const url = URL.createObjectURL(file);
        state.localAssetUrlMap.set(key, url);
        state.localAssetFileMap.set(key, file);

        if (/^utsuwa_3d\/bio_.+\.txt$/i.test(safeRelativePath)) {
            const stem = safeRelativePath.split("/").pop().replace(/^bio_/i, "").replace(/\.txt$/i, "");
            bioByPrefix.set(stem.toLowerCase(), key);
            return;
        }

        if (/^utsuwa_3d\/anim_bois\/.*\.fbx$/i.test(safeRelativePath)) {
            const basename = safeRelativePath.split("/").pop();
            const stem = basename.replace(/\.fbx$/i, "");
            animations.push({
                id: `local_anim_${toSlug(stem)}`,
                name: toTitle(stem),
                path: key,
                filename: basename
            });
            return;
        }

        if (/^lib\/bvh\/bvh_animations_mixamo_no character\/.*\.bvh$/i.test(lowerPath)) {
            const basename = safeRelativePath.split("/").pop();
            const stem = basename.replace(/\.bvh$/i, "");
            bvh.push({
                id: `local_bvh_${toSlug(stem)}`,
                name: toTitle(stem),
                path: key
            });
            return;
        }

        if (/^utsuwa_3d\/.*\.fbx$/i.test(safeRelativePath) && !/^utsuwa_3d\/anim_bois\//i.test(safeRelativePath)) {
            const basename = safeRelativePath.split("/").pop();
            const prefix = modelPrefixFromFilename(basename);
            if (!prefix) {
                return;
            }
            const id = `local_model_${toSlug(prefix)}`;
            models.push({
                id,
                name: toTitle(prefix),
                sourcePrefix: prefix,
                modelPath: key,
                bioPath: "",
                defaultAnimations: []
            });
        }
    });

    const uniqueModels = [];
    const modelSeen = new Set();
    models.forEach((model) => {
        if (modelSeen.has(model.id)) {
            return;
        }
        modelSeen.add(model.id);
        uniqueModels.push(model);
    });

    uniqueModels.forEach((model) => {
        const rawPrefix = String(model.sourcePrefix || model.name || "");
        const prefix = rawPrefix.toLowerCase();
        model.bioPath = bioByPrefix.get(prefix) || "";
        const defaults = animations
            .filter((entry) => entry.filename.toLowerCase().startsWith(`${prefix}_mixamo_`) && !/t-pose/i.test(entry.filename))
            .map((entry) => entry.path);
        model.defaultAnimations = defaults;
        delete model.sourcePrefix;
    });

    return normalizeManifest({
        version: 1,
        defaultModelId: uniqueModels[0]?.id || "",
        models: uniqueModels,
        animationLibrary: animations.map(({ id, name, path }) => ({ id, name, path })),
        bvhLibrary: bvh.slice(0, 600)
    });
}

function applyCatalogManifest(manifest, sourceLabel) {
    state.manifest = manifest;
    state.catalogSource = sourceLabel;
    state.activeModelId = state.manifest.defaultModelId || state.manifest.models[0]?.id || "";
    state.loadedCatalogAnimations.clear();
    populateCatalogUI();
    pushLog("info", `Catalog source active: ${sourceLabel} (${state.manifest.models.length} model(s), ${state.manifest.animationLibrary.length} animation(s), ${state.manifest.bvhLibrary.length} BVH).`);
}

async function readEntriesFromDirectoryHandle(handle, basePath = "") {
    const entries = [];
    for await (const [name, child] of handle.entries()) {
        const childPath = basePath ? `${basePath}/${name}` : name;
        if (child.kind === "file") {
            const file = await child.getFile();
            entries.push({ file, relativePath: childPath });
            continue;
        }
        if (child.kind === "directory") {
            const subEntries = await readEntriesFromDirectoryHandle(child, childPath);
            entries.push(...subEntries);
        }
    }
    return entries;
}

async function importCatalogFromEntries(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        pushLog("warn", "No files were selected for local catalog import.");
        return;
    }
    const localManifest = createLocalCatalogManifest(entries);
    if (!localManifest.models.length) {
        pushLog("warn", "No [Model]_mixamo_T-Pose.fbx files found in selected folder.");
        return;
    }
    applyCatalogManifest(localManifest, "local-folder");
    const defaultModel = getCatalogModelById(state.activeModelId);
    if (defaultModel) {
        await loadCatalogModel(defaultModel.id, { loadAssignedAnimations: true });
    }
}

async function importCatalogFromFolderPicker() {
    if (window.showDirectoryPicker) {
        const handle = await window.showDirectoryPicker({ mode: "read" });
        const entries = await readEntriesFromDirectoryHandle(handle);
        await importCatalogFromEntries(entries);
        return;
    }
    ui.catalogFolderInput?.click();
}

function resetToManifestCatalog() {
    if (!state.manifestDefault) {
        pushLog("warn", "Default manifest catalog is not available.");
        return;
    }
    clearLocalCatalogOverrides();
    applyCatalogManifest(normalizeManifest(state.manifestDefault), "manifest");
}

function getCatalogModelById(modelId) {
    return state.manifest?.models.find((model) => model.id === modelId) || null;
}

function populateCatalogUI() {
    if (ui.catalogModelSelect) {
        ui.catalogModelSelect.innerHTML = "";
        state.manifest.models.forEach((model) => {
            const option = document.createElement("option");
            option.value = model.id;
            option.textContent = model.name;
            ui.catalogModelSelect.appendChild(option);
        });
        ui.catalogModelSelect.value = state.activeModelId || state.manifest.defaultModelId || "";
    }

    if (ui.catalogAnimationSelect) {
        ui.catalogAnimationSelect.innerHTML = "";
        state.manifest.animationLibrary.forEach((animation) => {
            const option = document.createElement("option");
            option.value = animation.id;
            option.textContent = animation.name;
            ui.catalogAnimationSelect.appendChild(option);
        });
    }

    if (ui.catalogBVHSelect) {
        ui.catalogBVHSelect.innerHTML = "";
        state.manifest.bvhLibrary.forEach((entry) => {
            const option = document.createElement("option");
            option.value = entry.id;
            option.textContent = entry.name;
            ui.catalogBVHSelect.appendChild(option);
        });
    }
}

function renderRetargetReport(lines) {
    if (!ui.retargetReport) {
        return;
    }
    const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : ["No retarget operation yet."];
    ui.retargetReport.textContent = safeLines.join("\n");
}

function buildRetargetReport(sourceClip, sourceSkeleton, targetSkeleton, map, generatedTrackCount) {
    const sourceBones = sourceSkeleton?.bones || [];
    const targetBones = targetSkeleton?.bones || [];

    let directNameMatches = 0;
    const targetNormalized = new Set(targetBones.map((bone) => normalizeBoneName(bone.name)).filter(Boolean));
    sourceBones.forEach((bone) => {
        if (targetNormalized.has(normalizeBoneName(bone.name))) {
            directNameMatches += 1;
        }
    });

    const mappedSourceBones = map ? map.size : 0;
    const sourceTotal = sourceBones.length;
    const coverage = sourceTotal > 0 ? (mappedSourceBones / sourceTotal) * 100 : 0;
    const nameMatchPct = sourceTotal > 0 ? (directNameMatches / sourceTotal) * 100 : 0;

    return [
        `Source clip: ${sourceClip?.name || "unknown"}`,
        `Source bones: ${sourceTotal}`,
        `Target bones: ${targetBones.length}`,
        `Mapped source bones: ${mappedSourceBones} (${coverage.toFixed(1)}%)`,
        `Direct name matches: ${directNameMatches} (${nameMatchPct.toFixed(1)}%)`,
        `Generated tracks: ${generatedTrackCount}`
    ];
}

async function updateModelBio(model) {
    if (!ui.modelBio) {
        return;
    }

    if (!model?.bioPath) {
        ui.modelBio.textContent = "No bio assigned.";
        return;
    }

    try {
        const bioFile = getCatalogAssetFile(model.bioPath);
        if (bioFile) {
            ui.modelBio.textContent = (await bioFile.text()).trim();
            return;
        }
        const response = await fetch(resolveCatalogAssetPath(model.bioPath), { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        ui.modelBio.textContent = text.trim();
    } catch (error) {
        ui.modelBio.textContent = `Unable to read bio file at ${model.bioPath}`;
        pushLog("warn", `Bio load failed: ${error.message}`);
    }
}

function getFirstSkinnedMesh(root) {
    let candidate = null;
    root.traverse((node) => {
        if (!candidate && node.isSkinnedMesh) {
            candidate = node;
        }
    });
    return candidate;
}

function centerAndFit(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);

    const maxSide = Math.max(size.x, size.y, size.z) || 1;
    state.fitScale = 2.1 / maxSide;
    const userScale = ui.scaleInput ? Number(ui.scaleInput.value) / 100 : 1;
    object.scale.setScalar(state.fitScale * userScale);
    controls.target.set(0, 1.0, 0);
    controls.update();
}

function createProceduralAvatarProxy() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.24, 0.9, 10, 18),
        new THREE.MeshStandardMaterial({ color: 0xc8d1db, roughness: 0.82, metalness: 0.06 })
    );
    body.position.y = 0.94;

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 28, 28),
        new THREE.MeshStandardMaterial({ color: 0xded6ca, roughness: 0.72, metalness: 0.02 })
    );
    head.position.y = 1.62;

    const armGeometry = new THREE.CapsuleGeometry(0.08, 0.42, 8, 14);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xc7cfd9, roughness: 0.8, metalness: 0.05 });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.33, 1.04, 0);
    leftArm.rotation.z = Math.PI / 2;

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.33, 1.04, 0);
    rightArm.rotation.z = Math.PI / 2;

    group.add(body, head, leftArm, rightArm);
    group.userData.isProxyAvatar = true;
    return group;
}

function updateWireframe() {
    if (!state.avatarRoot) {
        return;
    }
    state.avatarRoot.traverse((node) => {
        if (node.isMesh && node.material) {
            if (Array.isArray(node.material)) {
                node.material.forEach((material) => {
                    material.wireframe = state.wireframe;
                });
            } else {
                node.material.wireframe = state.wireframe;
            }
        }
    });
}

function refreshPerformanceBadge(dt) {
    state.fpsCounter.frames += 1;
    state.fpsCounter.elapsed += dt;
    if (state.fpsCounter.elapsed > 0.5) {
        state.fpsCounter.last = Math.round(state.fpsCounter.frames / state.fpsCounter.elapsed);
        state.fpsCounter.frames = 0;
        state.fpsCounter.elapsed = 0;
        if (ui.stateBadge && state.avatarRoot) {
            const meshCount = state.skinnedMeshes.length;
            ui.stateBadge.textContent = `Avatar ready | ${meshCount} skinned mesh | ${state.fpsCounter.last} FPS`;
        }
    }
}

function updateEnvironment() {
    scene.environment = state.useEnvironment ? envTexture : null;
    scene.background = null;
    if (ui.envToggle) {
        ui.envToggle.textContent = `Environment: ${state.useEnvironment ? "ON" : "OFF"}`;
    }
}

function applyBVH(root) {
    root.traverse((node) => {
        if (!node.isMesh || !node.geometry || !node.geometry.attributes.position) {
            return;
        }
        if (!node.geometry.boundsTree) {
            node.geometry.computeBoundsTree();
        }
        node.frustumCulled = true;
    });
}

function clearAvatar() {
    if (state.mixer) {
        state.mixer.stopAllAction();
    }
    state.layers.forEach((layer) => {
        if (layer.action) {
            layer.action.stop();
        }
    });
    state.layers = [];
    state.layerCount = 0;
    state.clips = [];
    state.sourceClips = [];
    state.sourceSkeleton = null;
    state.skeleton = null;
    state.skinnedMeshes = [];
    state.morphEntries = [];

    if (state.avatarRoot) {
        scene.remove(state.avatarRoot);
        transformControls.detach();
        transformControls.visible = false;
    }
    state.avatarRoot = null;
}

function collectSkinnedMeshes(root) {
    const result = [];
    root.traverse((node) => {
        if (node.isSkinnedMesh) {
            result.push(node);
        }
    });
    return result;
}

function repopulateOffsetBoneSelect() {
    if (!ui.offsetBoneSelect) {
        return;
    }
    ui.offsetBoneSelect.innerHTML = "";
    const bones = state.skeleton?.bones || [];
    bones.forEach((bone) => {
        const option = document.createElement("option");
        option.value = bone.name;
        option.textContent = bone.name;
        ui.offsetBoneSelect.appendChild(option);
    });
    const first = bones[0]?.name || "";
    ui.offsetBoneSelect.value = first;
    readCurrentOffsetSliders(first);
}

function getOffsetForBone(name) {
    return state.boneOffsets.get(name) || { x: 0, y: 0, z: 0 };
}

function setOffsetForBone(name, x, y, z) {
    state.boneOffsets.set(name, { x, y, z });
}

function readCurrentOffsetSliders(name) {
    if (!name || !ui.offsetX || !ui.offsetY || !ui.offsetZ) {
        return;
    }
    const offset = getOffsetForBone(name);
    ui.offsetX.value = String(offset.x);
    ui.offsetY.value = String(offset.y);
    ui.offsetZ.value = String(offset.z);
}

function updateOffsetFromSliders() {
    if (!ui.offsetBoneSelect || !ui.offsetX || !ui.offsetY || !ui.offsetZ) {
        return;
    }
    const boneName = ui.offsetBoneSelect.value;
    if (!boneName) {
        return;
    }
    const x = Number(ui.offsetX.value);
    const y = Number(ui.offsetY.value);
    const z = Number(ui.offsetZ.value);
    setOffsetForBone(boneName, x, y, z);
}

function createMixer(clips) {
    state.mixer = new THREE.AnimationMixer(state.avatarRoot);
    state.clips = clips.filter(Boolean);
    renderAnimationList();
    clearLayers();
    if (state.clips.length > 0) {
        addLayer({ clipName: state.clips[0].name, weight: 1, mask: "full", blend: 0.2 });
    }
}

/**
 * Attach a loaded avatar and initialize animation/morph/bvh systems.
 * @param {THREE.Object3D} root
 * @param {THREE.AnimationClip[]} animations
 * @param {string} label
 */
function attachAvatar(root, animations, label) {
    clearAvatar();
    state.avatarRoot = root;
    scene.add(state.avatarRoot);
    centerAndFit(state.avatarRoot);

    state.skinnedMeshes = collectSkinnedMeshes(state.avatarRoot);
    state.skeleton = state.skinnedMeshes[0]?.skeleton || null;

    if (state.skinnedMeshes.length === 0) {
        pushLog("warn", "No skinned mesh found. Retargeting and morph UI may be limited.");
    }

    applyBVH(state.avatarRoot);
    updateWireframe();
    createMixer(animations);
    rebuildMorphList();
    repopulateOffsetBoneSelect();

    transformControls.attach(state.avatarRoot);
    transformControls.visible = true;

    setBadge(`${label} loaded`);
    pushLog("info", `${label} loaded with ${state.clips.length} animation clip(s).`);
}

function parseGLTF(buffer) {
    return new Promise((resolve, reject) => {
        gltfLoader.parse(buffer, "", resolve, reject);
    });
}

function parseBVHText(text, label) {
    const bvh = bvhLoader.parse(text);
    return {
        root: new THREE.Group(),
        animations: bvh.clip ? [bvh.clip] : [],
        label,
        sourceSkeleton: bvh.skeleton || null
    };
}

async function parseAsset(file) {
    const ext = getFileType(file.name);
    const buffer = await file.arrayBuffer();

    if (ext === "fbx") {
        const root = fbxLoader.parse(buffer, "");
        return {
            root,
            animations: root.animations || [],
            label: file.name
        };
    }

    if (ext === "glb" || ext === "gltf") {
        const gltf = await parseGLTF(buffer);
        return {
            root: gltf.scene,
            animations: gltf.animations || [],
            label: file.name
        };
    }

    if (ext === "bvh") {
        const text = new TextDecoder().decode(buffer);
        return parseBVHText(text, file.name);
    }

    throw new Error(`Unsupported file type: ${ext}`);
}

async function parseAssetFromUrl(url) {
    return new Promise((resolve, reject) => {
        const ext = getFileType(url);
        if (ext === "fbx") {
            loadFbxWithManager(url)
                .then((root) => resolve({ root, animations: root.animations || [], label: url }))
                .catch(reject);
            return;
        }
        if (ext === "glb" || ext === "gltf") {
            gltfLoader.load(url, (gltf) => resolve({ root: gltf.scene, animations: gltf.animations || [], label: url }), undefined, reject);
            return;
        }
        if (ext === "bvh") {
            fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.text();
                })
                .then((text) => resolve(parseBVHText(text, url)))
                .catch(reject);
            return;
        }
        reject(new Error(`Unsupported extension in ${url}`));
    });
}

function findClipByName(name) {
    return state.clips.find((clip) => clip.name === name) || null;
}

function computeMaskPredicate(mask) {
    return BODY_MASKS[mask] || BODY_MASKS.full;
}

function trackBoneName(trackName) {
    const dotIndex = trackName.indexOf(".");
    return dotIndex === -1 ? trackName : trackName.slice(0, dotIndex);
}

function filterClipByMask(clip, mask) {
    if (!state.skeleton || mask === "full") {
        return clip;
    }

    const predicate = computeMaskPredicate(mask);
    const tracks = clip.tracks.filter((track) => {
        if (track.name.includes("morphTargetInfluences")) {
            return true;
        }
        const boneName = trackBoneName(track.name);
        return predicate(normalizeBoneName(boneName));
    });

    return new THREE.AnimationClip(`${clip.name}_${mask}`, clip.duration, tracks);
}

function updateLayerDuration() {
    let maxDuration = 1;
    state.layers.forEach((layer) => {
        if (layer.action?.getClip()) {
            maxDuration = Math.max(maxDuration, layer.action.getClip().duration || 1);
        }
    });
    state.duration = maxDuration;
}

function hasSoloLayers() {
    return state.layers.some((layer) => layer.solo);
}

function layerEffectiveWeight(layer) {
    if (layer.muted) {
        return 0;
    }
    if (hasSoloLayers() && !layer.solo) {
        return 0;
    }
    return THREE.MathUtils.clamp(layer.weight, 0, 1);
}

function applyLayerWeights() {
    state.layers.forEach((layer) => {
        if (!layer.action) {
            return;
        }
        layer.action.setEffectiveWeight(layerEffectiveWeight(layer));
    });
}

function updateTimeReadout(forcedTime) {
    if (!ui.timeReadout) {
        return;
    }
    const duration = Math.max(0, state.duration || 0);
    const current = typeof forcedTime === "number"
        ? Math.max(0, forcedTime)
        : Math.max(0, state.mixer?.time || 0);
    const clampedCurrent = duration > 0 ? (current % duration) : current;
    ui.timeReadout.textContent = `${clampedCurrent.toFixed(2)}s / ${duration.toFixed(2)}s`;
}

function stepTimelineByFrames(frameDelta, fps = 30) {
    if (!state.mixer) {
        return;
    }
    const step = frameDelta / Math.max(1, fps);
    const duration = Math.max(0.001, state.duration || 1);
    let targetTime = state.mixer.time + step;
    if (state.loop) {
        targetTime = ((targetTime % duration) + duration) % duration;
    } else {
        targetTime = THREE.MathUtils.clamp(targetTime, 0, duration);
    }
    state.isPlaying = false;
    if (ui.playToggle) {
        ui.playToggle.textContent = "Play";
    }
    state.layers.forEach((layer) => {
        if (layer.action) {
            layer.action.paused = true;
        }
    });
    state.mixer.setTime(targetTime);
    if (ui.timeline) {
        ui.timeline.value = String(Math.round((targetTime / duration) * 1000));
    }
    updateTimeReadout(targetTime);
}

function rebuildLayerAction(layer, crossFadeSeconds = 0.2) {
    if (!state.mixer || !state.avatarRoot) {
        return;
    }

    const clip = findClipByName(layer.clipName);
    if (!clip) {
        return;
    }

    const filtered = filterClipByMask(clip, layer.mask);
    const newAction = state.mixer.clipAction(filtered, state.avatarRoot);
    const oldAction = layer.action || null;

    newAction.setEffectiveWeight(0);
    newAction.setLoop(state.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    newAction.enabled = true;
    newAction.clampWhenFinished = !state.loop;
    newAction.timeScale = 1;
    newAction.paused = !state.isPlaying;
    newAction.play();

    if (oldAction) {
        newAction.crossFadeFrom(oldAction, Math.max(0, crossFadeSeconds), true);
        oldAction.stop();
    }

    layer.action = newAction;
    updateLayerDuration();
    applyLayerWeights();
}

function renderAnimationList() {
    if (!ui.animationList) {
        return;
    }

    ui.animationList.innerHTML = "";
    if (state.clips.length === 0) {
        ui.animationList.textContent = "No animation clips loaded.";
        return;
    }

    state.clips.forEach((clip) => {
        const item = document.createElement("div");
        item.className = "boi-list-item";

        const title = document.createElement("strong");
        title.textContent = `${clip.name} (${clip.duration.toFixed(2)}s)`;

        const row = document.createElement("div");
        row.className = "boi-anim-row";

        const playBtn = document.createElement("button");
        playBtn.type = "button";
        playBtn.className = "btn btn-pill";
        playBtn.textContent = "Play in Layer 1";
        playBtn.addEventListener("click", () => {
            if (state.layers.length === 0) {
                addLayer({ clipName: clip.name, mask: "full", weight: 1, blend: 0.2 });
                return;
            }
            state.layers[0].clipName = clip.name;
            rebuildLayerAction(state.layers[0], state.layers[0].blend);
            renderLayerList();
        });

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "btn btn-pill btn-ghost";
        addBtn.textContent = "Add Layer";
        addBtn.addEventListener("click", () => {
            addLayer({ clipName: clip.name, weight: 0.6, mask: "upper", blend: 0.2 });
        });

        row.append(playBtn, addBtn);
        item.append(title, row);
        ui.animationList.appendChild(item);
    });
}

function renderLayerList() {
    if (!ui.layerList) {
        return;
    }

    ui.layerList.innerHTML = "";
    if (state.layers.length === 0) {
        ui.layerList.textContent = "No layers.";
        return;
    }

    state.layers.forEach((layer) => {
        const item = document.createElement("div");
        item.className = "boi-list-item boi-layer-grid";

        const title = document.createElement("strong");
        title.textContent = `Layer ${layer.id}`;

        const clipSelect = document.createElement("select");
        clipSelect.className = "input-field";
        state.clips.forEach((clip) => {
            const option = document.createElement("option");
            option.value = clip.name;
            option.textContent = clip.name;
            clipSelect.appendChild(option);
        });
        clipSelect.value = layer.clipName;
        clipSelect.addEventListener("change", () => {
            layer.clipName = clipSelect.value;
            rebuildLayerAction(layer, layer.blend);
        });

        const maskSelect = document.createElement("select");
        maskSelect.className = "input-field";
        ["full", "upper", "lower", "arms", "head"].forEach((mask) => {
            const option = document.createElement("option");
            option.value = mask;
            option.textContent = `Mask: ${mask}`;
            maskSelect.appendChild(option);
        });
        maskSelect.value = layer.mask;
        maskSelect.addEventListener("change", () => {
            layer.mask = maskSelect.value;
            rebuildLayerAction(layer, layer.blend);
        });

        const weight = document.createElement("input");
        weight.className = "slider";
        weight.type = "range";
        weight.min = "0";
        weight.max = "100";
        weight.value = String(Math.round(layer.weight * 100));
        weight.addEventListener("input", () => {
            layer.weight = Number(weight.value) / 100;
            if (layer.action) {
                layer.action.setEffectiveWeight(layer.weight);
            }
        });

        const blend = document.createElement("input");
        blend.className = "input-field";
        blend.type = "number";
        blend.min = "0";
        blend.step = "0.05";
        blend.value = String(layer.blend);
        blend.addEventListener("change", () => {
            layer.blend = Math.max(0, Number(blend.value) || 0);
        });

        const remove = document.createElement("button");
        remove.className = "btn btn-pill btn-ghost";
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
            removeLayer(layer.id);
        });

        const mute = document.createElement("button");
        mute.className = `btn btn-pill ${layer.muted ? "" : "btn-ghost"}`;
        mute.type = "button";
        mute.textContent = layer.muted ? "Muted" : "Mute";
        mute.addEventListener("click", () => {
            layer.muted = !layer.muted;
            applyLayerWeights();
            renderLayerList();
        });

        const solo = document.createElement("button");
        solo.className = `btn btn-pill ${layer.solo ? "" : "btn-ghost"}`;
        solo.type = "button";
        solo.textContent = layer.solo ? "Solo ON" : "Solo";
        solo.addEventListener("click", () => {
            layer.solo = !layer.solo;
            applyLayerWeights();
            renderLayerList();
        });

        const up = document.createElement("button");
        up.className = "btn btn-pill btn-ghost";
        up.type = "button";
        up.textContent = "Up";
        up.addEventListener("click", () => moveLayer(layer.id, -1));

        const down = document.createElement("button");
        down.className = "btn btn-pill btn-ghost";
        down.type = "button";
        down.textContent = "Down";
        down.addEventListener("click", () => moveLayer(layer.id, 1));

        item.append(title, clipSelect, maskSelect, weight, blend, mute, solo, up, down, remove);
        ui.layerList.appendChild(item);
    });
}

function addLayer(config = {}) {
    if (!state.mixer || state.clips.length === 0) {
        pushLog("warn", "No clips available to create a layer.");
        return;
    }

    const layer = {
        id: ++state.layerCount,
        clipName: config.clipName || state.clips[0].name,
        weight: config.weight ?? 1,
        mask: config.mask || "full",
        blend: config.blend ?? 0.2,
        muted: Boolean(config.muted),
        solo: Boolean(config.solo),
        action: null
    };
    state.layers.push(layer);
    rebuildLayerAction(layer, layer.blend);
    renderLayerList();
}

function moveLayer(id, direction) {
    const index = state.layers.findIndex((layer) => layer.id === id);
    if (index === -1) {
        return;
    }
    const targetIndex = THREE.MathUtils.clamp(index + direction, 0, state.layers.length - 1);
    if (targetIndex === index) {
        return;
    }
    const [layer] = state.layers.splice(index, 1);
    state.layers.splice(targetIndex, 0, layer);
    renderLayerList();
}

function removeLayer(id) {
    const idx = state.layers.findIndex((layer) => layer.id === id);
    if (idx === -1) {
        return;
    }
    const [layer] = state.layers.splice(idx, 1);
    layer.action?.stop();
    updateLayerDuration();
    renderLayerList();
}

function clearLayers() {
    state.layers.forEach((layer) => layer.action?.stop());
    state.layers = [];
    state.layerCount = 0;
    state.duration = 1;
    renderLayerList();
    updateTimeReadout(0);
}

function appendClips(clips, prefix = "") {
    if (!clips || clips.length === 0) {
        return;
    }
    clips.forEach((clip) => {
        const name = prefix ? `${prefix}_${clip.name}` : clip.name;
        const existing = findClipByName(name);
        if (existing) {
            return;
        }
        state.clips.push(new THREE.AnimationClip(name, clip.duration, clip.tracks));
    });
    renderAnimationList();
}

function scheduleMorphRefresh() {
    if (state.morphRaf) {
        return;
    }
    state.morphRaf = requestAnimationFrame(() => {
        state.morphRaf = 0;
        rebuildMorphList();
    });
}

function snapshotMorphState() {
    const snap = {};
    state.morphEntries.forEach((entry) => {
        if (!snap[entry.mesh.uuid]) {
            snap[entry.mesh.uuid] = [];
        }
        snap[entry.mesh.uuid][entry.index] = entry.mesh.morphTargetInfluences?.[entry.index] || 0;
    });
    return snap;
}

function applyMorphState(snapshot) {
    state.morphEntries.forEach((entry) => {
        const array = snapshot[entry.mesh.uuid];
        if (!array || typeof array[entry.index] !== "number") {
            return;
        }
        entry.mesh.morphTargetInfluences[entry.index] = THREE.MathUtils.clamp(array[entry.index], -1, 1);
    });
}

function rebuildMorphList() {
    if (!ui.morphList) {
        return;
    }
    ui.morphList.innerHTML = "";
    state.morphEntries = [];

    if (!state.avatarRoot) {
        ui.morphList.textContent = "Load an avatar first.";
        return;
    }

    state.avatarRoot.traverse((node) => {
        if (!node.isMesh || !node.morphTargetDictionary || !node.morphTargetInfluences) {
            return;
        }

        Object.entries(node.morphTargetDictionary).forEach(([name, index]) => {
            state.morphEntries.push({ mesh: node, name, index });
        });
    });

    if (state.morphEntries.length === 0) {
        ui.morphList.textContent = "No morph targets found.";
        return;
    }

    state.morphEntries.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "boi-list-item";

        const title = document.createElement("strong");
        title.textContent = entry.name;

        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "slider";
        slider.min = "-100";
        slider.max = "100";
        slider.value = String(Math.round((entry.mesh.morphTargetInfluences[entry.index] || 0) * 100));
        slider.addEventListener("input", () => {
            entry.mesh.morphTargetInfluences[entry.index] = THREE.MathUtils.clamp(Number(slider.value) / 100, -1, 1);
        });

        item.append(title, slider);
        ui.morphList.appendChild(item);
    });
}

function bakeCurrentAnimationToClip(duration, fps = 30) {
    if (!state.mixer || !state.skeleton || !state.avatarRoot) {
        return null;
    }

    const safeDuration = Math.max(0.2, duration || state.duration || 1);
    const bones = state.skeleton.bones;
    const sampleCount = Math.max(2, Math.ceil(safeDuration * fps));
    const times = [];
    const tracks = [];
    const originalTime = state.mixer.time;

    const boneData = bones.map((bone) => ({
        bone,
        pos: [],
        quat: [],
        scl: []
    }));

    const morphData = [];
    state.morphEntries.forEach((entry) => {
        if (!entry.mesh.name) {
            entry.mesh.name = `MorphMesh_${entry.mesh.uuid.slice(0, 8)}`;
        }
        morphData.push({
            mesh: entry.mesh,
            index: entry.index,
            values: []
        });
    });

    for (let i = 0; i <= sampleCount; i += 1) {
        const t = (i / sampleCount) * safeDuration;
        times.push(t);
        state.mixer.setTime(t);
        state.avatarRoot.updateMatrixWorld(true);

        boneData.forEach((entry) => {
            entry.pos.push(entry.bone.position.x, entry.bone.position.y, entry.bone.position.z);
            entry.quat.push(entry.bone.quaternion.x, entry.bone.quaternion.y, entry.bone.quaternion.z, entry.bone.quaternion.w);
            entry.scl.push(entry.bone.scale.x, entry.bone.scale.y, entry.bone.scale.z);
        });

        morphData.forEach((entry) => {
            const value = entry.mesh.morphTargetInfluences?.[entry.index] ?? 0;
            entry.values.push(value);
        });
    }

    boneData.forEach((entry) => {
        tracks.push(new THREE.VectorKeyframeTrack(`${entry.bone.name}.position`, times, entry.pos));
        tracks.push(new THREE.QuaternionKeyframeTrack(`${entry.bone.name}.quaternion`, times, entry.quat));
        tracks.push(new THREE.VectorKeyframeTrack(`${entry.bone.name}.scale`, times, entry.scl));
    });

    morphData.forEach((entry) => {
        tracks.push(new THREE.NumberKeyframeTrack(`${entry.mesh.name}.morphTargetInfluences[${entry.index}]`, times, entry.values));
    });

    state.mixer.setTime(originalTime);
    return new THREE.AnimationClip("BakedStack", safeDuration, tracks);
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportEditorCompatibleJSON() {
    if (!state.avatarRoot) {
        pushLog("warn", "Nothing to export.");
        return;
    }

    const sceneJSON = scene.toJSON();
    const payload = {
        metadata: {
            app: "BOIS Mixamo Prototype",
            version: 1
        },
        scene: sceneJSON,
        camera: camera.toJSON(),
        appState: {
            layers: state.layers.map((layer) => ({
                clipName: layer.clipName,
                weight: layer.weight,
                mask: layer.mask,
                blend: layer.blend,
                muted: Boolean(layer.muted),
                solo: Boolean(layer.solo)
            })),
            morphState: snapshotMorphState(),
            loop: state.loop,
            speed: state.speed,
            boneOffsets: Object.fromEntries(state.boneOffsets)
        }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob("boi-editor-setup.json", blob);
    pushLog("info", "Exported editor-compatible setup JSON.");
}

async function importSetupJSON(file) {
    try {
        const raw = await file.text();
        const json = JSON.parse(raw);
        if (!json.scene) {
            throw new Error("Missing scene object.");
        }

        const loader = new THREE.ObjectLoader();
        const loadedScene = loader.parse(json.scene);
        let avatar = null;
        loadedScene.traverse((node) => {
            if (!avatar && node.isSkinnedMesh) {
                avatar = node.parent || node;
            }
        });

        if (!avatar) {
            throw new Error("No skinned mesh found in imported scene JSON.");
        }

        attachAvatar(avatar, loadedScene.animations || [], file.name);

        if (json.appState?.morphState) {
            applyMorphState(json.appState.morphState);
            scheduleMorphRefresh();
        }

        if (Array.isArray(json.appState?.layers)) {
            clearLayers();
            json.appState.layers.forEach((layer) => addLayer(layer));
        }

        if (json.appState?.boneOffsets) {
            state.boneOffsets.clear();
            Object.entries(json.appState.boneOffsets).forEach(([bone, offset]) => {
                state.boneOffsets.set(bone, {
                    x: Number(offset.x) || 0,
                    y: Number(offset.y) || 0,
                    z: Number(offset.z) || 0
                });
            });
            repopulateOffsetBoneSelect();
        }

        pushLog("info", "Imported setup JSON.");
    } catch (error) {
        pushLog("error", `Failed to import setup JSON: ${error.message}`, error);
    }
}

async function exportBakedGLB() {
    if (!state.avatarRoot) {
        pushLog("warn", "Load an avatar before exporting GLB.");
        return;
    }

    try {
        const bakedClip = bakeCurrentAnimationToClip(state.duration || 1, 30);
        const exportRoot = SkeletonUtils.clone(state.avatarRoot);
        const exporter = new GLTFExporter();
        exporter.parse(
            exportRoot,
            (result) => {
                const blob = new Blob([result], { type: "model/gltf-binary" });
                downloadBlob("boi-baked.glb", blob);
                pushLog("info", "Exported baked GLB.");
            },
            (error) => {
                pushLog("error", `GLB export failed: ${error.message}`, error);
            },
            {
                binary: true,
                animations: bakedClip ? [bakedClip] : []
            }
        );
    } catch (error) {
        pushLog("error", `GLB export failed: ${error.message}`, error);
    }
}

function buildBoneMap(sourceSkeleton, targetSkeleton, targetSurfaceMesh) {
    const targetByNormalized = new Map();
    const targetByCanonical = new Map();
    targetSkeleton.bones.forEach((bone) => {
        const normalized = normalizeBoneName(bone.name);
        targetByNormalized.set(normalized, bone.name);
        const canonical = canonicalBoneName(normalized);
        if (canonical && !targetByCanonical.has(canonical)) {
            targetByCanonical.set(canonical, bone.name);
        }
    });

    const map = new Map();
    const srcWorld = new THREE.Vector3();
    const matchPoint = new THREE.Vector3();
    const tgtWorld = new THREE.Vector3();
    const srcLocal = new THREE.Vector3();
    const closestLocal = new THREE.Vector3();

    sourceSkeleton.bones.forEach((sourceBone) => {
        const normalized = normalizeBoneName(sourceBone.name);
        if (targetByNormalized.has(normalized)) {
            map.set(sourceBone.name, targetByNormalized.get(normalized));
            return;
        }

        const sourceCanonical = canonicalBoneName(normalized);
        if (sourceCanonical && targetByCanonical.has(sourceCanonical)) {
            map.set(sourceBone.name, targetByCanonical.get(sourceCanonical));
            return;
        }

        sourceBone.getWorldPosition(srcWorld);
        matchPoint.copy(srcWorld);

        if (targetSurfaceMesh?.geometry?.boundsTree) {
            srcLocal.copy(srcWorld);
            targetSurfaceMesh.worldToLocal(srcLocal);
            targetSurfaceMesh.geometry.boundsTree.closestPointToPoint(srcLocal, closestLocal);
            matchPoint.copy(closestLocal);
            targetSurfaceMesh.localToWorld(matchPoint);
        }

        let nearest = null;
        let nearestDist = Infinity;
        targetSkeleton.bones.forEach((targetBone) => {
            targetBone.getWorldPosition(tgtWorld);
            const dist = matchPoint.distanceToSquared(tgtWorld);
            if (dist < nearestDist) {
                nearest = targetBone.name;
                nearestDist = dist;
            }
        });

        if (nearest) {
            map.set(sourceBone.name, nearest);
        }
    });

    return map;
}

function canonicalBoneName(normalized) {
    const side = normalized.includes("left") ? "left" : normalized.includes("right") ? "right" : "center";
    const key = `${side}:`;
    if (/hips|pelvis/.test(normalized)) {
        return `${key}hips`;
    }
    if (/spine/.test(normalized)) {
        return `${key}spine`;
    }
    if (/chest/.test(normalized)) {
        return `${key}chest`;
    }
    if (/neck/.test(normalized)) {
        return `${key}neck`;
    }
    if (/head/.test(normalized)) {
        return `${key}head`;
    }
    if (/shoulder|clavicle/.test(normalized)) {
        return `${side}:shoulder`;
    }
    if (/upperarm|arm/.test(normalized) && !/forearm/.test(normalized)) {
        return `${side}:upperarm`;
    }
    if (/forearm|lowerarm/.test(normalized)) {
        return `${side}:forearm`;
    }
    if (/hand|wrist/.test(normalized)) {
        return `${side}:hand`;
    }
    if (/upperleg|thigh/.test(normalized)) {
        return `${side}:thigh`;
    }
    if (/lowerleg|calf|shin|leg/.test(normalized) && !/upper/.test(normalized)) {
        return `${side}:calf`;
    }
    if (/foot|ankle/.test(normalized)) {
        return `${side}:foot`;
    }
    if (/toe/.test(normalized)) {
        return `${side}:toe`;
    }
    return normalized || "";
}

function applyOffsetToQuaternionValues(values, offsetEuler) {
    if (!offsetEuler) {
        return values;
    }
    const q = new THREE.Quaternion();
    const offset = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
            THREE.MathUtils.degToRad(offsetEuler.x),
            THREE.MathUtils.degToRad(offsetEuler.y),
            THREE.MathUtils.degToRad(offsetEuler.z),
            "XYZ"
        )
    );

    const out = values.slice();
    for (let i = 0; i < out.length; i += 4) {
        q.set(out[i], out[i + 1], out[i + 2], out[i + 3]);
        q.multiply(offset);
        out[i] = q.x;
        out[i + 1] = q.y;
        out[i + 2] = q.z;
        out[i + 3] = q.w;
    }
    return out;
}

function retargetClip(sourceClip, sourceSkeleton, targetSkeleton) {
    const map = buildBoneMap(sourceSkeleton, targetSkeleton, state.skinnedMeshes[0] || null);
    const tracks = [];

    sourceClip.tracks.forEach((track) => {
        if (track.name.includes("morphTargetInfluences")) {
            return;
        }

        const parts = track.name.split(".");
        if (parts.length < 2) {
            return;
        }

        const sourceBoneName = parts[0];
        const property = parts.slice(1).join(".");
        const targetBoneName = map.get(sourceBoneName);
        if (!targetBoneName) {
            return;
        }

        const newName = `${targetBoneName}.${property}`;
        if (track instanceof THREE.QuaternionKeyframeTrack) {
            const offset = state.boneOffsets.get(targetBoneName);
            const values = applyOffsetToQuaternionValues(Array.from(track.values), offset);
            tracks.push(new THREE.QuaternionKeyframeTrack(newName, Array.from(track.times), values));
        } else if (track instanceof THREE.VectorKeyframeTrack) {
            tracks.push(new THREE.VectorKeyframeTrack(newName, Array.from(track.times), Array.from(track.values)));
        } else if (track instanceof THREE.NumberKeyframeTrack) {
            tracks.push(new THREE.NumberKeyframeTrack(newName, Array.from(track.times), Array.from(track.values)));
        }
    });

    if (tracks.length === 0) {
        return { clip: null, map, generatedTrackCount: 0 };
    }
    return {
        clip: new THREE.AnimationClip(`${sourceClip.name}_retargeted`, sourceClip.duration, tracks),
        map,
        generatedTrackCount: tracks.length
    };
}

function updateRetargetSourceList() {
    if (!ui.sourceClipSelect) {
        return;
    }
    ui.sourceClipSelect.innerHTML = "";
    state.sourceClips.forEach((clip) => {
        const option = document.createElement("option");
        option.value = clip.name;
        option.textContent = clip.name;
        ui.sourceClipSelect.appendChild(option);
    });

    if (state.sourceClips.length > 0) {
        renderRetargetReport([
            `Source ready: ${state.sourceClips.length} clip(s).`,
            `Source skeleton bones: ${state.sourceSkeleton?.bones?.length || 0}`,
            `Target skeleton bones: ${state.skeleton?.bones?.length || 0}`,
            "Click Retarget Selected Clip to generate a mapped clip."
        ]);
    }
}

function runRetargetSelectedClip() {
    if (!state.skeleton || !state.sourceSkeleton || state.sourceClips.length === 0) {
        pushLog("warn", "Retarget requires source clips and a target Mixamo skeleton.");
        return;
    }
    const selectedName = ui.sourceClipSelect?.value || state.sourceClips[0].name;
    const sourceClip = state.sourceClips.find((clip) => clip.name === selectedName) || state.sourceClips[0];

    const result = retargetClip(sourceClip, state.sourceSkeleton, state.skeleton);
    if (!result.clip) {
        pushLog("warn", "Retarget produced no tracks. Check skeleton mapping.");
        renderRetargetReport([
            `Source clip: ${sourceClip.name}`,
            "No output tracks were generated.",
            "Try adjusting bone offsets or using a different source clip."
        ]);
        return;
    }

    state.clips.push(result.clip);
    renderAnimationList();
    renderRetargetReport(buildRetargetReport(sourceClip, state.sourceSkeleton, state.skeleton, result.map, result.generatedTrackCount));
    pushLog("info", `Retargeted clip created: ${result.clip.name}`);
}

function skeletonCompatibilityScore(sourceSkeleton, targetSkeleton) {
    if (!sourceSkeleton || !targetSkeleton) {
        return 0;
    }

    const sourceSet = new Set(sourceSkeleton.bones.map((bone) => normalizeBoneName(bone.name)).filter(Boolean));
    const targetSet = new Set(targetSkeleton.bones.map((bone) => normalizeBoneName(bone.name)).filter(Boolean));

    if (sourceSet.size === 0 || targetSet.size === 0) {
        return 0;
    }

    let matches = 0;
    sourceSet.forEach((name) => {
        if (targetSet.has(name)) {
            matches += 1;
        }
    });

    return matches / Math.max(sourceSet.size, targetSet.size);
}

function loadAsPrimaryAvatarFromFile(file) {
    return parseAsset(file).then(({ root, animations, label }) => {
        if (getFileType(file.name) === "bvh") {
            throw new Error("BVH files are animation-only. Use Cargar animacion or the Retarget panel.");
        }
        attachAvatar(root, animations, label);
    });
}

async function loadAnimationSourceFile(file, options = {}) {
    try {
        const ext = getFileType(file.name);
        const { root, animations, label, sourceSkeleton: parsedSkeleton } = await parseAsset(file);
        const sourceSkeleton = parsedSkeleton || getFirstSkinnedMesh(root)?.skeleton || null;

        if (!state.avatarRoot) {
            if (ext === "bvh") {
                pushLog("warn", "Load a target Mixamo model before importing BVH animations.");
                return;
            }
            attachAvatar(root, animations, label);
            return;
        }

        if (!animations || animations.length === 0) {
            pushLog("warn", `No animations found in ${label}.`);
            return;
        }

        if (sourceSkeleton && state.skeleton) {
            const compat = skeletonCompatibilityScore(sourceSkeleton, state.skeleton);
            const forceRetarget = Boolean(options.forceRetargetSource) || ext === "bvh";

            if (!forceRetarget && compat >= 0.55) {
                appendClips(animations, options.prefix || "");
                pushLog("info", `Imported ${animations.length} compatible clip(s) from ${label} (score ${compat.toFixed(2)}).`);
                return;
            }

            state.sourceSkeleton = sourceSkeleton;
            state.sourceClips = animations;
            updateRetargetSourceList();
            pushLog("info", `Loaded ${animations.length} source clip(s) for retarget from ${label} (score ${compat.toFixed(2)}).`);
            return;
        }

        appendClips(animations, options.prefix || "import");
        pushLog("info", `Imported ${animations.length} animation clip(s) from ${label}.`);
    } catch (error) {
        pushLog("error", `Animation load failed for ${file.name}: ${error.message}`, error);
    }
}

async function loadAnimationSourceFromUrl(url, options = {}) {
    try {
        const ext = getFileType(url);
        const { root, animations, label, sourceSkeleton: parsedSkeleton } = await parseAssetFromUrl(resolveCatalogAssetPath(url));
        const sourceLabel = options.label || label || url;
        const sourceSkeleton = parsedSkeleton || getFirstSkinnedMesh(root)?.skeleton || null;

        if (!state.avatarRoot) {
            if (ext === "bvh") {
                pushLog("warn", "Load a target Mixamo model before importing BVH animations.");
                return;
            }
            attachAvatar(root, animations, sourceLabel);
            return;
        }

        if (!animations || animations.length === 0) {
            pushLog("warn", `No animations found in ${sourceLabel}.`);
            return;
        }

        if (sourceSkeleton && state.skeleton) {
            const compat = skeletonCompatibilityScore(sourceSkeleton, state.skeleton);
            const forceRetarget = Boolean(options.forceRetargetSource) || ext === "bvh";

            if (!forceRetarget && compat >= 0.55) {
                appendClips(animations, options.prefix || "");
                pushLog("info", `Imported ${animations.length} compatible clip(s) from ${sourceLabel} (score ${compat.toFixed(2)}).`);
                return;
            }

            state.sourceSkeleton = sourceSkeleton;
            state.sourceClips = animations;
            updateRetargetSourceList();
            pushLog("info", `Loaded ${animations.length} source clip(s) for retarget from ${sourceLabel} (score ${compat.toFixed(2)}).`);
            return;
        }

        appendClips(animations, options.prefix || "import");
        pushLog("info", `Imported ${animations.length} animation clip(s) from ${sourceLabel}.`);
    } catch (error) {
        pushLog("error", `Animation load failed for ${url}: ${error.message}`, error);
    }
}

async function loadCatalogModel(modelId, { loadAssignedAnimations = false } = {}) {
    const model = getCatalogModelById(modelId);
    if (!model) {
        throw new Error(`Unknown model id: ${modelId}`);
    }

    setBadge(`Loading ${model.name}...`);
    const parsed = await parseAssetFromUrl(resolveCatalogAssetPath(model.modelPath));
    attachAvatar(parsed.root, parsed.animations, model.name);
    state.activeModelId = model.id;
    state.loadedCatalogAnimations.clear();

    if (ui.catalogModelSelect) {
        ui.catalogModelSelect.value = model.id;
    }

    await updateModelBio(model);

    if (loadAssignedAnimations) {
        await loadAssignedAnimationsForModel(model.id);
    }
}

async function loadAssignedAnimationsForModel(modelId) {
    const model = getCatalogModelById(modelId);
    if (!model) {
        pushLog("warn", `Model ${modelId} not found for assigned animations.`);
        return;
    }

    if (!Array.isArray(model.defaultAnimations) || model.defaultAnimations.length === 0) {
        pushLog("info", `${model.name} has no assigned animations in manifest.`);
        return;
    }

    const tasks = model.defaultAnimations.filter((path) => !state.loadedCatalogAnimations.has(path));
    if (tasks.length === 0) {
        pushLog("info", "Assigned animations were already loaded.");
        return;
    }

    for (const path of tasks) {
        await loadAnimationSourceFromUrl(path, { prefix: "catalog" });
        state.loadedCatalogAnimations.add(path);
    }
}

async function loadCatalogBVHSource() {
    if (!ui.catalogBVHSelect || !state.manifest) {
        return;
    }
    const bvhId = ui.catalogBVHSelect.value;
    const entry = state.manifest.bvhLibrary.find((item) => item.id === bvhId);
    if (!entry) {
        pushLog("warn", "Select a BVH from the library first.");
        return;
    }
    await loadAnimationSourceFromUrl(entry.path, { forceRetargetSource: true, prefix: "bvh" });
}

function readFilesFromDrop(event) {
    const files = [];
    if (event.dataTransfer?.files) {
        for (const file of event.dataTransfer.files) {
            files.push(file);
        }
    }
    return files;
}

function handleDropFiles(files) {
    if (files.length === 0) {
        return;
    }

    const modelCandidates = files.filter((file) => {
        const ext = getFileType(file.name);
        return ext === "fbx" || ext === "glb" || ext === "gltf";
    });
    const animationCandidates = files.filter((file) => {
        const ext = getFileType(file.name);
        return ext === "fbx" || ext === "glb" || ext === "gltf" || ext === "bvh";
    });

    if (animationCandidates.length === 0) {
        pushLog("warn", "No supported FBX/GLB/GLTF/BVH files found in drop.");
        return;
    }

    if (!state.avatarRoot) {
        if (modelCandidates.length === 0) {
            pushLog("warn", "Drop includes only animation files. Load a base avatar first.");
            return;
        }

        loadAsPrimaryAvatarFromFile(modelCandidates[0]).catch((error) => {
            pushLog("error", `Model load failed: ${error.message}`, error);
        });
        animationCandidates
            .filter((file) => file !== modelCandidates[0])
            .forEach((file) => loadAnimationSourceFile(file));
        return;
    }

    animationCandidates.forEach((file) => {
        loadAnimationSourceFile(file);
    });
}

function onPointerDown(event) {
    if (!state.avatarRoot) {
        return;
    }
    const rect = ui.view.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.firstHitOnly = state.bvhPicking;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([state.avatarRoot], true);
    if (hits.length > 0) {
        transformControls.attach(state.avatarRoot);
        transformControls.visible = true;
    }
}

function onTimelineInput() {
    if (!ui.timeline || !state.mixer) {
        return;
    }
    const t = (Number(ui.timeline.value) / 1000) * state.duration;
    state.timelineScrubbing = true;
    state.mixer.setTime(t);
    updateTimeReadout(t);
}

function onTimelineChange() {
    state.timelineScrubbing = false;
}

function stepInput(input, delta, min = -Infinity, max = Infinity) {
    if (!input) {
        return;
    }
    const current = Number(input.value) || 0;
    const next = THREE.MathUtils.clamp(current + delta, min, max);
    input.value = String(Math.round(next));
    input.dispatchEvent(new Event("input"));
}

function nudgeAvatar(dx = 0, dz = 0) {
    if (!state.avatarRoot) {
        return;
    }
    state.avatarRoot.position.x += dx;
    state.avatarRoot.position.z += dz;
}

function spinAvatar(deltaRadians) {
    if (!state.avatarRoot) {
        return;
    }
    state.avatarRoot.rotation.y += deltaRadians;
}

function setGizmoMode(mode) {
    transformControls.setMode(mode);
}

function resetAvatarTransform() {
    if (!state.avatarRoot) {
        return;
    }
    centerAndFit(state.avatarRoot);
    state.avatarRoot.rotation.set(0, 0, 0);
    state.avatarRoot.updateMatrixWorld(true);
}

function bindUI() {
    ui.scaleInput?.addEventListener("input", () => {
        if (!state.avatarRoot) {
            return;
        }
        const value = Number(ui.scaleInput.value) / 100;
        state.avatarRoot.scale.setScalar(state.fitScale * value);
    });

    ui.rotateInput?.addEventListener("input", () => {
        state.autoRotateSpeed = Number(ui.rotateInput.value) / 100;
    });

    ui.lightInput?.addEventListener("input", () => {
        const intensity = Number(ui.lightInput.value) / 100;
        keyLight.intensity = intensity;
        hemiLight.intensity = Math.max(0.2, intensity * 0.75);
    });

    ui.speedInput?.addEventListener("input", () => {
        state.speed = Number(ui.speedInput.value) / 100;
    });

    ui.rimToggle?.addEventListener("click", () => {
        state.rim = !state.rim;
        rimLight.visible = state.rim;
        ui.rimToggle.textContent = `Rim light: ${state.rim ? "ON" : "OFF"}`;
    });

    ui.wireToggle?.addEventListener("click", () => {
        state.wireframe = !state.wireframe;
        updateWireframe();
        ui.wireToggle.textContent = `Wireframe: ${state.wireframe ? "ON" : "OFF"}`;
    });

    ui.envToggle?.addEventListener("click", () => {
        state.useEnvironment = !state.useEnvironment;
        updateEnvironment();
    });

    ui.gridToggle?.addEventListener("click", () => {
        state.grid = !state.grid;
        gridHelper.visible = state.grid;
        ui.gridToggle.textContent = `Grid: ${state.grid ? "ON" : "OFF"}`;
    });

    ui.groundToggle?.addEventListener("click", () => {
        state.ground = !state.ground;
        ground.visible = state.ground;
        ui.groundToggle.textContent = `Ground: ${state.ground ? "ON" : "OFF"}`;
    });

    ui.helperToggle?.addEventListener("click", () => {
        state.helpers = !state.helpers;
        axesHelper.visible = state.helpers;
        ui.helperToggle.textContent = `Unit Helpers: ${state.helpers ? "ON" : "OFF"}`;
    });

    ui.turntableToggle?.addEventListener("click", () => {
        state.turntableLights = !state.turntableLights;
        ui.turntableToggle.textContent = `Turntable Lights: ${state.turntableLights ? "ON" : "OFF"}`;
    });

    ui.bvhToggle?.addEventListener("click", () => {
        state.bvhPicking = !state.bvhPicking;
        ui.bvhToggle.textContent = `BVH Picking: ${state.bvhPicking ? "ON" : "OFF"}`;
    });

    ui.loadLocalBtn?.addEventListener("click", () => ui.localFileInput?.click());
    ui.localFileInput?.addEventListener("change", async () => {
        const file = ui.localFileInput?.files?.[0];
        if (!file) {
            return;
        }
        try {
            setBadge(`Loading ${file.name}...`);
            await loadAsPrimaryAvatarFromFile(file);
        } catch (error) {
            pushLog("error", `Avatar load failed: ${error.message}`, error);
        }
        ui.localFileInput.value = "";
    });

    ui.loadAnimBtn?.addEventListener("click", () => ui.animFileInput?.click());
    ui.animFileInput?.addEventListener("change", async () => {
        const files = Array.from(ui.animFileInput?.files || []);
        if (files.length === 0) {
            return;
        }
        for (const file of files) {
            await loadAnimationSourceFile(file);
        }
        ui.animFileInput.value = "";
    });

    ui.catalogModelSelect?.addEventListener("change", async () => {
        const modelId = ui.catalogModelSelect.value;
        if (!modelId) {
            return;
        }
        try {
            await updateModelBio(getCatalogModelById(modelId));
        } catch (error) {
            pushLog("warn", `Unable to update bio: ${error.message}`);
        }
    });

    ui.catalogLoadModelBtn?.addEventListener("click", async () => {
        const modelId = ui.catalogModelSelect?.value;
        if (!modelId) {
            pushLog("warn", "Select a BOI model first.");
            return;
        }
        try {
            await loadCatalogModel(modelId, { loadAssignedAnimations: true });
        } catch (error) {
            pushLog("error", `Catalog model load failed: ${error.message}`, error);
        }
    });

    ui.catalogLoadAssignedBtn?.addEventListener("click", async () => {
        const modelId = ui.catalogModelSelect?.value || state.activeModelId;
        if (!modelId) {
            pushLog("warn", "No active model selected.");
            return;
        }
        await loadAssignedAnimationsForModel(modelId);
    });

    ui.catalogImportFolderBtn?.addEventListener("click", async () => {
        try {
            await importCatalogFromFolderPicker();
        } catch (error) {
            if (error?.name === "AbortError") {
                pushLog("info", "Local folder selection cancelled.");
                return;
            }
            pushLog("error", `Local catalog import failed: ${error.message}`, error);
        }
    });

    ui.catalogFolderInput?.addEventListener("change", async () => {
        const files = Array.from(ui.catalogFolderInput.files || []);
        if (files.length === 0) {
            return;
        }
        const entries = files.map((file) => ({
            file,
            relativePath: file.webkitRelativePath || file.name
        }));
        try {
            await importCatalogFromEntries(entries);
        } catch (error) {
            pushLog("error", `Local catalog import failed: ${error.message}`, error);
        }
        ui.catalogFolderInput.value = "";
    });

    ui.catalogResetSourceBtn?.addEventListener("click", () => {
        resetToManifestCatalog();
    });

    ui.catalogAddAnimationBtn?.addEventListener("click", async () => {
        const animationId = ui.catalogAnimationSelect?.value;
        const animation = state.manifest?.animationLibrary.find((entry) => entry.id === animationId);
        if (!animation) {
            pushLog("warn", "Select an animation from the library.");
            return;
        }
        await loadAnimationSourceFromUrl(animation.path, { prefix: "library" });
    });

    ui.catalogAddAllBtn?.addEventListener("click", async () => {
        if (!state.manifest?.animationLibrary?.length) {
            pushLog("warn", "Animation library is empty.");
            return;
        }
        for (const animation of state.manifest.animationLibrary) {
            await loadAnimationSourceFromUrl(animation.path, { prefix: "library" });
        }
    });

    ui.catalogLoadBVHBtn?.addEventListener("click", async () => {
        await loadCatalogBVHSource();
    });

    ui.addLayerBtn?.addEventListener("click", () => addLayer());
    ui.clearLayersBtn?.addEventListener("click", () => clearLayers());

    ui.playToggle?.addEventListener("click", () => {
        state.isPlaying = !state.isPlaying;
        if (state.mixer) {
            state.layers.forEach((layer) => {
                if (layer.action) {
                    layer.action.paused = !state.isPlaying;
                }
            });
        }
        ui.playToggle.textContent = state.isPlaying ? "Pause" : "Play";
    });

    ui.loopToggle?.addEventListener("change", () => {
        state.loop = Boolean(ui.loopToggle.checked);
        state.layers.forEach((layer) => {
            if (!layer.action) {
                return;
            }
            layer.action.setLoop(state.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
            layer.action.clampWhenFinished = !state.loop;
        });
    });

    ui.timeline?.addEventListener("input", onTimelineInput);
    ui.timeline?.addEventListener("change", onTimelineChange);

    ui.framePrevBtn?.addEventListener("click", () => stepTimelineByFrames(-1));
    ui.frameNextBtn?.addEventListener("click", () => stepTimelineByFrames(1));

    ui.transportPrevBtn?.addEventListener("click", () => stepTimelineByFrames(-1));
    ui.transportPlayBtn?.addEventListener("click", () => ui.playToggle?.click());
    ui.transportNextBtn?.addEventListener("click", () => stepTimelineByFrames(1));

    ui.navUpBtn?.addEventListener("click", () => nudgeAvatar(0, -0.06));
    ui.navDownBtn?.addEventListener("click", () => nudgeAvatar(0, 0.06));
    ui.navLeftBtn?.addEventListener("click", () => nudgeAvatar(-0.06, 0));
    ui.navRightBtn?.addEventListener("click", () => nudgeAvatar(0.06, 0));
    ui.navCenterBtn?.addEventListener("click", () => resetAvatarTransform());

    ui.speedDownBtn?.addEventListener("click", () => stepInput(ui.speedInput, -5, 10, 200));
    ui.speedUpBtn?.addEventListener("click", () => stepInput(ui.speedInput, 5, 10, 200));
    ui.lightDownBtn?.addEventListener("click", () => stepInput(ui.lightInput, -5, 20, 220));
    ui.lightUpBtn?.addEventListener("click", () => stepInput(ui.lightInput, 5, 20, 220));
    ui.scaleDownBtn?.addEventListener("click", () => stepInput(ui.scaleInput, -5, 35, 180));
    ui.scaleUpBtn?.addEventListener("click", () => stepInput(ui.scaleInput, 5, 35, 180));
    ui.turnLeftBtn?.addEventListener("click", () => spinAvatar(THREE.MathUtils.degToRad(8)));
    ui.turnRightBtn?.addEventListener("click", () => spinAvatar(THREE.MathUtils.degToRad(-8)));

    ui.morphResetBtn?.addEventListener("click", () => {
        state.morphEntries.forEach((entry) => {
            entry.mesh.morphTargetInfluences[entry.index] = 0;
        });
        scheduleMorphRefresh();
    });

    ui.morphRandomBtn?.addEventListener("click", () => {
        state.morphEntries.forEach((entry) => {
            entry.mesh.morphTargetInfluences[entry.index] = THREE.MathUtils.lerp(-0.2, 1, Math.random());
        });
        scheduleMorphRefresh();
    });

    ui.morphSaveBtn?.addEventListener("click", () => {
        state.savedMorphState = snapshotMorphState();
        pushLog("info", "Morph state saved.");
    });

    ui.morphRestoreBtn?.addEventListener("click", () => {
        if (!state.savedMorphState) {
            pushLog("warn", "No morph state saved yet.");
            return;
        }
        applyMorphState(state.savedMorphState);
        scheduleMorphRefresh();
        pushLog("info", "Morph state restored.");
    });

    ui.retargetBtn?.addEventListener("click", runRetargetSelectedClip);
    ui.offsetBoneSelect?.addEventListener("change", () => {
        readCurrentOffsetSliders(ui.offsetBoneSelect.value);
    });
    ui.offsetX?.addEventListener("input", updateOffsetFromSliders);
    ui.offsetY?.addEventListener("input", updateOffsetFromSliders);
    ui.offsetZ?.addEventListener("input", updateOffsetFromSliders);

    ui.gizmoTranslate?.addEventListener("click", () => setGizmoMode("translate"));
    ui.gizmoRotate?.addEventListener("click", () => setGizmoMode("rotate"));
    ui.gizmoScale?.addEventListener("click", () => setGizmoMode("scale"));
    ui.gizmoReset?.addEventListener("click", resetAvatarTransform);

    ui.snapTranslate?.addEventListener("input", () => {
        const cm = Number(ui.snapTranslate.value);
        transformControls.setTranslationSnap(cm > 0 ? cm / 100 : null);
    });
    ui.snapRotate?.addEventListener("input", () => {
        const deg = Number(ui.snapRotate.value);
        transformControls.setRotationSnap(deg > 0 ? THREE.MathUtils.degToRad(deg) : null);
    });

    ui.exportJsonBtn?.addEventListener("click", exportEditorCompatibleJSON);
    ui.exportGlbBtn?.addEventListener("click", exportBakedGLB);

    ui.importJsonBtn?.addEventListener("click", () => ui.importJsonFile?.click());
    ui.importJsonFile?.addEventListener("change", async () => {
        const file = ui.importJsonFile?.files?.[0];
        if (!file) {
            return;
        }
        await importSetupJSON(file);
        ui.importJsonFile.value = "";
    });

    ui.view.addEventListener("pointerdown", onPointerDown);

    ["dragenter", "dragover"].forEach((type) => {
        ui.view.addEventListener(type, (event) => {
            event.preventDefault();
            ui.view.classList.add("is-drag-over");
        });
    });

    ["dragleave", "drop"].forEach((type) => {
        ui.view.addEventListener(type, (event) => {
            event.preventDefault();
            ui.view.classList.remove("is-drag-over");
        });
    });

    ui.view.addEventListener("drop", (event) => {
        handleDropFiles(readFilesFromDrop(event));
    });

    ui.presetGroup?.querySelectorAll("button[data-preset]").forEach((button) => {
        button.addEventListener("click", () => {
            ui.presetGroup.querySelectorAll("button").forEach((item) => item.classList.remove("is-active"));
            button.classList.add("is-active");

            const presets = {
                neutral: { scale: 100, rotate: 16, light: 115 },
                hero: { scale: 118, rotate: 10, light: 145 },
                compact: { scale: 84, rotate: 24, light: 95 }
            };
            const preset = presets[button.dataset.preset] || presets.neutral;

            if (ui.scaleInput) {
                ui.scaleInput.value = String(preset.scale);
                ui.scaleInput.dispatchEvent(new Event("input"));
            }
            if (ui.rotateInput) {
                ui.rotateInput.value = String(preset.rotate);
                ui.rotateInput.dispatchEvent(new Event("input"));
            }
            if (ui.lightInput) {
                ui.lightInput.value = String(preset.light);
                ui.lightInput.dispatchEvent(new Event("input"));
            }
        });
    });
}

function animate() {
    const dt = clock.getDelta();

    if (state.avatarRoot) {
        state.avatarRoot.rotation.y += dt * state.autoRotateSpeed;
    }

    if (state.turntableLights) {
        lightRig.rotation.y += dt * 0.25;
    }

    if (state.mixer && state.isPlaying && !state.timelineScrubbing) {
        state.mixer.update(dt * state.speed);
    }

    if (ui.timeline && state.duration > 0 && state.mixer && !state.timelineScrubbing) {
        const safeTime = (state.mixer.time % state.duration) / state.duration;
        ui.timeline.value = String(Math.round(safeTime * 1000));
    }

    if (state.mixer) {
        updateTimeReadout(state.mixer.time);
    }

    controls.update();
    renderer.render(scene, camera);
    refreshPerformanceBadge(dt);
    requestAnimationFrame(animate);
}

async function loadDefaultAvatar() {
    const candidates = [
        "./utsuwa_3d/Franko_mixamo_T-Pose.fbx",
        "./utsuwa_3d/TEST_BOI_3D.fbx",
        "./utsuwa_3d/TEST_BOI_3D_01.glb",
        "./utsuwa_3d/MENU_3D BOY.glb"
    ];

    for (const candidate of candidates) {
        try {
            setBadge(`Loading ${candidate}...`);
            const result = await parseAssetFromUrl(candidate);
            attachAvatar(result.root, result.animations, candidate);
            return;
        } catch {
            // Continue to next candidate.
        }
    }

    const proxy = createProceduralAvatarProxy();
    attachAvatar(proxy, [], "Proxy avatar");
    setBadge("Proxy avatar active. Import FBX/GLB to replace it.");
    pushLog("warn", "Default avatar not found. Procedural proxy avatar activated.");
}

async function initializeCatalog() {
    if (window.location.protocol === "file:") {
        pushLog("warn", "You are running in file:// mode. FBX/GLB loading may be blocked by browser security; use a local HTTP server for reliable loading.");
        if (!state.avatarRoot) {
            attachAvatar(createProceduralAvatarProxy(), [], "Proxy avatar");
            setBadge("Proxy avatar active (file:// mode).");
        }
    }

    state.manifestDefault = await loadManifest();
    state.manifest = normalizeManifest(state.manifestDefault);
    const startup = getStartupOverrides();
    const requestedModel = startup.modelId && getCatalogModelById(startup.modelId) ? startup.modelId : "";
    state.activeModelId = requestedModel || state.manifest.defaultModelId;
    populateCatalogUI();

    const defaultModel = getCatalogModelById(state.activeModelId || state.manifest.defaultModelId);
    if (!defaultModel) {
        pushLog("warn", "Manifest default model was not found. Falling back to legacy candidates.");
        await loadDefaultAvatar();
        return;
    }

    try {
        await loadCatalogModel(defaultModel.id, { loadAssignedAnimations: startup.hasLoadAssigned ? startup.loadAssigned : true });
        renderRetargetReport(["No retarget operation yet."]);
    } catch (error) {
        pushLog("error", `Default catalog model load failed: ${error.message}`, error);
        await loadDefaultAvatar();
    }
}

bindUI();
updateEnvironment();
resize();
animate();
window.addEventListener("resize", resize);
initializeCatalog().catch((error) => {
    pushLog("error", `Catalog bootstrap failed: ${error.message}`, error);
});
