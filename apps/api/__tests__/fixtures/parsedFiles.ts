import type { ParsedFile } from "../../src/services/fileParser";

export const simpleParsedFiles: ParsedFile[] = [
  {
    path: "src/index.ts",
    language: "typescript",
    imports: ["./utils", "express"],
    exports: ["main", "default:main"],
    functions: ["main"],
    classes: [],
    content: 'import { helper } from "./utils";\nimport express from "express";\n\nexport function main() {\n  const app = express();\n  helper();\n  return app;\n}\n',
  },
  {
    path: "src/utils.ts",
    language: "typescript",
    imports: ["node:path"],
    exports: ["helper", "formatDate", "DateFormatter"],
    functions: ["helper", "formatDate"],
    classes: ["DateFormatter"],
    content: 'import path from "node:path";\n\nexport function helper(): string {\n  return path.resolve(".");\n}\n\nexport const formatDate = (d: Date) => d.toISOString();\n',
  },
  {
    path: "src/components/Button.tsx",
    language: "typescript",
    imports: ["react", "../utils"],
    exports: ["Button", "default:Button"],
    functions: ["Button"],
    classes: [],
    content: 'import React from "react";\nimport { helper } from "../utils";\n\nexport function Button({ label, onClick }) {\n  return <button onClick={onClick}>{label}</button>;\n}\n',
  },
  {
    path: "src/services/api.ts",
    language: "typescript",
    imports: ["../utils"],
    exports: ["fetchData", "ApiClient"],
    functions: ["fetchData"],
    classes: ["ApiClient"],
    content: 'import { helper } from "../utils";\n\nexport async function fetchData(url: string) {\n  const result = await fetch(url);\n  helper();\n  return result.json();\n}\n',
  },
];

export const pythonParsedFiles: ParsedFile[] = [
  {
    path: "main.py",
    language: "python",
    imports: ["os", "sys", "utils"],
    exports: [],
    functions: ["main", "run"],
    classes: ["App"],
    content: 'import os\nimport sys\nfrom utils import helper\n\ndef main():\n    pass\n\ndef run():\n    helper()\n\nclass App:\n    pass\n',
  },
  {
    path: "utils.py",
    language: "python",
    imports: ["pathlib"],
    exports: [],
    functions: ["helper", "format_date"],
    classes: [],
    content: 'from pathlib import Path\n\ndef helper():\n    return str(Path("."))\n\ndef format_date(d):\n    return d.isoformat()\n',
  },
];
