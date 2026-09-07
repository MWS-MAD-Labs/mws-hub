export function normalizeKeywordParts(value: string): string[] {
  return value
    .split(",")
    .map((keyword) => keyword.replace(/\s+/g, " ").trim());
}
