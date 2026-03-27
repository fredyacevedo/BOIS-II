import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const view = document.getElementById("menu-boy-view");
if (!view) {
    throw new Error("#menu-boy-view not found");
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.appendChild(renderer.domElement);
view.dataset.threeReady = "1";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
camera.position.set(0, 1.25, 3.3);

const hemi = new THREE.HemisphereLight(0xffffff, 0x4b4b4b, 0.9);
const key = new THREE.DirectionalLight(0xffffff, 1.05);
key.position.set(2.2, 5, 3);
const rim = new THREE.DirectionalLight(0xcbd8ff, 0.55);
rim.position.set(-2.5, 2.5, -3);
scene.add(hemi, key, rim);

const floor = new THREE.Mesh(
    new THREE.CircleGeometry(6, 64),
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.8, metalness: 0.02, transparent: true, opacity: 0.3 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
scene.add(floor);

const fbxLoader = new FBXLoader();
const clock = new THREE.Clock();
let avatar = null;

function resize() {
    const width = view.clientWidth;
    const height = view.clientHeight;
    if (!width || !height) {
        return;
    }
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function fitModel(root) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const scale = 2.2 / Math.max(1, size.x, size.y, size.z);
    root.scale.setScalar(scale);
}

function fallbackModel() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.1, 8, 16), new THREE.MeshStandardMaterial({ color: 0xcfd5db }));
    body.position.y = 1;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), new THREE.MeshStandardMaterial({ color: 0xdfd9cf }));
    head.position.y = 1.95;
    group.add(body, head);
    return group;
}

function attach(root) {
    if (avatar) {
        scene.remove(avatar);
    }
    avatar = root;
    fitModel(avatar);
    scene.add(avatar);
}

function loadDefault() {
    const path = "./utsuwa_3d/MENU_3D BOY.fbx";
    let settled = false;
    const fallback = () => {
        if (settled) {
            return;
        }
        settled = true;
        attach(fallbackModel());
        if (window.location.protocol === "file:") {
            view.dataset.threeReady = "0";
        }
    };
    const timeoutId = window.setTimeout(fallback, 2200);

    fbxLoader.load(
        path,
        (root) => {
            if (settled) {
                return;
            }
            settled = true;
            window.clearTimeout(timeoutId);
            attach(root);
        },
        undefined,
        () => {
            window.clearTimeout(timeoutId);
            fallback();
        }
    );
}

function animate() {
    const dt = clock.getDelta();
    if (avatar) {
        avatar.rotation.y += dt * 0.2;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

resize();
attach(fallbackModel());
loadDefault();
animate();
window.addEventListener("resize", resize);
