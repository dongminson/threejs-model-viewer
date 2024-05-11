import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'lil-gui';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.querySelector('#app');

const scene = new THREE.Scene();

let guiFolders = {};

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.z = 3;
camera.far = 1000000000000;
camera.updateProjectionMatrix();
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setClearColor(0xffffff, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const gui = new dat.GUI({
  width: 500,
});

const fileInput = document.getElementById('selectedModel');

const inputFolder = gui.addFolder('Load');

inputFolder
  .add(
    {
      triggerButton: function () {
        fileInput.click();
      },
    },
    'triggerButton',
  )
  .name('Load file');

fileInput.addEventListener('change', () => {
  const uploadedFile = fileInput.files[0];

  if (uploadedFile) {
    const reader = new FileReader();

    reader.onload = function (event) {
      const result = event.target.result;
      const loader = new GLTFLoader();

      if (scene.children) {
        scene.remove.apply(scene, scene.children);
      }

      loader.parse(
        result,
        '',
        function (gltf) {
          scene.add(gltf.scene);
          const light = new THREE.AmbientLight(0xffffff);
          scene.add(light);
          clearGUI();

          createGUIControlsForModel(gltf.scene);

          fitCameraToCenteredObject(camera, gltf.scene, 2, controls);
        },
        undefined,
        function (error) {
          console.error('Error loading model:', error);
        },
      );
    };

    reader.readAsArrayBuffer(uploadedFile);
  } else {
    console.log('No file selected');
  }
});

gui.title('Model viewer');

const getObject3D = (scene) => {
  for (let i = 0; i < scene.children.length; i++) {
    const object = scene.children[i];
    if (
      object instanceof THREE.Object3D &&
      !(object instanceof THREE.PerspectiveCamera)
    ) {
      return scene.children[i];
    }
  }
};

const fitCameraToCenteredObject = (camera, object, offset, orbitControls) => {
  const boundingBox = new THREE.Box3();
  boundingBox.setFromObject(object);

  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  const fov = camera.fov * (Math.PI / 180);
  const fovh = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
  let dx = size.z / 2 + Math.abs(size.x / 2 / Math.tan(fovh / 2));
  let dy = size.z / 2 + Math.abs(size.y / 2 / Math.tan(fov / 2));
  let cameraZ = Math.max(dx, dy);

  if (offset !== undefined && offset !== 0) cameraZ *= offset;

  camera.position.set(0, 0, cameraZ);

  const minZ = boundingBox.min.z;
  const cameraToFarEdge = minZ < 0 ? -minZ + cameraZ : cameraZ - minZ;

  camera.far = cameraToFarEdge * 3;
  camera.updateProjectionMatrix();

  if (orbitControls !== undefined) {
    orbitControls.target = new THREE.Vector3(0, 0, 0);
    orbitControls.maxDistance = cameraToFarEdge * 2;
  }
};

const createGUIControlsForModel = (scene) => {
  const objectToControl = getObject3D(scene);
  const boundingBox = new THREE.Box3();
  boundingBox.setFromObject(objectToControl);

  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const sizeX = size.x;

  if (objectToControl) {
    const folderPosition = gui.addFolder('Position');
    folderPosition
      .add(objectToControl.position, 'y')
      .min(-sizeX / 2)
      .max(sizeX / 2)
      .step(0.01)
      .name('Y');

    folderPosition
      .add(objectToControl.position, 'x')
      .min(-sizeX / 2)
      .max(sizeX / 2)
      .step(0.01)
      .name('X');

    folderPosition
      .add(objectToControl.position, 'z')
      .min(-sizeX / 2)
      .max(sizeX / 2)
      .step(0.01)
      .name('Z');

    guiFolders['Position'] = folderPosition;

    const folderScale = gui.addFolder('Scale');
    folderScale
      .add(objectToControl.scale, 'x', 0, 4)
      .name('Scale')
      .onChange(function (value) {
        objectToControl.scale.set(value, value, value);
      });
    guiFolders['Scale'] = folderScale;

    const folderDisplay = gui.addFolder('Display');
    folderDisplay.add(objectToControl, 'visible');
    guiFolders['Display'] = folderDisplay;
  }
};

const clearGUI = () => {
  if (!guiFolders) {
    return;
  }

  for (const key in guiFolders) {
    guiFolders[key].destroy();
  }

  guiFolders = {};
};

const tick = () => {
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();
