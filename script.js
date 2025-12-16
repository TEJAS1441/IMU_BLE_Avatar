import * as THREE from "https://unpkg.com/three@0.155.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.155.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://unpkg.com/three@0.155.0/examples/jsm/controls/OrbitControls.js";

/* =========================================================
   GLOBAL STATE (FIX: DECLARED AT TOP LEVEL)
========================================================= */

let skeleton = null;

// FIX: must be global
const bones = {};
const boneRestQuat = {};

/* =========================================================
   BASIC THREE.JS SETUP
========================================================= */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Attach renderer to the scene container so overlay can cover it reliably
const sceneContainer = document.getElementById("scene-container");
function resizeRendererToDisplaySize() {
  const w = sceneContainer.clientWidth;
  const h = sceneContainer.clientHeight;
  renderer.setSize(w, h);
}
resizeRendererToDisplaySize();
sceneContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.update();

/* =========================================================
   LIGHTING
========================================================= */

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

/* =========================================================
   STUDIO BACKDROP + BRANDING
   - large interior sphere for soft studio look
   - ground plane
   - NU7 branding drawn to a canvas texture on a plane behind avatar
========================================================= */

// Yoga studio styling
const PALETTE = {
  wallTop: 0xf6f6f4,     // off-white
  wallBottom: 0xe6efe8,  // very light sage
  floor: 0xe9e2d0,       // warm beige
  mat: 0x9fbfae,         // sage green
  accent: 0xcbb3d6,      // soft purple
  brandCircle: 0x7fb8b0   // muted teal
};

// create a rear wall using a canvas gradient texture
function createWallTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#f6f6f4');
  grad.addColorStop(1, '#e6efe8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // subtle vertical texture (soft strokes)
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 60; i++) {
    const x = (i / 60) * size;
    ctx.fillRect(x, 0, 2, size);
  }

  return new THREE.CanvasTexture(canvas);
}

const wallTex = createWallTexture();
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
wallTex.repeat.set(1, 1);

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 8),
  new THREE.MeshStandardMaterial({ map: wallTex, side: THREE.FrontSide })
);
wall.position.set(0, 3.6, -10);
scene.add(wall);

// Large floor (studio floor)
const studioFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: PALETTE.floor, roughness: 0.95 })
);
studioFloor.rotation.x = -Math.PI / 2;
studioFloor.position.y = 0;
scene.add(studioFloor);

// Yoga mat (long rectangle) centered under avatar
const matLength = 2.2;
const matWidth = 0.75;
const matGeom = new THREE.PlaneGeometry(matWidth, matLength);
const matTexCanvas = document.createElement('canvas');
matTexCanvas.width = 512;
matTexCanvas.height = 512;
const mctx = matTexCanvas.getContext('2d');
// base
mctx.fillStyle = '#9fbfae';
mctx.fillRect(0, 0, 512, 512);
// subtle fabric strokes
mctx.fillStyle = 'rgba(0,0,0,0.03)';
for (let i = 0; i < 80; i++) {
  const x = (i / 80) * 512;
  mctx.fillRect(x, 0, 1, 512);
}
const matTexture = new THREE.CanvasTexture(matTexCanvas);
matTexture.wrapS = matTexture.wrapT = THREE.RepeatWrapping;
matTexture.repeat.set(1, 1);

const matMaterial = new THREE.MeshStandardMaterial({ map: matTexture, color: PALETTE.mat, roughness: 0.7 });
const matPlane = new THREE.Mesh(matGeom, matMaterial);
matPlane.rotation.x = -Math.PI / 2;
matPlane.position.set(0, 0.01, 0.2);
scene.add(matPlane);

// Softer NU7 branded decal placed on the wall behind the avatar
function createBrandingTexture(text) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // transparent background so it looks like a decal
  ctx.clearRect(0, 0, size, size);

  // circular mark
  const cx = size / 2;
  const cy = size / 2 - 40;
  ctx.beginPath();
  ctx.arc(cx, cy, 160, 0, Math.PI * 2);
  ctx.fillStyle = '#7fb8b0';
  ctx.fill();

  // NU7 text - muted and soft
  ctx.fillStyle = '#fffaf6';
  ctx.font = 'bold 140px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NU7', cx, cy + 8);

  // subtext
  ctx.fillStyle = '#6b6b6b';
  ctx.font = '36px sans-serif';
  ctx.fillText('YOGA STUDIO', cx, cy + 260);

  return new THREE.CanvasTexture(canvas);
}

const brandTexture = createBrandingTexture('NU7');
const brandMat = new THREE.MeshBasicMaterial({ map: brandTexture, transparent: true, opacity: 0.95 });
const brandPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), brandMat);
brandPlane.position.set(0, 2.1, -9.9);
scene.add(brandPlane);


/* =========================================================
   LOAD AVATAR + BUILD SKELETON MAP
========================================================= */

const loader = new GLTFLoader();

// Loading UI elements / flags
const overlay = document.getElementById("overlay");
let modelLoaded = false;
let wsConnected = false;

function hideOverlay() {
  if (!overlay) return;
  overlay.classList.add("hidden");
}

function checkReady() {
  // Hide only when both model and websocket/backend are ready
  if (modelLoaded && wsConnected) hideOverlay();
}

loader.load(
  "/avatar/avatar.glb",
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    model.traverse((obj) => {
      if (obj.isSkinnedMesh && obj.skeleton && !skeleton) {
        skeleton = obj.skeleton;

        skeleton.bones.forEach((bone) => {
          bones[bone.name] = bone;
          boneRestQuat[bone.name] = bone.quaternion.clone();
        });

        console.log("Bones:", Object.keys(bones));
      }
    });

    modelLoaded = true;
    if (overlay) overlay.innerText = "Model loaded — waiting for backend...";
    checkReady();

    // Fallback: if websocket doesn't connect within 6s, hide overlay anyway
    setTimeout(() => {
      if (modelLoaded && !wsConnected) {
        console.warn("Websocket not connected in time — hiding loading overlay.");
        hideOverlay();
      }
    }, 6000);
  },
  // onProgress
  (xhr) => {
    if (!overlay) return;
    if (xhr.lengthComputable) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      overlay.innerText = `Loading 3D Character... ${pct}%`;
    }
  },
  (err) => {
    console.error("Failed to load model.glb", err);
    if (overlay) overlay.innerText = "Failed to load model.";
  }
);

/* =========================================================
   IMU → BONE MAPPING (BOTTOM WEARABLE)
========================================================= */

const imuToBone = {
  IMU1: "mixamorig1LeftFoot",
  IMU2: "mixamorig1RightFoot",
  IMU3: "mixamorig1LeftUpLeg",
  IMU4: "mixamorig1LeftLeg",
  IMU5: "mixamorig1RightUpLeg",
  IMU6: "mixamorig1RightLeg",
};

/* =========================================================
   WEBSOCKET (LIVE IMU STREAM)
========================================================= */

const ws = new WebSocket(`ws://${location.hostname}:8001/ws`);

ws.onopen = () => {
  console.log("Avatar WebSocket connected");
  wsConnected = true;
  if (overlay) overlay.innerText = "Backend connected — finalizing...";
  checkReady();
};

ws.onmessage = (event) => {
  if (!skeleton) return;

  const data = JSON.parse(event.data);
  const sensors = data.sensors;

  for (const imuKey in imuToBone) {
    const boneName = imuToBone[imuKey];
    const bone = bones[boneName];
    const q = sensors[imuKey];

    if (!bone || !q) continue;

    const imuQuat = new THREE.Quaternion(
      q.x,
      q.y,
      q.z,
      q.w
    ).normalize();

    bone.quaternion
      .copy(boneRestQuat[boneName])
      .multiply(imuQuat);
  }
};

/* =========================================================
   RENDER LOOP
========================================================= */

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  // Ensure branding plane faces the camera
  try {
    if (brandPlane) brandPlane.lookAt(camera.position);
    // subtle parallax on mat and wall for depth (optional)
    if (matPlane) matPlane.position.z = 0.2 + Math.sin(Date.now() * 0.0005) * 0.002;
  } catch (e) {
    // ignore if brandPlane / matPlane not defined yet
  }

  renderer.render(scene, camera);
}

animate();

/* =========================================================
   RESIZE HANDLING
========================================================= */

window.addEventListener("resize", () => {
  camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight;
  camera.updateProjectionMatrix();
  resizeRendererToDisplaySize();
});
