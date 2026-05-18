"use client";

interface Props {
  totalFiles: number;
  languages: string[];
  architectureStyle: string;
  analyzedAt: string;
}

export default function QuickStats({ totalFiles, languages, architectureStyle, analyzedAt }: Props) {
  const stats = [
    { label: "Files", value: totalFiles.toString() },
    { label: "Languages", value: languages.length.toString() },
    { label: "Architecture", value: architectureStyle },
    { label: "Analyzed", value: new Date(analyzedAt).toLocaleDateString() },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center p-3 rounded-lg bg-card border border-border"
        >
          <span className="text-lg font-bold text-foreground">{stat.value}</span>
          <span className="text-xs text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
