"use client";

import { Badge } from "@/components/ui/badge";

interface TechStackCategories {
  languages: string[];
  frameworks: string[];
  libraries: string[];
  databases: string[];
  tools: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  languages: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  frameworks: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  libraries: "bg-green-500/10 text-green-400 border-green-500/20",
  databases: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  tools: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  languages: "Languages",
  frameworks: "Frameworks",
  libraries: "Libraries",
  databases: "Databases",
  tools: "DevOps & Tools",
};

interface Props {
  techStack: TechStackCategories;
}

export default function TechStack({ techStack }: Props) {
  const categories = Object.entries(techStack).filter(
    ([, items]) => items.length > 0,
  );

  return (
    <div className="flex flex-col gap-3">
      {categories.map(([category, items]) => (
        <div key={category} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {CATEGORY_LABELS[category] ?? category}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <Badge
                key={item}
                variant="outline"
                className={`text-xs ${CATEGORY_COLORS[category] ?? ""}`}
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
