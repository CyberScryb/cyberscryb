const KEY = 'cyberscryb:recent_tools';
const MAX = 5;

export function addRecentTool(slug: string): void {
  const current = getRecentTools();
  const updated = [slug, ...current.filter(s => s !== slug)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch { /* storage full */ }
}

export function getRecentTools(): string[] {
  try {
    const data = localStorage.getItem(KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
