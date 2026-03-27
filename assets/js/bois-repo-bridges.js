import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

// Lightweight bridges inspired by repositories in "REPOSITORIES CODE TO USE":
// - character-animation-combiner-master helpers (camera/lights pattern)
// - RiggingJs-master util/threejs.util.js (managed FBX loading)

export function addCombinerReferenceLights(scene) {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.25);
    hemi.position.set(100, 200, 400);

    const dir = new THREE.DirectionalLight(0xffffff, 0.25);
    dir.position.set(100, 200, 100);
    dir.castShadow = false;

    scene.add(hemi, dir);
    return { hemi, dir };
}

export function loadFbxWithManager(modelPath) {
    const manager = new THREE.LoadingManager();
    const loader = new FBXLoader(manager);

    return new Promise((resolve, reject) => {
        loader.load(
            modelPath,
            (object) => resolve(object),
            undefined,
            (error) => reject(error || new Error(`FBX load failed: ${modelPath}`))
        );
    });
}
