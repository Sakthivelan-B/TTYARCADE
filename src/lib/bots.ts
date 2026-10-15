// Random CPU identity pool. When nobody joins a room, a CPU takes a seat with
// one of these names so the game can still be played (and feels populated).
const FIRST = [
  "neo", "ada", "kai", "ivy", "max", "zoe", "rex", "lua", "nix", "oro",
  "bit", "echo", "nova", "pixel", "ghost", "raven", "sable", "quill", "volt", "wren",
  "atlas", "cipher", "dune", "ember", "flint", "glyph", "hex", "ion", "juno", "kite",
];
const LAST = ["_bot", "x", "77", ".sh", "_ai", "01", "-", "99", "_cpu", "2k"];

export function randomCpuName(): string {
  const a = FIRST[Math.floor(Math.random() * FIRST.length)];
  const b = Math.random() < 0.5 ? LAST[Math.floor(Math.random() * LAST.length)] : "";
  return `${a}${b}`;
}

/** Pick a name that no current seat uses (avoids name clashes in a room). */
export function uniqueCpuName(taken: string[]): string {
  for (let i = 0; i < 40; i++) {
    const n = randomCpuName();
    if (!taken.includes(n)) return n;
  }
  return `cpu_${Date.now() % 10000}`;
}

/** Suffix a clashing human name instead of rejecting it: ada -> ada~2 */
export function dedupeName(name: string, taken: string[]): string {
  if (!taken.includes(name)) return name;
  for (let i = 2; i < 100; i++) {
    const n = `${name}~${i}`;
    if (!taken.includes(n)) return n;
  }
  return `${name}~${Date.now() % 1000}`;
}
