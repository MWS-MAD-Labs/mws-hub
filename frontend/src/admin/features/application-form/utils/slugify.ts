// The id the backend would derive from a name, shown so nobody has to guess
// what it will be - it ends up in the launch URL.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
