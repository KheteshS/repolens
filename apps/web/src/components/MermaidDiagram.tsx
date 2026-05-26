"use client";

import { useEffect, useRef } from "react";

interface Props {
  chart: string;
}

export default function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !chart) return;

    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        flowchart: {
          curve: "rounded",
        },
        themeVariables: {
          background: "#f8fafc",
          primaryColor: "#6366f1",
          primaryTextColor: "#1e293b",
          edgeLabelBackground: "#ffffff",
          lineColor: "#6366f1",
          secondaryColor: "#e0e7ff",
          tertiaryColor: "#f1f5f9",
        },
      });

      if (cancelled || !ref.current) return;

      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          // Inject animation keyframes + apply dashed animated style to edge paths
          const animStyle = `
            <style>
              @keyframes mermaidDash {
                0% { stroke-dashoffset: 24; }
                100% { stroke-dashoffset: 0; }
              }
              .edgePaths path, .edgePath path, .flowchart-link {
                stroke-dasharray: 8 4 !important;
                stroke-width: 2px !important;
                stroke-linecap: round !important;
                animation: mermaidDash 1s linear infinite !important;
                marker-end: none !important;
              }
            </style>
          `;
          ref.current.innerHTML = animStyle + svg;
        }
      } catch {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre class="text-destructive text-xs p-4">${chart}</pre>`;
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div ref={ref} className="min-h-[200px] flex items-center justify-center" />
  );
}
