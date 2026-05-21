"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import GraphNodeComponent from "./GraphNode";
import AnimatedEdge from "./AnimatedEdge";
import DetailPanel from "./DetailPanel";

const nodeTypes = { graphNode: GraphNodeComponent };
const edgeTypes = { animated: AnimatedEdge };

const defaultEdgeOptions = {
  style: { stroke: "#6366f1", strokeWidth: 2 },
  labelStyle: { fill: "#374151", fontSize: 10, fontWeight: 500 },
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 3,
};

interface Props {
  nodes: Node[];
  edges: Edge[];
  title: string;
}

export default function InteractiveGraph({ nodes: initialNodes, edges: initialEdges, title }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync nodes/edges when props change (tab switch)
  // Ensure all edges are animated with dashed moving lines
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(
      initialEdges.map((edge) => ({
        ...edge,
        type: "animated",
        markerEnd: undefined,
      }))
    );
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className={`relative rounded-xl border border-slate-200 overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen" : "h-[650px] w-full"}`} style={{ background: "#f8fafc" }}>
      {/* Graph title bar */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-white/90 backdrop-blur-sm border-b border-slate-200 flex items-center px-4 z-10">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{nodes.length} nodes &middot; {edges.length} edges</span>
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors text-slate-500 hover:text-slate-700"
          >
            {isFullscreen ? "Exit" : "Expand"}
          </button>
        </div>
      </div>

      <div className="h-[calc(100%-2.5rem)] w-full">
        <ReactFlow
          key={title}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.02}
          maxZoom={10}
          style={{ background: "#f8fafc" }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            showInteractive={false}
            className="!bg-white !border-slate-200 !shadow-md [&>button]:!bg-white [&>button]:!border-slate-200 [&>button]:!text-slate-600 [&>button:hover]:!bg-slate-50"
          />
          <MiniMap
            className="!bg-white !border-slate-200 !rounded-md !shadow-sm"
            nodeColor="#6366f1"
            maskColor="rgba(0,0,0,0.08)"
            pannable
            zoomable
          />
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(99,102,241,0.12)" />
        </ReactFlow>
      </div>

      {selectedNode && (
        <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}
