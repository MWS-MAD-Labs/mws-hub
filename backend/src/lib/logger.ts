export const logger = {
  info: (...args: unknown[]) => console.log("[hub]", ...args),
  error: (...args: unknown[]) => console.error("[hub]", ...args),
};
