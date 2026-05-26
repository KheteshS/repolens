"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function ZoomableContainer({ children, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 0.1), 15));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { ...position };
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const fitView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.3, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s * 0.7, 0.2));
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-slate-200 ${className}`}
      style={{ background: "#f8fafc" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Controls */}
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button
          onClick={zoomIn}
          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm text-slate-600 hover:bg-slate-50 text-sm font-bold"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm text-slate-600 hover:bg-slate-50 text-sm font-bold"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={fitView}
          className="h-7 px-2 flex items-center justify-center bg-white border border-slate-200 rounded shadow-sm text-slate-500 hover:bg-slate-50 text-[10px] font-medium"
          title="Reset view"
        >
          Fit
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-3 left-3 z-10 text-[10px] text-slate-400 bg-white/80 px-1.5 py-0.5 rounded border border-slate-100">
        {Math.round(scale * 100)}%
      </div>

      {/* Zoomable/pannable content */}
      <div
        ref={contentRef}
        className={`w-full h-full ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.1s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
