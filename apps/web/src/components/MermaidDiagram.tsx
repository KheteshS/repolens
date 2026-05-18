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
        theme: "dark",
        themeVariables: {
          background: "#1a1a2e",
          primaryColor: "#7c3aed",
          primaryTextColor: "#f0f0f0",
          edgeLabelBackground: "#1a1a2e",
          lineColor: "#6366f1",
        },
      });

      if (cancelled || !ref.current) return;

      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      try {
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = `<pre class="text-destructive text-xs p-4">${chart}</pre>`;
        }
      }
    }

    render();
    return () => { cancelled = true; };
  }, [chart]);

  return <div ref={ref} className="min-h-[200px] flex items-center justify-center" />;
}
