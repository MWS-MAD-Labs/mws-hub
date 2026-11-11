// Dark text on a light colour, light text on a dark one.
export function readableOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1F2A44" : "#FFFFFF";
}

export const iconTileStyle = (hex?: string) =>
  hex && /^#[0-9a-fA-F]{6}$/.test(hex)
    ? { backgroundColor: hex, color: readableOn(hex) }
    : undefined;
