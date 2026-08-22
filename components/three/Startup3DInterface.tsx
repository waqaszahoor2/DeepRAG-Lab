"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Database,
  ArrowRight,
  FileText,
  MessageSquare,
  History,
  Layers,
  Search,
} from "lucide-react";
import Link from "next/link";

export default function Startup3DInterface() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Canvas setup
    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // AI Core Sphere
    const sphereGeometry = new THREE.IcosahedronGeometry(1.8, 4);
    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1,
      wireframe: true,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transmission: 0.6,
      opacity: 0.8,
      transparent: true,
    });
    const aiCore = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(aiCore);

    // Inner Glowing Core
    const innerGeometry = new THREE.SphereGeometry(1.0, 32, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: false,
    });
    const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerCore);

    // Neural Network Particle Cloud
    const particleCount = 200;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 15;
      positions[i + 1] = (Math.random() - 0.5) * 15;
      positions[i + 2] = (Math.random() - 0.5) * 15;

      colors[i] = 0.4 + Math.random() * 0.4;
      colors[i + 1] = 0.4 + Math.random() * 0.4;
      colors[i + 2] = 0.9 + Math.random() * 0.1;
    }

    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particlesGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });

    const particleSystem = new THREE.Points(
      particlesGeometry,
      particlesMaterial
    );
    scene.add(particleSystem);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 2, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa855f7, 2, 50);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.5;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate AI Core
      aiCore.rotation.x = elapsedTime * 0.2 + mouseY;
      aiCore.rotation.y = elapsedTime * 0.3 + mouseX;

      // Pulse Inner Core
      const scale = 1 + Math.sin(elapsedTime * 2) * 0.08;
      innerCore.scale.set(scale, scale, scale);

      // Rotate Particle System
      particleSystem.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center overflow-hidden">
      {/* 3D Canvas Background */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 pointer-events-none opacity-80"
      />

      {/* Hero Content Overlay */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-indigo-300 text-xs font-medium mb-6 border border-indigo-500/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Enterprise Production AI RAG Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4"
        >
          Unlock Deep Knowledge from <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Your Documents
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Upload PDFs, DOCX, CSVs, TXT, or Markdown. Ask complex questions and receive accurate answers with precise page-level citations, source verification, and confidence scoring powered by Gemini & OpenRouter.
        </motion.p>

        {/* Decreased Button Sizes for Sleek Design */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-row items-center justify-center gap-3 mb-10"
        >
          <Link
            href="/upload"
            className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <span>Launch DeepRAG</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg glass-panel hover:bg-slate-800/80 text-slate-200 font-medium text-xs sm:text-sm border border-slate-700 transition-all"
          >
            Sign In to Dashboard
          </Link>
        </motion.div>

        {/* On-Screen Feature Toolbar Shortcuts */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12 p-3 rounded-2xl glass-panel border border-slate-800/80 max-w-3xl mx-auto"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
            Platform Capabilities Shortcuts
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
            <Link
              href="/upload"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 flex items-center gap-2.5 group transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Document Ingestion</p>
                <p className="text-[10px] text-slate-400">PDF, DOCX, CSV, TXT</p>
              </div>
            </Link>

            <Link
              href="/chat"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 flex items-center gap-2.5 group transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">AI RAG QA</p>
                <p className="text-[10px] text-slate-400">Page-level citations</p>
              </div>
            </Link>

            <Link
              href="/history"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 flex items-center gap-2.5 group transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-pink-600/20 text-pink-400 group-hover:scale-110 transition-transform">
                <History className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Query History</p>
                <p className="text-[10px] text-slate-400">Traceable logs</p>
              </div>
            </Link>

            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 flex items-center gap-2.5 group transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Vector Store</p>
                <p className="text-[10px] text-slate-400">ChromaDB & Qdrant</p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left"
        >
          <div className="glass-card p-5 rounded-2xl">
            <div className="p-2.5 w-fit rounded-xl bg-indigo-600/20 text-indigo-400 mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Vector RAG Engine</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Hybrid vector search powered by ChromaDB & Qdrant with page-level metadata tracking.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="p-2.5 w-fit rounded-xl bg-purple-600/20 text-purple-400 mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Dual LLM Fallback</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Gemini 2.5 Flash as primary with instant OpenRouter failover for 99.9% availability.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl">
            <div className="p-2.5 w-fit rounded-xl bg-emerald-600/20 text-emerald-400 mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Production Security</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              JWT auth, bcrypt encryption, per-IP rate limiting, and prompt-injection detection.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
