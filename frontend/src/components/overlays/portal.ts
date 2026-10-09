export function getOverlayRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("overlay-root") || document.body;
}
