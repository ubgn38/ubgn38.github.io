import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const container = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1525);
scene.fog = new THREE.Fog(0x0b1525, 18, 42);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
camera.position.set(10, 8.5, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 1.1, 0);
controls.minDistance = 5;
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI * 0.49;

scene.add(new THREE.HemisphereLight(0xc8e3ff, 0x263044, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(6, 12, 8);
keyLight.castShadow = true;
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 14),
  new THREE.MeshStandardMaterial({ color: 0x1b2a3d, roughness: 0.86 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(18, 36, 0x49617c, 0x2b4058));

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x26384e, roughness: 0.9 });
function addWall(w, h, d, x, y, z) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMaterial);
  wall.position.set(x, y, z);
  wall.receiveShadow = true;
  scene.add(wall);
}
addWall(18, 4.5, 0.18, 0, 2.25, -7);
addWall(0.18, 4.5, 14, -9, 2.25, 0);
addWall(0.18, 4.5, 14, 9, 2.25, 0);

const servers = [];
const rackGroups = [];
const rackFrame = new THREE.MeshStandardMaterial({ color: 0x71849a, metalness: 0.55, roughness: 0.42 });
const serverBody = new THREE.MeshStandardMaterial({ color: 0x26364a, metalness: 0.42, roughness: 0.48 });

function createRack(x, z, rackNo) {
  const rack = new THREE.Group();
  rack.position.set(x, 0, z);
  rack.userData = { type: 'rack', name: `RACK-${String(rackNo).padStart(2, '0')}` };

  // Rack posts and top/bottom rails
  for (const px of [-0.62, 0.62]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.075, 3.25, 0.08), rackFrame);
    post.position.set(px, 1.63, 0);
    post.castShadow = true;
    rack.add(post);
  }
  for (const py of [0.08, 3.2]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.78), rackFrame);
    rail.position.set(0, py, 0);
    rack.add(rail);
  }

  for (let i = 0; i < 8; i++) {
    const warning = Math.random() < 0.18;
    const cpu = warning ? 78 + Math.floor(Math.random() * 18) : 12 + Math.floor(Math.random() * 55);
    const ram = 20 + Math.floor(Math.random() * 70);
    const server = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.29, 0.68), serverBody.clone());
    server.position.set(0, 0.34 + i * 0.36, 0);
    server.castShadow = true;
    server.userData = {
      type: 'server',
      name: `SRV-${String(rackNo).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
      rack: `RACK-${String(rackNo).padStart(2, '0')}`,
      ip: `192.168.${rackNo}.${100 + i}`,
      cpu, ram,
      status: warning ? 'WARNING' : 'NORMAL'
    };
    rack.add(server);
    servers.push(server);

    const ledMaterial = new THREE.MeshBasicMaterial({ color: warning ? 0xf5b942 : 0x35df91 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), ledMaterial);
    led.position.set(0.42, 0.34 + i * 0.36, 0.36);
    rack.add(led);

    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.035, 0.012),
      new THREE.MeshBasicMaterial({ color: 0x8193a8 })
    );
    vent.position.set(-0.28, 0.34 + i * 0.36, 0.347);
    rack.add(vent);
  }

  const namePlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.16, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2463a6, emissive: 0x0b2440 })
  );
  namePlate.position.set(0, 3.34, 0.02);
  rack.add(namePlate);

  scene.add(rack);
  rackGroups.push(rack);
}

let rackNo = 1;
for (const z of [-2.5, 2.5]) {
  for (const x of [-3.2, 0, 3.2]) createRack(x, z, rackNo++);
}

document.querySelector('#rack-count').textContent = String(rackGroups.length).padStart(2, '0');
document.querySelector('#server-count').textContent = String(servers.length).padStart(2, '0');
document.querySelector('#normal-count').textContent = String(servers.filter(s => s.userData.status === 'NORMAL').length).padStart(2, '0');
document.querySelector('#warning-count').textContent = String(servers.filter(s => s.userData.status === 'WARNING').length).padStart(2, '0');

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selected = null;
let pointerDown = null;

function showServer(data) {
  const details = document.querySelector('#server-details');
  const statusClass = data.status === 'NORMAL' ? 'status-normal' : 'status-warning';
  const cpuClass = data.cpu >= 75 ? 'warning' : '';
  const ramClass = data.ram >= 80 ? 'warning' : '';
  details.innerHTML = `
    <div style="width:100%;text-align:left">
      <p class="server-title">${data.name}</p>
      <p class="server-ip">${data.rack} · ${data.ip}</p>
      <span class="status-pill ${statusClass}">${data.status}</span>
      <div class="info-row"><span>CPU 사용률</span><strong>${data.cpu}%</strong></div>
      <div class="bar ${cpuClass}"><span style="width:${data.cpu}%"></span></div>
      <div class="info-row"><span>RAM 사용률</span><strong>${data.ram}%</strong></div>
      <div class="bar ${ramClass}"><span style="width:${data.ram}%"></span></div>
    </div>`;
}

function onPointerDown(event) {
  pointerDown = { x: event.clientX, y: event.clientY };
}
function onPointerUp(event) {
  if (!pointerDown) return;
  const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (moved > 5) return; // Ignore OrbitControls drag gestures.

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(servers, false)[0];

  if (selected) selected.material.emissive.setHex(0x000000);
  if (!hit) {
    selected = null;
    document.querySelector('#server-details').innerHTML =
      '<div class="empty-icon">▦</div><p>3D 화면에서 서버 장비를 선택하세요.</p>';
    return;
  }
  selected = hit.object;
  selected.material.emissive.setHex(0x174a80);
  showServer(selected.userData);
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointerup', onPointerUp);

document.querySelector('#reset-camera').addEventListener('click', () => {
  camera.position.set(10, 8.5, 12);
  controls.target.set(0, 1.1, 0);
  controls.update();
});

function resize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(container);
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
