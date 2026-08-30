"use client";

import { useEffect, useRef, useState, Component, ReactNode } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import { Sparkles, Bookmark, ShieldCheck, CheckCircle2 } from "lucide-react";

// Error Boundary Wrapper to prevent Next.js crashes
class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("3D Auth Interface render error caught by boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function Canvas3DScene({ onWebGLFailed }: { onWebGLFailed: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      onWebGLFailed();
      return;
    }

    const container = containerRef.current;
    let renderer: THREE.WebGLRenderer | null = null;
    let animationFrameId: number;
    let isTabVisible = true;

    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        onWebGLFailed();
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 5.5;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // ── Glowing AI Core Mesh ─────────────────────────
      const outerGeo = new THREE.IcosahedronGeometry(1.5, 3);
      const outerMat = new THREE.MeshPhysicalMaterial({
        color: 0x6366f1,
        wireframe: true,
        roughness: 0.1,
        metalness: 0.8,
        clearcoat: 1.0,
        opacity: 0.75,
        transparent: true,
      });
      const aiCore = new THREE.Mesh(outerGeo, outerMat);
      scene.add(aiCore);

      const innerGeo = new THREE.SphereGeometry(0.85, 32, 32);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        wireframe: false,
      });
      const innerCore = new THREE.Mesh(innerGeo, innerMat);
      scene.add(innerCore);

      // ── Neural Particle Network ──────────────────────
      const particleCount = 150;
      const particlesGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 12;
        positions[i + 1] = (Math.random() - 0.5) * 12;
        positions[i + 2] = (Math.random() - 0.5) * 12;

        colors[i] = 0.4 + Math.random() * 0.4;
        colors[i + 1] = 0.4 + Math.random() * 0.4;
        colors[i + 2] = 0.9 + Math.random() * 0.1;
      }

      particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particlesGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const particlesMat = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
      });
      const particleSystem = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particleSystem);

      // ── Document Flow Particles ──────────────────────
      const docCount = 30;
      const docGeo = new THREE.BoxGeometry(0.12, 0.16, 0.02);
      const docMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.7 });
      const docGroup = new THREE.Group();

      const docPositions: { mesh: THREE.Mesh; speed: number; radius: number; angle: number }[] = [];
      for (let i = 0; i < docCount; i++) {
        const mesh = new THREE.Mesh(docGeo, docMat);
        const radius = 2.5 + Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = (Math.random() - 0.5) * 4;
        mesh.position.z = Math.sin(angle) * radius;
        docGroup.add(mesh);
        docPositions.push({ mesh, speed: 0.2 + Math.random() * 0.4, radius, angle });
      }
      scene.add(docGroup);

      // ── Lighting ──────────────────────────────────────
      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);

      const light1 = new THREE.PointLight(0x6366f1, 2, 40);
      light1.position.set(4, 4, 4);
      scene.add(light1);

      const light2 = new THREE.PointLight(0xec4899, 1.5, 40);
      light2.position.set(-4, -4, 4);
      scene.add(light2);

      // ── Parallax & Visibility ──────────────────────────
      let mouseX = 0;
      let mouseY = 0;
      const handleMouseMove = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
      };
      window.addEventListener("mousemove", handleMouseMove);

      const handleVisibilityChange = () => {
        isTabVisible = !document.hidden;
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      const handleResize = () => {
        if (!container || !renderer) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener("resize", handleResize);

      // ── Animation Loop ────────────────────────────────
      const clock = new THREE.Clock();
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        if (!isTabVisible) return;

        const delta = clock.getElapsedTime();
        aiCore.rotation.x = delta * 0.2 + mouseY;
        aiCore.rotation.y = delta * 0.25 + mouseX;

        const pulse = 1 + Math.sin(delta * 2.2) * 0.07;
        innerCore.scale.set(pulse, pulse, pulse);

        particleSystem.rotation.y = delta * 0.04;

        // Flow document particles toward center
        docPositions.forEach((item) => {
          item.angle += item.speed * 0.01;
          item.mesh.position.x = Math.cos(item.angle) * item.radius;
          item.mesh.position.z = Math.sin(item.angle) * item.radius;
          item.mesh.rotation.y = item.angle;
        });

        renderer?.render(scene, camera);
      };
      animate();

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (container && renderer && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    } catch {
      onWebGLFailed();
    }
  }, [onWebGLFailed]);

  return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none opacity-85" />;
}

export default function Auth3DInterface() {
  const [hasWebGL, setHasWebGL] = useState(true);

  return (
    <div className="relative w-full h-full min-h-[340px] lg:min-h-screen flex flex-col justify-between p-6 lg:p-12 overflow-hidden bg-[#050816]">
      {/* 3D Scene or 2D CSS Fallback */}
      <WebGLErrorBoundary
        fallback={
          <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
            <div className="w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-600/20 blur-3xl animate-pulse" />
          </div>
        }
      >
        {hasWebGL ? (
          <Canvas3DScene onWebGLFailed={() => setHasWebGL(false)} />
        ) : (
          <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
            <div className="w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-pink-600/20 blur-3xl animate-pulse" />
          </div>
        )}
      </WebGLErrorBoundary>

      {/* Content Overlay */}
      <div className="relative z-10 my-auto max-w-lg space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 backdrop-blur-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Next-Gen RAG Intelligence</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight"
        >
          Chat with your documents. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Verify every answer.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md"
        >
          Enterprise RAG platform with multi-format ingestion, page-level citations, hybrid BM25 retrieval, and honest confidence scoring.
        </motion.p>

        {/* Feature Chips */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center gap-2.5 pt-2"
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-indigo-300">
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            <span>Page Citations</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-purple-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Honest Confidence</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure RAG</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
