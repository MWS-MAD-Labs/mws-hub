// Hub's public origin. One definition, because it is read from four places
// and a disagreement between them is not obvious from any single one: the
// logout allowlist once dropped Hub's own origin simply because it read the
// variable without the fallback the other three used.
export function frontendOrigin(): string {
  return process.env.FRONTEND_ORIGIN || "http://localhost:5175";
}
