export function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  let safe = text.replaceAll('"', '""');
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  return `"${safe}"`;
}
