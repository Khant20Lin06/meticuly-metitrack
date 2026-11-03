'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ImplantType } from '@/types';
import { Eye, RotateCw, ZoomIn, ZoomOut, Box } from 'lucide-react';

interface ThreeImplantViewerProps {
  implantType: ImplantType;
  caseId: string;
}

export default function ThreeImplantViewer({ implantType, caseId }: ThreeImplantViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 400;
    const height = currentMount.clientHeight || 260;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    currentMount.replaceChildren(renderer.domElement);

    // 3. Cleanroom Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.2); // Surgical cyan light
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight2.position.set(-5, -5, -2);
    scene.add(dirLight2);

    // 4. Geometry based on Implant Type
    let geometry: THREE.BufferGeometry;
    if (implantType === 'CRANIAL_PLATE') {
      // Cranial curved perforated shell
      geometry = new THREE.TorusKnotGeometry(1.6, 0.45, 120, 24, 2, 3);
    } else if (implantType === 'HIP_ACETABULAR_CUP') {
      // Hemispherical porous cup
      geometry = new THREE.SphereGeometry(2.0, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.65);
    } else if (implantType === 'SPINAL_CAGE') {
      // Trabecular porous fusion box
      geometry = new THREE.BoxGeometry(2.4, 1.8, 2.4, 6, 6, 6);
    } else {
      // MANDIBULAR_RECON: Curved anatomical jaw reconstruction plate
      geometry = new THREE.CylinderGeometry(1.8, 1.8, 0.4, 32, 4, true, 0, Math.PI * 1.3);
    }

    // Medical grade Titanium material (Ti-6Al-4V ELI)
    const material = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.22,
      wireframe: wireframe,
    });

    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    scene.add(mesh);

    // Grid platform floor
    const gridHelper = new THREE.GridHelper(8, 16, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -2.2;
    scene.add(gridHelper);

    // 5. Mouse Interaction Orbit Simulation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !mesh) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      mesh.rotation.y += deltaX * 0.01;
      mesh.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 6. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (autoRotate && mesh && !isDragging) {
        mesh.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (currentMount) {
        currentMount.replaceChildren();
      }
    };
  }, [implantType, wireframe, autoRotate]);

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-800 bg-[#0A0F1D]">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Badges & Controls */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono font-bold text-cyan-400">
          3D DICOM CAD MESH
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Ti-6Al-4V ELI</span>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded text-xs transition-colors ${
            autoRotate ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Auto-Rotation"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setWireframe(!wireframe)}
          className={`p-1.5 rounded text-xs transition-colors ${
            wireframe ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Wireframe/Solid Titanium Mesh"
        >
          <Box className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 text-[10px] text-slate-400 pointer-events-none">
        Drag to rotate 3D implant
      </div>
    </div>
  );
}
