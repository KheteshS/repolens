"use client";

import { getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  return (
    <g>
      <style>
        {`
          @keyframes dashflow {
            0% { stroke-dashoffset: 24; }
            100% { stroke-dashoffset: 0; }
          }
          .rf-animated-path {
            stroke-dasharray: 8 4;
            stroke-linecap: round;
            animation: dashflow 1s linear infinite;
          }
        `}
      </style>
      {/* Faint base path — no arrow */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke="#6366f1"
        strokeWidth={1}
        strokeOpacity={0.15}
        strokeLinecap="round"
      />
      {/* Animated flowing dashes — smooth bezier, no arrow */}
      <path
        d={edgePath}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeLinecap="round"
        className="rf-animated-path"
      />
      {label && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 10}
          width={80}
          height={20}
          style={{ overflow: "visible" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{
              fontSize: "9px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}>
              {label as string}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
