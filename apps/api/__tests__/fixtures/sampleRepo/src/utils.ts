import path from "node:path";

export function helper(): string {
  return path.resolve(".");
}

export const formatDate = (d: Date) => d.toISOString();

export class DateFormatter {
  format(d: Date): string {
    return d.toISOString();
  }
}
