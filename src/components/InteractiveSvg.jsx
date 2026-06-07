import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Download, Copy, Check, Move } from "lucide-react";

export default function InteractiveSvg({ svgContent, topic }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);

  const containerRef = useRef(null);
  const svgWrapperRef = useRef(null);

  useEffect(() => {
    // Reset view when SVG changes
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [svgContent]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.15, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.15, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.05;
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom(z => Math.max(Math.min(z + direction * zoomFactor, 3), 0.5));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(svgContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-diagram.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>Interactive Diagram</span>
          <span style={{ fontSize: "0.75rem", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)", padding: "2px 8px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Move size={10} /> Drag to pan, Scroll to zoom
          </span>
        </div>
        
        {/* Controls toolbar */}
        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button onClick={handleZoomIn} className="btn btn-secondary" style={{ padding: "0.5rem", borderRadius: "8px" }} title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} className="btn btn-secondary" style={{ padding: "0.5rem", borderRadius: "8px" }} title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button onClick={handleReset} className="btn btn-secondary" style={{ padding: "0.5rem", borderRadius: "8px" }} title="Reset View">
            <RotateCcw size={16} />
          </button>
          <div style={{ width: "1px", background: "var(--border-color)", margin: "0 4px" }} />
          <button onClick={handleCopy} className="btn btn-secondary" style={{ padding: "0.5rem", borderRadius: "8px" }} title="Copy SVG Code">
            {copied ? <Check size={16} style={{ color: "var(--secondary)" }} /> : <Copy size={16} />}
          </button>
          <button onClick={handleDownload} className="btn btn-secondary" style={{ padding: "0.5rem", borderRadius: "8px" }} title="Download SVG File">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* SVG Canvas view */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          background: "#1E293B",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          height: "450px",
          width: "100%",
          position: "relative",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
          boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.4)"
        }}
      >
        <div
          ref={svgWrapperRef}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            userSelect: "none"
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>
    </div>
  );
}
