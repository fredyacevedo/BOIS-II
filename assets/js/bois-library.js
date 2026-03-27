const ui = {
    count: document.getElementById("boi-library-count"),
    filter: document.getElementById("boi-library-filter"),
    grid: document.getElementById("boi-library-grid"),
    detailName: document.getElementById("boi-library-name"),
    detailModel: document.getElementById("boi-library-model"),
    detailAnimations: document.getElementById("boi-library-animations"),
    detailBio: document.getElementById("boi-library-bio"),
    detailStats: document.getElementById("boi-library-stats"),
    openCreate: document.getElementById("boi-library-open-create")
};

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
        }
    ]
};

let manifest = null;
let selectedModelId = "";
let selectedBioText = "";

function escapeHTML(text) {
    return String(text || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function loadManifest() {
    try {
        const response = await fetch("./assets/data/bois-manifest.json", { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch {
        return FALLBACK_MANIFEST;
    }
}

function modelCardMarkup(model) {
    const clipCount = Array.isArray(model.defaultAnimations) ? model.defaultAnimations.length : 0;
    const hasBio = Boolean(model.bioPath);
    return `
        <div class="boi-card glass-panel" data-model-id="${escapeHTML(model.id)}" role="button" tabindex="0">
            <h3>${escapeHTML(model.name || model.id)}</h3>
            <p>${escapeHTML(model.modelPath || "")}</p>
            <span class="badge">${clipCount} default clip(s)</span>
            <span class="badge">Bio: ${hasBio ? "YES" : "NO"}</span>
        </div>
    `;
}

function pickModels() {
    if (!manifest?.models?.length) {
        return [];
    }

    const query = String(ui.filter?.value || "").trim().toLowerCase();
    if (!query) {
        return manifest.models;
    }

    return manifest.models.filter((model) => {
        const name = String(model.name || "").toLowerCase();
        const path = String(model.modelPath || "").toLowerCase();
        return name.includes(query) || path.includes(query);
    });
}

function renderGrid() {
    const models = pickModels();
    if (!ui.grid) {
        return;
    }

    ui.grid.innerHTML = models.map(modelCardMarkup).join("");
    ui.count.textContent = `${models.length} BOIS`;

    ui.grid.querySelectorAll("[data-model-id]").forEach((card) => {
        card.addEventListener("click", () => selectModel(card.getAttribute("data-model-id") || ""));
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectModel(card.getAttribute("data-model-id") || "");
            }
        });
    });
}

async function loadBio(model) {
    if (!model?.bioPath) {
        selectedBioText = "No bio assigned.";
        ui.detailBio.textContent = "No bio assigned.";
        return;
    }

    try {
        const response = await fetch(model.bioPath, { cache: "no-store" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        selectedBioText = (await response.text()).trim();
        ui.detailBio.textContent = selectedBioText;
    } catch {
        selectedBioText = `Could not read bio at ${model.bioPath}`;
        ui.detailBio.textContent = selectedBioText;
    }
}

function extractBioNodes(text) {
    const lines = String(text || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 20);
    const keyed = [];
    const plain = [];

    lines.forEach((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0 && colonIndex < line.length - 1) {
            keyed.push({
                key: line.slice(0, colonIndex).trim(),
                value: line.slice(colonIndex + 1).trim()
            });
        } else {
            plain.push(line);
        }
    });

    const nodes = keyed.slice(0, 8).map((entry) => ({
        key: entry.key,
        value: entry.value
    }));

    while (nodes.length < 8 && plain.length > 0) {
        const value = plain.shift();
        nodes.push({
            key: `LINE ${nodes.length + 1}`,
            value
        });
    }

    return nodes;
}

function renderBioNodes(nodes) {
    if (!ui.detailStats) {
        return;
    }
    if (!Array.isArray(nodes) || nodes.length === 0) {
        ui.detailStats.textContent = "No stats extracted from bio.";
        return;
    }
    ui.detailStats.innerHTML = nodes.map((node) => `
        <div class="boi-stat-node">
            <span class="boi-stat-key">${escapeHTML(node.key)}</span>
            <strong class="boi-stat-value">${escapeHTML(node.value)}</strong>
        </div>
    `).join("");
}

function updateDetailHeader(model) {
    const clips = Array.isArray(model?.defaultAnimations) ? model.defaultAnimations.length : 0;
    const bioLineCount = selectedBioText ? selectedBioText.split(/\r?\n/).filter(Boolean).length : 0;
    ui.detailName.textContent = `${model?.name || model?.id || "Select a BOI"} | ${clips} clips | ${bioLineCount} bio lines`;
}

async function selectModel(modelId) {
    const model = manifest?.models?.find((item) => item.id === modelId);
    if (!model) {
        return;
    }

    selectedModelId = model.id;
    ui.detailModel.textContent = model.modelPath || "";

    const clips = Array.isArray(model.defaultAnimations) ? model.defaultAnimations : [];
    ui.detailAnimations.innerHTML = clips.length
        ? clips.map((clip) => `<div class="boi-list-item"><strong>${escapeHTML(clip.split("/").pop() || clip)}</strong></div>`).join("")
        : "No assigned animations.";

    ui.openCreate.href = `create-boi.html?model=${encodeURIComponent(model.id)}&loadAssigned=1`;
    await loadBio(model);
    renderBioNodes(extractBioNodes(selectedBioText));
    updateDetailHeader(model);

    ui.grid.querySelectorAll("[data-model-id]").forEach((card) => {
        card.classList.toggle("is-active", card.getAttribute("data-model-id") === model.id);
    });
}

async function init() {
    manifest = await loadManifest();
    if (!Array.isArray(manifest.models)) {
        manifest.models = [];
    }

    if (ui.filter) {
        ui.filter.addEventListener("input", () => {
            renderGrid();
            if (!selectedModelId || !pickModels().some((item) => item.id === selectedModelId)) {
                const first = pickModels()[0]?.id || "";
                if (first) {
                    selectModel(first);
                }
            }
        });
    }

    renderGrid();
    const firstId = manifest.defaultModelId || manifest.models[0]?.id || "";
    if (firstId) {
        await selectModel(firstId);
    }
}

init();
