/**
 * menu-coin-button.js — 3D menu coin (Button.glb) in place of select-button.svg.
 * Tilt / idle / hover / scroll spin driven from polykroma.js via setTilt().
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  var COIN_TAG = "select-7";
  var CAMERA_FOV = 24;
  var FIT_FILL = 0.88;
  var FACE_Y = 0;
  var BASE_TILT_X = -7;
  var BASE_TILT_Y = 8;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var booted = false;
  var active = false;
  var stack = null;
  var coinEl = null;
  var canvas = null;
  var scene = null;
  var camera = null;
  var renderer = null;
  var pivot = null;
  var model = null;
  var rafId = 0;
  var resizeObserver = null;
  var tiltX = BASE_TILT_X;
  var tiltY = BASE_TILT_Y;
  var cameraDistance = 3;

  function pageBase() {
    return window.__aimySiteBase || "./";
  }

  function modelUrl() {
    return pageBase() + "assets/polykroma/select/Button.glb?v=" + COIN_TAG;
  }

  function findStack() {
    return document.querySelector(".pk-coin-button--select [data-menu-coin-stack]");
  }

  function centerModel(root) {
    var box = new THREE.Box3().setFromObject(root);
    var center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
  }

  function fitModel(root) {
    var box = new THREE.Box3().setFromObject(root);
    var size = box.getSize(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z, 0.001);
    var scale = 1.65 / maxDim;
    root.scale.setScalar(scale * FIT_FILL);
    centerModel(root);

    box.setFromObject(root);
    var fitted = box.getSize(new THREE.Vector3());
    var fitMax = Math.max(fitted.x, fitted.y, fitted.z, 0.001);
    cameraDistance =
      fitMax * 0.5 / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV * 0.5));
    cameraDistance *= 1.08;
    camera.position.set(0, 0, cameraDistance);
    camera.lookAt(0, 0, 0);
  }

  function applyTilt(rxDeg, ryDeg) {
    tiltX = typeof rxDeg === "number" ? rxDeg : tiltX;
    tiltY = typeof ryDeg === "number" ? ryDeg : tiltY;

    if (coinEl) {
      coinEl.style.setProperty("--pk-coin-tilt-x", tiltX.toFixed(2) + "deg");
      coinEl.style.setProperty("--pk-coin-tilt-y", tiltY.toFixed(2) + "deg");
    }

    if (!pivot) return;

    /* Match CSS rotateX(rx) rotateY(ry) — YXZ euler reads naturally for coin tilt */
    pivot.rotation.order = "YXZ";
    pivot.rotation.x = THREE.MathUtils.degToRad(tiltX);
    pivot.rotation.y = THREE.MathUtils.degToRad(tiltY);
    pivot.rotation.z = 0;
  }

  function buildScene() {
    scene = new THREE.Scene();
    pivot = new THREE.Group();
    scene.add(pivot);

    var ambient = new THREE.AmbientLight(0xf6f4fc, 0.82);
    var hemi = new THREE.HemisphereLight(0xfff6ff, 0x9080a8, 0.55);
    var key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(0.85, 1.35, 1.6);
    var fill = new THREE.DirectionalLight(0xe8dcff, 0.48);
    fill.position.set(-1.25, 0.15, 0.95);
    var rim = new THREE.DirectionalLight(0xffffff, 0.32);
    rim.position.set(0.2, -0.85, -1.1);

    scene.add(ambient, hemi, key, fill, rim);

    camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.02, 40);
    camera.position.set(0, 0, cameraDistance);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  function resize() {
    if (!renderer || !camera || !stack) return;
    var w = Math.max(1, stack.clientWidth);
    var h = Math.max(1, stack.clientHeight);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function renderFrame() {
    if (!renderer || !scene || !camera) return;
    renderer.render(scene, camera);
  }

  function tick() {
    rafId = window.requestAnimationFrame(tick);
    renderFrame();
  }

  function startLoop() {
    if (rafId) return;
    if (reduced) {
      renderFrame();
      return;
    }
    rafId = window.requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function prepareMaterials(root) {
    root.traverse(function (node) {
      if (!node.isMesh || !node.material) return;
      var mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(function (mat) {
        if (!mat) return;
        mat.depthWrite = true;
        mat.depthTest = true;
        if (typeof mat.metalness === "number") {
          mat.metalness = Math.min(mat.metalness, 0.35);
        }
        if (typeof mat.roughness === "number") {
          mat.roughness = Math.max(mat.roughness, 0.28);
        }
      });
    });
  }

  function loadModel() {
    var loader = new GLTFLoader();
    return new Promise(function (resolve, reject) {
      loader.load(
        modelUrl(),
        function (gltf) {
          model = gltf.scene;
          model.rotation.y = FACE_Y;
          prepareMaterials(model);
          pivot.add(model);
          fitModel(model);
          applyTilt(BASE_TILT_X, BASE_TILT_Y);
          stack.classList.add("is-ready");
          if (coinEl) {
            coinEl.classList.add("pk-coin--glb");
          }
          active = true;
          resolve();
        },
        undefined,
        reject
      );
    });
  }

  function bindResize() {
    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize, { passive: true });
      return;
    }
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stack);
  }

  function boot() {
    if (booted) return;
    stack = findStack();
    if (!stack) return;

    canvas = stack.querySelector("[data-menu-coin-canvas]");
    if (!canvas) return;

    coinEl = stack.closest(".pk-coin");
    booted = true;
    buildScene();
    bindResize();

    loadModel()
      .then(function () {
        resize();
        renderFrame();
        startLoop();
      })
      .catch(function (err) {
        console.error("[menu-coin-button] GLB load failed:", err);
        stack.classList.add("is-failed");
        active = false;
      });
  }

  function waitForStack() {
    if (findStack()) {
      boot();
      return;
    }
    window.requestAnimationFrame(waitForStack);
  }

  window.AimyMenuCoinButton = {
    boot: boot,
    isActive: function () {
      return active;
    },
    setTilt: function (rxDeg, ryDeg) {
      applyTilt(rxDeg, ryDeg);
      renderFrame();
    },
    destroy: function () {
      stopLoop();
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (renderer) {
        renderer.dispose();
        renderer = null;
      }
      if (coinEl) {
        coinEl.classList.remove("pk-coin--glb");
      }
      active = false;
      booted = false;
      stack = null;
      coinEl = null;
      canvas = null;
      scene = null;
      camera = null;
      pivot = null;
      model = null;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForStack);
  } else {
    waitForStack();
  }
})();
