/**
 * menu-select.js
 * Tomb Raider–style 3D menu picker — GLB models on a turntable, titles below.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

(function () {
  "use strict";

  /* Bump when swapping any ./assets/polykroma/select/*.glb */
  var SELECT_TAG = "select-3";

  var ITEMS = [
    {
      id: "work",
      label: "Work",
      href: "./work",
      model: "./assets/polykroma/select/archive.glb?v=" + SELECT_TAG,
    },
    {
      id: "me",
      label: "Me",
      href: "./about.html",
      model: "./assets/polykroma/select/polaroid.glb?v=" + SELECT_TAG,
    },
    {
      id: "insights",
      label: "Insights",
      href: "./insights",
      model: "./assets/polykroma/select/insights.glb?v=" + SELECT_TAG,
      hoverFlip: false,
    },
  ];

  var TAU = Math.PI * 2;
  var COUNT = ITEMS.length;
  var THETA = TAU / COUNT;
  var RADIUS = 1.18;
  var MODEL_SIZE = 0.38;
  var CAMERA_FOV = 26;
  var FIT_PADDING = 1.62;
  var FRONT_SCALE = 1.08;
  var RING_TILT = 0.16;
  var RING_Y = 0.12;
  var CAMERA_ELEV = 0.2;
  var PIVOT_Y = 0.16;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var section = null;
  var viewport = null;
  var canvas = null;
  var titleButtons = [];
  var hitButtons = [];
  var openBtn = null;
  var labelLayer = null;
  var labelPoint = null;
  var labelBox = null;

  var scene = null;
  var camera = null;
  var renderer = null;
  var carousel = null;
  var anchors = [];
  var pickables = [];
  var hoverTiltX = 0;
  var hoverTiltZ = 0;
  var hoverTiltTargetX = 0;
  var hoverTiltTargetZ = 0;
  var hoverTiltTargetY = 0;
  var hoverTiltY = 0;
  var raycaster = null;
  var pointerNdc = null;
  var pedestal = null;

  var index = 0;
  var rotationY = 0;
  var tween = null;
  var dragging = false;
  var dragStartX = 0;
  var dragStartRot = 0;
  var dragLastX = 0;
  var dragLastTs = 0;
  var dragVelocity = 0;
  var suppressClick = false;
  var animating = false;
  var visible = false;
  var rafId = 0;
  var ready = false;
  var booted = false;

  var DRAG_RATIO = 0.0052;
  var SNAP_MS = reduced ? 0 : 780;
  var IDLE_SPIN = reduced ? 0 : 0.62;
  var HOVER_FLIP_MS = reduced ? 0 : 520;
  var HOVER_TILT_MS = reduced ? 0 : 0.12;
  var HOVER_BACK_Y = Math.PI;
  var LABEL_GAP = 0.1;
  var HIT_WIDTH = 128;
  var HIT_HEIGHT = 52;

  var hoveredIndex = -1;
  var hoverTween = null;

  function navigate(href) {
    if (window.__aimyCloseMenu) {
      window.__aimyCloseMenu({ restoreFocus: false });
    }
    if (window.AimySpa && typeof window.AimySpa.canHandle === "function" && window.AimySpa.canHandle(href)) {
      window.AimySpa.navigate(href);
      return;
    }
    if (window.AimyPageTransition && typeof window.AimyPageTransition.navigate === "function") {
      window.AimyPageTransition.navigate(href);
      return;
    }
    window.location.href = href;
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function rotationForIndex(i) {
    return -i * THETA;
  }

  function indexFromRotation(rot) {
    return mod(Math.round(-rot / THETA), COUNT);
  }

  function nearestRotation(current, targetIndex) {
    var base = rotationForIndex(targetIndex);
    var options = [base, base + TAU, base - TAU, base + TAU * 2, base - TAU * 2];
    var best = options[0];
    var bestDist = Math.abs(options[0] - current);
    var i;

    for (i = 1; i < options.length; i += 1) {
      var dist = Math.abs(options[i] - current);
      if (dist < bestDist) {
        best = options[i];
        bestDist = dist;
      }
    }

    return best;
  }

  function slideIndexForView(view) {
    var key = String(view || "start").toLowerCase();
    for (var i = 0; i < COUNT; i += 1) {
      if (ITEMS[i].id === key) return i;
    }
    return 0;
  }

  function menuIsOpen() {
    var shell = document.getElementById("pk-nav-shell");
    return !!(shell && shell.classList.contains("is-open"));
  }

  function setAnimating(on) {
    animating = on;
    if (section) section.classList.toggle("is-animating", on);
  }

  function updateChrome() {
    var current = ITEMS[index];
    var i;

    for (i = 0; i < hitButtons.length; i += 1) {
      if (titleButtons[i]) {
        titleButtons[i].classList.toggle("is-active", i === index);
      }
      hitButtons[i].classList.toggle("is-active", i === index);
      hitButtons[i].setAttribute("aria-selected", i === index ? "true" : "false");
      hitButtons[i].tabIndex = i === index ? 0 : -1;
    }

    if (openBtn) {
      openBtn.setAttribute("aria-label", "Open " + current.label);
    }
  }

  function angularDistFromFront(i) {
    var offset = rotationY + i * THETA;
    offset = mod(offset + Math.PI, TAU) - Math.PI;
    return Math.abs(offset) / THETA;
  }

  function clearModelHover() {
    if (hoverTween) {
      hoverTween.kill();
      hoverTween = null;
    }
    hoverTiltTargetX = 0;
    hoverTiltTargetZ = 0;
    hoverTiltTargetY = 0;
    if (hoveredIndex >= 0) {
      if (hitButtons[hoveredIndex]) hitButtons[hoveredIndex].classList.remove("is-hovered");
      setModelHover(hoveredIndex, false, true);
      hoveredIndex = -1;
    }
  }

  function resetHoverTilt(flip) {
    hoverTiltX = 0;
    hoverTiltZ = 0;
    hoverTiltY = 0;
    hoverTiltTargetX = 0;
    hoverTiltTargetZ = 0;
    hoverTiltTargetY = 0;
    if (flip) {
      flip.rotation.x = 0;
      flip.rotation.y = 0;
      flip.rotation.z = 0;
    }
  }

  function itemUsesHoverFlip(i) {
    return ITEMS[i] && ITEMS[i].hoverFlip !== false;
  }

  function setModelHover(i, on, immediate) {
    var spin = anchors[i] && anchors[i].userData.spin;
    var flip = anchors[i] && anchors[i].userData.flip;
    if (!spin || !flip) return;

    if (hoverTween) {
      hoverTween.kill();
      hoverTween = null;
    }

    var flipY = itemUsesHoverFlip(i) ? HOVER_BACK_Y : 0;

    if (immediate || reduced || !window.gsap) {
      if (on) {
        spin.rotation.y = 0;
        flip.rotation.y = flipY;
      } else {
        flip.rotation.y = 0;
        resetHoverTilt(flip);
      }
      return;
    }

    if (on) {
      hoverTween = window.gsap.timeline();
      hoverTween.to(spin.rotation, { y: 0, duration: HOVER_FLIP_MS / 1000, ease: "power3.out" }, 0);
      if (itemUsesHoverFlip(i)) {
        hoverTween.to(
          flip.rotation,
          { y: flipY, duration: HOVER_FLIP_MS / 1000, ease: "power3.out" },
          0
        );
      }
      return;
    }

    resetHoverTilt(null);
    hoverTween = window.gsap.to(flip.rotation, {
      y: 0,
      x: 0,
      z: 0,
      duration: HOVER_FLIP_MS / 1000,
      ease: "power3.out",
    });
  }

  function pickModelIndex(clientX, clientY) {
    if (!raycaster || !pointerNdc || !camera || !viewport || !pickables.length) return -1;

    var rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return -1;

    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    var hits = raycaster.intersectObjects(pickables, false);
    if (!hits.length) return -1;

    var mesh = hits[0].object;
    return typeof mesh.userData.index === "number" ? mesh.userData.index : -1;
  }

  function pickLabelIndex(clientX, clientY) {
    var i;
    var btn;
    var rect;

    for (i = 0; i < hitButtons.length; i += 1) {
      btn = hitButtons[i];
      if (!btn || btn.style.visibility === "hidden" || btn.style.pointerEvents === "none") continue;
      rect = btn.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return i;
      }
    }
    return -1;
  }

  function projectedModelCenter(i) {
    if (!camera || !viewport || !anchors[i] || !anchors[i].userData.spin) return null;

    if (!labelBox) labelBox = new THREE.Box3();
    if (!labelPoint) labelPoint = new THREE.Vector3();

    labelBox.setFromObject(anchors[i].userData.spin);
    if (labelBox.isEmpty()) return null;

    labelPoint.set(
      (labelBox.min.x + labelBox.max.x) * 0.5,
      (labelBox.min.y + labelBox.max.y) * 0.5,
      (labelBox.min.z + labelBox.max.z) * 0.5
    );
    labelPoint.project(camera);

    return {
      x: (labelPoint.x * 0.5 + 0.5) * viewport.clientWidth,
      y: (-labelPoint.y * 0.5 + 0.5) * viewport.clientHeight,
      behind: labelPoint.z > 1,
    };
  }

  function updateHoverTilt(clientX, clientY) {
    if (hoveredIndex < 0) {
      hoverTiltTargetX = 0;
      hoverTiltTargetZ = 0;
      hoverTiltTargetY = 0;
      return;
    }

    var center = projectedModelCenter(hoveredIndex);
    if (!center || center.behind) {
      hoverTiltTargetX = 0;
      hoverTiltTargetZ = 0;
      hoverTiltTargetY = 0;
      return;
    }

    var nx = (clientX - center.x) / Math.max(viewport.clientWidth * 0.18, 1);
    var ny = (clientY - center.y) / Math.max(viewport.clientHeight * 0.18, 1);
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    hoverTiltTargetX = ny * -0.14;
    hoverTiltTargetZ = nx * 0.1;
    hoverTiltTargetY = nx * 0.06;
  }

  function updateModelHover(clientX, clientY) {
    if (!ready || dragging || animating) return;

    var picked = pickModelIndex(clientX, clientY);
    updateHoverTilt(clientX, clientY);

    if (picked === hoveredIndex) return;

    if (hoveredIndex >= 0) {
      if (hitButtons[hoveredIndex]) hitButtons[hoveredIndex].classList.remove("is-hovered");
      setModelHover(hoveredIndex, false);
    }

    hoveredIndex = picked;

    if (hoveredIndex >= 0) {
      if (hitButtons[hoveredIndex]) hitButtons[hoveredIndex].classList.add("is-hovered");
      setModelHover(hoveredIndex, true);
    }
  }

  function applyRotation(rotValue, forcedIndex) {
    var prevIndex = index;
    rotationY = rotValue;
    if (carousel) {
      carousel.rotation.x = RING_TILT;
      carousel.rotation.y = rotationY;
    }
    if (typeof forcedIndex === "number") {
      index = mod(forcedIndex, COUNT);
    } else {
      index = indexFromRotation(rotationY);
    }
    updateChrome();
    updateSlidePresence();
    if (index !== prevIndex && !animating && !dragging) frameCamera();
  }

  function updateSlidePresence() {
    var i;
    var spin;
    var dist;
    var opacity;
    var scale;
    var blend;

    for (i = 0; i < anchors.length; i += 1) {
      spin = anchors[i].userData.spin;
      if (!spin) continue;
      dist = angularDistFromFront(i);
      blend = Math.min(dist, 1);

      spin.visible = true;
      scale = FRONT_SCALE - blend * 0.36;
      opacity = 1 - blend * 0.34;
      spin.scale.setScalar(Math.max(0.5, scale));

      spin.traverse(function (node) {
        if (!node.isMesh || !node.material) return;
        var mats = Array.isArray(node.material) ? node.material : [node.material];
        var m;

        for (m = 0; m < mats.length; m += 1) {
          applySlideOpacity(mats[m], opacity);
        }
      });
    }
  }

  function activeFitMetrics() {
    var front = anchors[index];
    var root;

    if (front && front.userData.flip && front.userData.flip.children.length) {
      root = front.userData.flip.children[0];
      return {
        height: root.userData.fitHeight || MODEL_SIZE,
        width: root.userData.fitWidth || MODEL_SIZE,
      };
    }

    return { height: MODEL_SIZE, width: MODEL_SIZE };
  }

  function frameCamera() {
    if (!camera || !viewport || !carousel) return;

    var viewW = viewport.clientWidth;
    var viewH = viewport.clientHeight;
    if (viewW <= 8 || viewH <= 8) return;

    carousel.updateWorldMatrix(true, true);

    if (!labelBox) labelBox = new THREE.Box3();
    if (!labelPoint) labelPoint = new THREE.Vector3();

    labelPoint.set(0, PIVOT_Y, 0);
    var front = anchors[index];
    if (front && front.userData.spin) {
      labelBox.setFromObject(front.userData.spin);
      if (!labelBox.isEmpty()) {
        labelBox.getCenter(labelPoint);
      }
    }

    var fit = activeFitMetrics();
    var fitH = fit.height * FIT_PADDING;
    var fitW = fit.width * FIT_PADDING;
    var aspect = viewW / Math.max(viewH, 1);
    var vFovRad = (CAMERA_FOV * Math.PI) / 180;
    var hFovRad = 2 * Math.atan(Math.tan(vFovRad * 0.5) * aspect);
    var distV = (fitH * 0.5) / Math.tan(vFovRad * 0.5);
    var distH = (fitW * 0.5) / Math.tan(hFovRad * 0.5);
    var dist = Math.max(distV, distH, 3.35);
    var pivotY = labelPoint.y + fitH * 0.08;
    var pivotZ = labelPoint.z;
    var camY = pivotY + dist * Math.sin(CAMERA_ELEV);
    var camZ = pivotZ + dist * Math.cos(CAMERA_ELEV);

    camera.fov = CAMERA_FOV;
    camera.aspect = aspect;
    camera.position.set(0, camY, camZ);
    camera.lookAt(0, pivotY, pivotZ);
    camera.updateProjectionMatrix();
  }

  function updateLabelPositions() {
    if (!ready || !camera || !viewport || !hitButtons.length || !carousel) return;

    if (!labelPoint) labelPoint = new THREE.Vector3();
    if (!labelBox) labelBox = new THREE.Box3();

    carousel.updateWorldMatrix(true, true);

    var i;
    var spin;
    var btn;
    var dist;
    var blend;
    var opacity;
    var behind;

    for (i = 0; i < anchors.length; i += 1) {
      spin = anchors[i].userData.spin;
      btn = hitButtons[i];
      if (!spin || !btn) continue;

      labelBox.setFromObject(spin);
      if (labelBox.isEmpty()) continue;

      var fitH =
        spin.children[0] &&
        spin.children[0].children[0] &&
        spin.children[0].children[0].userData.fitHeight
          ? spin.children[0].children[0].userData.fitHeight
          : MODEL_SIZE;

      labelPoint.set(
        (labelBox.min.x + labelBox.max.x) * 0.5,
        labelBox.min.y - fitH * LABEL_GAP,
        (labelBox.min.z + labelBox.max.z) * 0.5
      );
      labelPoint.project(camera);

      behind = labelPoint.z > 1;
      dist = angularDistFromFront(i);
      blend = Math.min(dist, 1);

      var xPct = (labelPoint.x * 0.5 + 0.5) * 100;
      var yPct = (-labelPoint.y * 0.5 + 0.5) * 100;
      var onScreen = !behind && xPct > 4 && xPct < 96 && yPct > 4 && yPct < 98;

      btn.style.left = xPct + "%";
      btn.style.top = yPct + "%";
      btn.style.width = HIT_WIDTH + "px";
      btn.style.height = HIT_HEIGHT + "px";
      btn.style.transform = "translate(-50%, 0)";

      if (!onScreen) {
        btn.style.opacity = "0";
        btn.style.visibility = "hidden";
        btn.style.pointerEvents = "none";
        continue;
      }

      btn.style.visibility = "visible";
      opacity = 1 - blend * 0.34;
      btn.style.opacity = String(Math.max(0.28, opacity));
      btn.style.pointerEvents = opacity > 0.42 ? "auto" : "none";
    }
  }

  function animateRotation(targetRot, targetIndex, onComplete) {
    if (tween) {
      tween.kill();
      tween = null;
      setAnimating(false);
    }

    var current = rotationY;
    var resolvedIndex =
      typeof targetIndex === "number" ? mod(targetIndex, COUNT) : indexFromRotation(targetRot);

    if (reduced || !window.gsap) {
      applyRotation(targetRot, resolvedIndex);
      if (onComplete) onComplete();
      return;
    }

    if (Math.abs(current - targetRot) < 0.001) {
      applyRotation(targetRot, resolvedIndex);
      if (onComplete) onComplete();
      return;
    }

    setAnimating(true);
    clearModelHover();
    var state = { rot: current };
    tween = window.gsap.to(state, {
      rot: targetRot,
      duration: SNAP_MS / 1000,
      ease: "power3.inOut",
      onUpdate: function () {
        applyRotation(state.rot);
      },
      onComplete: function () {
        applyRotation(targetRot, resolvedIndex);
        setAnimating(false);
        tween = null;
        frameCamera();
        if (onComplete) onComplete();
      },
    });
  }

  function goTo(nextIndex, animate) {
    if (!ready) return;
    var target = mod(nextIndex, COUNT);
    var targetRot = nearestRotation(rotationY, target);
    if (animate === false) {
      applyRotation(targetRot, target);
      frameCamera();
      return;
    }
    animateRotation(targetRot, target, frameCamera);
  }

  function next() {
    goTo(index + 1, true);
  }

  function prev() {
    goTo(index - 1, true);
  }

  function openCurrent() {
    if (!ready) return;
    navigate(ITEMS[index].href);
  }

  function syncToView(view) {
    if (!ready) return;
    goTo(slideIndexForView(view), false);
    renderFrame();
  }

  function resumeMenu() {
    visible = menuIsOpen();
    if (!ready) return;
    resize();
    renderFrame();
    if (!rafId) startLoop();
  }

  function pauseMenu() {
    visible = false;
    clearModelHover();
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function normalizeModel(root, targetSize) {
    var box = new THREE.Box3().setFromObject(root);
    var size = box.getSize(new THREE.Vector3());
    var fit = targetSize * 0.9;
    var scaleY = fit / Math.max(size.y, 0.001);
    var scaleXZ = fit / Math.max(size.x, size.z, 0.001);
    var scale = Math.min(scaleY, scaleXZ);

    root.scale.setScalar(scale);
    box.setFromObject(root);
    var center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
    box.setFromObject(root);
    var fitted = box.getSize(new THREE.Vector3());
    root.userData.fitHeight = fitted.y;
    root.userData.fitWidth = Math.max(fitted.x, fitted.z);
  }

  function captureGltfMaterialState(mat) {
    if (mat.userData.menuGltfCaptured) return;
    mat.userData.menuGltfCaptured = true;
    mat.userData.menuGltfTransparent = !!mat.transparent;
    mat.userData.menuGltfOpacity = typeof mat.opacity === "number" ? mat.opacity : 1;
    mat.userData.menuGltfAlphaTest = typeof mat.alphaTest === "number" ? mat.alphaTest : 0;
  }

  function isShellMaterial(node, mat) {
    if (mat.userData.menuGltfTransparent && mat.userData.menuGltfOpacity < 0.985) return true;
    if (mat.userData.menuGltfAlphaTest > 0) return false;

    var label = ((node.name || "") + " " + (mat.name || "")).toLowerCase();
    if (/inner|core|art|label|photo|card_body|chip|pcb/.test(label)) return false;
    if (/shell|glass|cover|outer|frame|window|face|plastic|lid/.test(label)) return true;
    return false;
  }

  function stampMaterialBase(mat) {
    mat.userData.menuBaseOpacity = typeof mat.opacity === "number" ? mat.opacity : 1;
    mat.userData.menuBaseTransparent = !!mat.transparent;
    mat.userData.menuBaseDepthWrite = mat.depthWrite !== false;
  }

  function applySlideOpacity(mat, slideOpacity) {
    var baseOpacity =
      mat.userData.menuBaseOpacity != null ? mat.userData.menuBaseOpacity : 1;
    var finalOpacity = slideOpacity * baseOpacity;
    var baseTransparent = !!mat.userData.menuBaseTransparent;

    mat.opacity = finalOpacity;
    mat.transparent = baseTransparent || finalOpacity < 0.999;

    if (baseTransparent) {
      mat.depthWrite = false;
    } else {
      mat.depthWrite = finalOpacity > 0.65;
    }
  }

  function configureInsightsTransparency(root) {
    var meshes = [];

    root.traverse(function (node) {
      if (!node.isMesh || !node.material) return;
      var mats = Array.isArray(node.material) ? node.material : [node.material];
      var i;

      for (i = 0; i < mats.length; i += 1) {
        var mat = mats[i];
        captureGltfMaterialState(mat);

        if (isShellMaterial(node, mat)) {
          mat.transparent = true;
          mat.depthWrite = false;
          mat.side = THREE.FrontSide;
        } else {
          mat.transparent = !!mat.userData.menuGltfTransparent;
          mat.depthWrite = !mat.transparent;
          mat.opacity = mat.userData.menuGltfOpacity;
          mat.alphaTest = mat.userData.menuGltfAlphaTest;
          mat.side = mat.userData.menuGltfSide || THREE.FrontSide;
        }

        mat.needsUpdate = true;
      }

      meshes.push(node);
    });

    meshes.sort(function (a, b) {
      var boxA = new THREE.Box3().setFromObject(a);
      var boxB = new THREE.Box3().setFromObject(b);
      return (
        boxA.getSize(new THREE.Vector3()).lengthSq() -
        boxB.getSize(new THREE.Vector3()).lengthSq()
      );
    });

    meshes.forEach(function (mesh, idx) {
      mesh.renderOrder = idx;
    });
  }
  function prepareModelMaterials(root, itemId) {
    root.traverse(function (node) {
      if (!node.isMesh || !node.material) return;
      var mats = Array.isArray(node.material) ? node.material : [node.material];
      var i;

      for (i = 0; i < mats.length; i += 1) {
        var mat = mats[i];
        captureGltfMaterialState(mat);

        if (mat.color) mat.color.multiplyScalar(1.14);
        if (mat.emissive && mat.emissive.isColor && mat.color) {
          mat.emissive.copy(mat.color).multiplyScalar(0.04);
        }
        if (typeof mat.roughness === "number") {
          mat.roughness = Math.min(mat.roughness, 0.72);
        }
        if (typeof mat.metalness === "number") {
          mat.metalness = Math.min(mat.metalness, 0.35);
        }

        if (itemId !== "insights") {
          mat.transparent = !!mat.userData.menuGltfTransparent;
          mat.depthWrite = !mat.transparent;
          mat.side = THREE.FrontSide;
        }

        stampMaterialBase(mat);
        mat.needsUpdate = true;
      }
    });

    if (itemId === "insights") {
      configureInsightsTransparency(root);
      root.traverse(function (node) {
        if (!node.isMesh || !node.material) return;
        var mats = Array.isArray(node.material) ? node.material : [node.material];
        var i;
        for (i = 0; i < mats.length; i += 1) {
          stampMaterialBase(mats[i]);
        }
      });
    }
  }

  function addLights() {
    var ambient = new THREE.AmbientLight(0xf6f4fc, 0.92);
    var hemi = new THREE.HemisphereLight(0xfff6ff, 0xb8a8c8, 0.48);
    var key = new THREE.DirectionalLight(0xffffff, 0.72);
    key.position.set(0.8, 5.2, 4.8);
    var fill = new THREE.DirectionalLight(0xf0e8ff, 0.38);
    fill.position.set(-2.8, 3.2, 3.4);
    scene.add(ambient, hemi, key, fill);

    var camLight = new THREE.PointLight(0xffffff, 1.55, 24, 1.4);
    camLight.position.set(0, 0.2, 0.45);
    camera.add(camLight);
  }

  function addPedestal() {
    /* floor shadow only — no visible box */
  }

  function createAnchors() {
    var i;
    var angle;

    for (i = 0; i < COUNT; i += 1) {
      angle = i * THETA;
      var anchor = new THREE.Group();
      anchor.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
      anchor.rotation.y = Math.PI - angle;
      anchor.userData.index = i;
      carousel.add(anchor);
      anchors.push(anchor);
    }
  }

  function loadModels() {
    var loader = new GLTFLoader();
    return Promise.all(
      ITEMS.map(function (item, i) {
        return new Promise(function (resolve, reject) {
          loader.load(
            item.model,
            function (gltf) {
              var root = gltf.scene;
              normalizeModel(root, MODEL_SIZE);
              prepareModelMaterials(root, item.id);
              root.traverse(function (node) {
                if (node.isMesh) {
                  node.userData.index = i;
                  pickables.push(node);
                }
              });
              var spin = new THREE.Group();
              var flip = new THREE.Group();
              anchors[i].add(spin);
              spin.add(flip);
              flip.add(root);
              anchors[i].userData.spin = spin;
              anchors[i].userData.flip = flip;
              resolve();
            },
            undefined,
            reject
          );
        });
      })
    );
  }

  function setupThree() {
    canvas = section.querySelector("[data-menu-select-canvas]");
    if (!canvas || !viewport) return false;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.sortObjects = true;

    raycaster = new THREE.Raycaster();
    pointerNdc = new THREE.Vector2();

    carousel = new THREE.Group();
    carousel.rotation.x = RING_TILT;
    carousel.position.y = RING_Y;
    scene.add(carousel);

    addLights();
    addPedestal();
    createAnchors();
    frameCamera();

    return true;
  }

  function resize() {
    if (!renderer || !viewport) return;

    var w = viewport.clientWidth;
    var h = viewport.clientHeight;
    if (w <= 0 || h <= 0) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    frameCamera();
    updateLabelPositions();
  }

  function renderFrame() {
    if (!ready || !visible) return;

    if (IDLE_SPIN && !dragging && !animating && hoveredIndex < 0) {
      var front = anchors[index];
      if (front && front.userData.spin) {
        front.userData.spin.rotation.y += IDLE_SPIN * 0.009;
      }
    }

    if (hoveredIndex >= 0) {
      var hoveredFlip = anchors[hoveredIndex] && anchors[hoveredIndex].userData.flip;
      if (hoveredFlip) {
        hoverTiltX += (hoverTiltTargetX - hoverTiltX) * HOVER_TILT_MS;
        hoverTiltZ += (hoverTiltTargetZ - hoverTiltZ) * HOVER_TILT_MS;
        hoverTiltY += (hoverTiltTargetY - hoverTiltY) * HOVER_TILT_MS;
        hoveredFlip.rotation.x = hoverTiltX;
        hoveredFlip.rotation.z = hoverTiltZ;
        if (!itemUsesHoverFlip(hoveredIndex)) {
          hoveredFlip.rotation.y = hoverTiltY;
        }
      }
    }

    updateLabelPositions();
    renderer.render(scene, camera);
  }

  function startLoop() {
    window.cancelAnimationFrame(rafId);
    function loop() {
      renderFrame();
      if (visible || dragging || animating || hoveredIndex >= 0) {
        rafId = window.requestAnimationFrame(loop);
      } else {
        rafId = 0;
      }
    }
    loop();
  }

  function bindDrag() {
    if (!viewport) return;

    viewport.addEventListener(
      "pointerdown",
      function (e) {
        if (e.button !== 0 || !ready) return;
        clearModelHover();
        dragging = true;
        suppressClick = false;
        dragStartX = e.clientX;
        dragLastX = e.clientX;
        dragLastTs = performance.now();
        dragVelocity = 0;
        dragStartRot = rotationY;
        viewport.classList.add("is-dragging");
        section.classList.add("is-dragging");
        viewport.setPointerCapture(e.pointerId);
        if (tween) {
          tween.kill();
          tween = null;
        }
        setAnimating(false);
      },
      { passive: true }
    );

    viewport.addEventListener(
      "pointermove",
      function (e) {
        if (dragging) {
          var now = performance.now();
          var dx = e.clientX - dragStartX;
          var dt = Math.max(8, now - dragLastTs);

          dragVelocity = (e.clientX - dragLastX) / dt;
          dragLastX = e.clientX;
          dragLastTs = now;

          applyRotation(dragStartRot + dx * DRAG_RATIO);
          return;
        }
        updateModelHover(e.clientX, e.clientY);
      },
      { passive: true }
    );

    viewport.addEventListener(
      "pointerleave",
      function () {
        clearModelHover();
      },
      { passive: true }
    );

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");
      section.classList.remove("is-dragging");
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (err) {}

      if (Math.abs(e.clientX - dragStartX) > 6) {
        suppressClick = true;
      }

      var flick = dragVelocity * 0.34;
      var projected = rotationY + flick;
      var targetIndex = indexFromRotation(projected);
      goTo(targetIndex, true);
    }

    viewport.addEventListener("pointerup", endDrag, { passive: true });
    viewport.addEventListener("pointercancel", endDrag, { passive: true });

    viewport.addEventListener(
      "click",
      function (e) {
        if (suppressClick || !ready) {
          suppressClick = false;
          return;
        }
        e.stopPropagation();
        var picked = pickModelIndex(e.clientX, e.clientY);
        if (picked < 0) picked = pickLabelIndex(e.clientX, e.clientY);
        if (picked < 0) return;
        if (picked === index) {
          openCurrent();
          return;
        }
        goTo(picked, true);
      },
      false
    );
  }

  function bindControls() {
    var prevBtn = section.querySelector("[data-menu-select-prev]");
    var nextBtn = section.querySelector("[data-menu-select-next]");
    openBtn = section.querySelector("[data-menu-select-open]");

    if (prevBtn) {
      prevBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        prev();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        next();
      });
    }
    if (openBtn) {
      openBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openCurrent();
      });
    }

    hitButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-hit]"));
    titleButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-title]"));
    hitButtons.forEach(function (btn, i) {
      btn.addEventListener("pointerenter", function () {
        var item = ITEMS[i];
        if (!item || !window.AimySpaPrefetch || typeof window.AimySpaPrefetch.warmView !== "function") return;
        if (item.id === "work" || item.id === "insights") {
          window.AimySpaPrefetch.warmView(item.id);
        }
      });
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (i === index) {
          openCurrent();
          return;
        }
        goTo(i, true);
      });
    });

    section.addEventListener("keydown", function (e) {
      if (!ready) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "Enter" || e.key === " ") {
        if (document.activeElement === openBtn || document.activeElement === hitButtons[index]) {
          e.preventDefault();
          openCurrent();
        }
      }
    });
  }

  function bootSection(target) {
    section = target;
    if (!section) return false;

    viewport = section.querySelector("[data-menu-select-viewport]");
    labelLayer = section.querySelector("[data-menu-select-labels]");
    hitButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-hit]"));
    titleButtons = Array.prototype.slice.call(section.querySelectorAll("[data-menu-select-title]"));
    if (!setupThree()) return false;

    bindDrag();
    bindControls();
    resize();
    window.addEventListener("resize", resize, { passive: true });

    if (window.ResizeObserver && viewport) {
      var viewportObserver = new ResizeObserver(function () {
        resize();
      });
      viewportObserver.observe(viewport);
    }

    loadModels()
      .then(function () {
        ready = true;
        section.classList.add("is-ready");
        frameCamera();
        resize();
        goTo(slideIndexForView(getCurrentView()), false);
        renderFrame();
        startLoop();
        visible = menuIsOpen();
        window.requestAnimationFrame(function () {
          resize();
          renderFrame();
        });
        window.setTimeout(function () {
          resize();
          renderFrame();
        }, 160);
      })
      .catch(function () {
        section.classList.add("is-error");
      });

    return true;
  }

  function getCurrentView() {
    if (window.AimySpa && typeof window.AimySpa.getView === "function") {
      return window.AimySpa.getView();
    }
    return "start";
  }

  function bootMenu() {
    if (ready) return;
    var target = document.querySelector("[data-pk-menu-select]");
    if (!target) return;
    if (booted) return;
    if (!bootSection(target)) return;
    booted = true;
  }

  window.AimyMenuSelect = {
    bootMenu: bootMenu,
    goTo: goTo,
    next: next,
    prev: prev,
    syncToView: syncToView,
    resumeMenu: resumeMenu,
    pauseMenu: pauseMenu,
    resize: resize,
  };
})();
