'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ImplantType } from '../types';
import {
  Box,
  Eye,
  Layers,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Compass,
  Check,
  Disc,
  Crosshair,
  Gauge,
  Sparkles,
} from 'lucide-react';

interface ThreeImplantViewerProps {
  implantType: ImplantType;
  caseId: string;
}

type AnatomicalPlane = 'iso' | 'top' | 'front' | 'side';

export const ThreeImplantViewer: React.FC<ThreeImplantViewerProps> = ({ implantType, caseId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const screwGuidesRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // View States
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'lattice'>('solid');
  const [isRotating, setIsRotating] = useState(true);
  const [showScrewGuides, setShowScrewGuides] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePlane, setActivePlane] = useState<AnatomicalPlane>('iso');

  // Mesh Telemetry Stats
  const [meshStats, setMeshStats] = useState({
    polygons: 0,
    vertices: 0,
    dimensions: '0 x 0 x 0 mm',
    estimatedWeightGrams: '0.0 g',
    screwCount: 0,
  });

  // Mouse interaction refs
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x09090b); // Deep zinc-950

    // 2. Camera Setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 280;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(35, 30, 65);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer Setup with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Clinical Cleanroom Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Directional Key Light (cool surgical light)
    const dirKeyLight = new THREE.DirectionalLight(0xdbeafe, 2.8);
    dirKeyLight.position.set(45, 55, 45);
    scene.add(dirKeyLight);

    // Directional Fill Light (inspection light)
    const dirFillLight = new THREE.DirectionalLight(0xfef3c7, 1.4);
    dirFillLight.position.set(-45, -25, -45);
    scene.add(dirFillLight);

    // Point Light for specular highlights on titanium curvature
    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 90);
    pointLight.position.set(0, 15, 35);
    scene.add(pointLight);

    // 5. SLM 3D Build Platform Grid
    const grid = new THREE.GridHelper(80, 20, 0x3f3f46, 0x27272a);
    grid.position.y = -16;
    scene.add(grid);

    // 6. Implant Groups
    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    const screwGroup = new THREE.Group();
    screwGuidesRef.current = screwGroup;
    group.add(screwGroup);

    // Build the anatomical geometry
    buildImplantMesh(group, screwGroup, implantType, renderMode, showScrewGuides);

    // 7. Interactive Orbit & Pan Mouse Event Handlers
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.shiftKey) {
        isPanning.current = true;
      } else if (e.button === 0) {
        isDragging.current = true;
      }
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - previousMousePosition.current.x;
      const deltaY = e.clientY - previousMousePosition.current.y;

      if (isDragging.current && group) {
        group.rotation.y += deltaX * 0.009;
        group.rotation.x += deltaY * 0.009;
      } else if (isPanning.current && cameraRef.current) {
        cameraRef.current.position.x -= deltaX * 0.08;
        cameraRef.current.position.y += deltaY * 0.08;
      }

      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
      isPanning.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z += e.deltaY * 0.05;
      cameraRef.current.position.z = Math.max(20, Math.min(130, cameraRef.current.position.z));
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent default browser context menu on right click pan
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('contextmenu', onContextMenu);

    // 8. Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      if (isRotating && !isDragging.current && !isPanning.current && group) {
        group.rotation.y += 0.006;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
    };
  }, [implantType]);

  // Re-build mesh whenever renderMode or showScrewGuides change
  useEffect(() => {
    if (meshGroupRef.current && screwGuidesRef.current) {
      buildImplantMesh(
        meshGroupRef.current,
        screwGuidesRef.current,
        implantType,
        renderMode,
        showScrewGuides
      );
    }
  }, [renderMode, showScrewGuides, implantType]);

  const buildImplantMesh = (
    group: THREE.Group,
    screwGroup: THREE.Group,
    type: ImplantType,
    mode: 'solid' | 'wireframe' | 'lattice',
    showGuides: boolean
  ) => {
    // Clear previous geometries
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }

    // Re-add screw group
    while (screwGroup.children.length > 0) {
      const obj = screwGroup.children[0];
      screwGroup.remove(obj);
      if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    }
    group.add(screwGroup);

    // Medical Grade Titanium Shader (ASTM F3001 Ti-6Al-4V ELI)
    const titaniumMaterial = new THREE.MeshStandardMaterial({
      color: mode === 'lattice' ? 0x94a3b8 : mode === 'wireframe' ? 0x38bdf8 : 0xd4d4d8,
      metalness: mode === 'wireframe' ? 0.3 : 0.94,
      roughness: mode === 'lattice' ? 0.45 : 0.22,
      wireframe: mode === 'wireframe',
      flatShading: mode === 'lattice',
    });

    const screwHoleMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Medical Gold/Amber countersink
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x78350f,
      emissiveIntensity: 0.3,
    });

    let mainGeometry: THREE.BufferGeometry;
    let screwCount = 0;

    const typeStr = String(type).toUpperCase();
    if (typeStr.includes('CRANIAL')) {
      // Cranial Plate: Curved convex calvarial shell
      mainGeometry = new THREE.SphereGeometry(19, 36, 26, 0, Math.PI * 1.15, 0, Math.PI * 0.48);
      mainGeometry.scale(1.25, 0.75, 1.4);

      // Countersunk Screw Fixation Rings
      const holeCoords = [
        [-13, 6, 9],
        [13, 6, 9],
        [-11, 9, -11],
        [11, 9, -11],
        [0, 11, 0],
        [-18, 2, 0],
        [18, 2, 0],
      ];
      screwCount = holeCoords.length;

      if (showGuides) {
        holeCoords.forEach(([hx, hy, hz]) => {
          const ringGeo = new THREE.TorusGeometry(1.9, 0.55, 14, 24);
          const ringMesh = new THREE.Mesh(ringGeo, screwHoleMaterial);
          ringMesh.position.set(hx, hy, hz);
          ringMesh.rotation.x = Math.PI / 3;
          screwGroup.add(ringMesh);

          // Trajectory Arrow Guide
          const arrowDir = new THREE.Vector3(hx, hy + 5, hz).normalize();
          const arrow = new THREE.ArrowHelper(
            arrowDir,
            new THREE.Vector3(hx, hy, hz),
            6,
            0x10b981,
            2,
            1.2
          );
          screwGroup.add(arrow);
        });
      }
    } else if (typeStr.includes('MANDIB')) {
      // Mandibular Reconstruction Bar with anatomical chin curvature
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-24, -6, 14),
        new THREE.Vector3(-15, -8, 3),
        new THREE.Vector3(0, -9.5, -7),
        new THREE.Vector3(15, -8, 3),
        new THREE.Vector3(24, -6, 14),
      ]);
      mainGeometry = new THREE.TubeGeometry(curve, 36, 2.8, 16, false);

      // Fixation Plates & Screw holes
      const platePositions = [-19, -8, 0, 8, 19];
      screwCount = platePositions.length * 2;

      if (showGuides) {
        platePositions.forEach((offset) => {
          const plateGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.9, 16);
          const plateMesh = new THREE.Mesh(plateGeo, screwHoleMaterial);
          plateMesh.position.set(offset, -7.8, offset === 0 ? -7 : offset > 0 ? 3 : 3);
          plateMesh.rotation.z = Math.PI / 2;
          screwGroup.add(plateMesh);
        });
      }
    } else if (typeStr.includes('SPINAL')) {
      // Spinal Lumbar Interbody Fusion Cage with central graft window
      mainGeometry = new THREE.BoxGeometry(17, 9.5, 23, 14, 8, 16);
      screwCount = 2;

      // Central biological bone graft fusion cavity
      const graftWindowGeo = new THREE.CylinderGeometry(4.2, 4.2, 11, 20);
      const graftMesh = new THREE.Mesh(
        graftWindowGeo,
        new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true })
      );
      group.add(graftMesh);

      // Serrated traction teeth ridges
      for (let z = -8; z <= 8; z += 4) {
        const toothGeo = new THREE.BoxGeometry(16, 0.8, 1.2);
        const toothMesh = new THREE.Mesh(toothGeo, titaniumMaterial);
        toothMesh.position.set(0, 5.1, z);
        group.add(toothMesh);
      }
    } else {
      // Acetabular Hip Cup (Hemispherical cup with porous trabecular shell)
      mainGeometry = new THREE.SphereGeometry(14, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
      screwCount = 3;

      if (showGuides) {
        [-6, 0, 6].forEach((xOffset, idx) => {
          const cupHole = new THREE.TorusGeometry(1.6, 0.45, 12, 20);
          const holeMesh = new THREE.Mesh(cupHole, screwHoleMaterial);
          holeMesh.position.set(xOffset, 5, idx === 1 ? -4 : 0);
          holeMesh.rotation.x = Math.PI / 2;
          screwGroup.add(holeMesh);
        });
      }
    }

    const mainMesh = new THREE.Mesh(mainGeometry, titaniumMaterial);
    group.add(mainMesh);

    // Calculate Physical Mesh Properties & Bounding Box
    mainGeometry.computeBoundingBox();
    const bbox = mainGeometry.boundingBox;
    let dims = '48.2 x 32.1 x 14.5 mm';
    let weightEst = '32.4 g';

    if (bbox) {
      const dx = Math.abs(bbox.max.x - bbox.min.x);
      const dy = Math.abs(bbox.max.y - bbox.min.y);
      const dz = Math.abs(bbox.max.z - bbox.min.z);
      dims = `${dx.toFixed(1)} x ${dy.toFixed(1)} x ${dz.toFixed(1)} mm`;

      // Estimate volume and titanium weight (Ti density = 4.43 g/cm^3)
      const approxVolCm3 = (dx * dy * dz * 0.28) / 1000;
      weightEst = `${(approxVolCm3 * 4.43).toFixed(1)} g`;
    }

    const polyCount = mainGeometry.index
      ? mainGeometry.index.count / 3
      : mainGeometry.attributes.position.count / 3;

    setMeshStats({
      polygons: Math.round(polyCount),
      vertices: mainGeometry.attributes.position.count,
      dimensions: dims,
      estimatedWeightGrams: weightEst,
      screwCount: screwCount,
    });
  };

  // Anatomical Camera View Presets
  const setCameraView = (plane: AnatomicalPlane) => {
    if (!cameraRef.current || !meshGroupRef.current) return;
    setActivePlane(plane);
    meshGroupRef.current.rotation.set(0, 0, 0);

    if (plane === 'iso') {
      cameraRef.current.position.set(35, 30, 65);
    } else if (plane === 'top') {
      cameraRef.current.position.set(0, 80, 0.01);
    } else if (plane === 'front') {
      cameraRef.current.position.set(0, 5, 75);
    } else if (plane === 'side') {
      cameraRef.current.position.set(75, 5, 0);
    }
    cameraRef.current.lookAt(0, 0, 0);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const factor = direction === 'in' ? -10 : 10;
    cameraRef.current.position.z += factor;
    cameraRef.current.position.z = Math.max(20, Math.min(130, cameraRef.current.position.z));
  };

  return (
    <>
      {/* 3D CAD Inspection Card Container */}
      <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        {/* Top Header: Material Spec & View Modes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 px-4 py-2.5 bg-zinc-900/60 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-zinc-100">ASTM F3001 Ti-6Al-4V ELI</span>
            <span className="rounded-full bg-sky-950 border border-sky-800/80 px-2 py-0.5 text-[10px] text-sky-300 font-mono">
              30 µm SLM
            </span>
          </div>

          {/* Render Mode Switcher Pills */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 self-start sm:self-auto">
            <button
              onClick={() => setRenderMode('solid')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                renderMode === 'solid'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Photorealistic Solid Titanium Metallic Shader"
            >
              Solid
            </button>
            <button
              onClick={() => setRenderMode('wireframe')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                renderMode === 'wireframe'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="FEA Triangular Wireframe CAD Inspection"
            >
              Wireframe
            </button>
            <button
              onClick={() => setRenderMode('lattice')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                renderMode === 'lattice'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Osteointegration Trabecular Porous Micro-Lattice"
            >
              Lattice
            </button>
          </div>
        </div>

        {/* Anatomical Planes & Overlays Tool Ribbon */}
        <div className="px-4 py-1.5 bg-zinc-950 border-b border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-500 font-medium">Planes:</span>
            {(['iso', 'top', 'front', 'side'] as AnatomicalPlane[]).map((plane) => (
              <button
                key={plane}
                onClick={() => setCameraView(plane)}
                className={`px-1.5 py-0.5 rounded uppercase font-mono text-[10px] transition ${
                  activePlane === plane
                    ? 'bg-zinc-800 text-sky-400 font-bold border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {plane}
              </button>
            ))}
          </div>

          {/* Screw Guides Toggle */}
          <button
            onClick={() => setShowScrewGuides(!showScrewGuides)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition ${
              showScrewGuides
                ? 'bg-amber-950/80 border border-amber-800/80 text-amber-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Countersunk Screw Fixation Guides"
          >
            <Disc className="w-3 h-3" />
            <span>Screws ({meshStats.screwCount})</span>
          </button>
        </div>

        {/* WebGL Canvas Viewport */}
        <div className="relative h-72 w-full cursor-grab active:cursor-grabbing bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/50">
          <div ref={containerRef} className="h-full w-full" />

          {/* Floating Controls HUD */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-1 shadow-xl">
            <button
              onClick={() => setIsRotating(!isRotating)}
              className={`p-1.5 rounded-lg text-xs transition ${
                isRotating ? 'text-sky-400 bg-sky-950/60' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={isRotating ? 'Pause 360° Auto-Rotation' : 'Resume 360° Auto-Rotation'}
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom('in')}
              className="p-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCameraView('iso')}
              className="p-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition"
              title="Reset Viewpoint"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SLM Build Plate Watermark HUD */}
          <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-0.5">
            <span className="font-mono text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              {caseId} • Plate Center
            </span>
            <span className="font-mono text-[9px] text-zinc-600">
              Left Click: Orbit • Right Click: Pan • Scroll: Zoom
            </span>
          </div>
        </div>

        {/* Clinical Mesh Telemetry Metrics Bar */}
        <div className="grid grid-cols-4 border-t border-zinc-800/80 bg-zinc-900/40 p-2.5 text-center text-xs">
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Triangles</span>
            <span className="font-mono font-bold text-zinc-200 text-xs">
              {meshStats.polygons.toLocaleString()}
            </span>
          </div>
          <div className="border-x border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Vertices</span>
            <span className="font-mono font-bold text-zinc-200 text-xs">
              {meshStats.vertices.toLocaleString()}
            </span>
          </div>
          <div className="border-r border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Dimensions</span>
            <span className="font-mono font-bold text-sky-400 text-xs truncate block px-1">
              {meshStats.dimensions}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Est. Weight</span>
            <span className="font-mono font-bold text-emerald-400 text-xs">
              {meshStats.estimatedWeightGrams}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
