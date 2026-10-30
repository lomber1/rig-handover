import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEntry } from './read.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// Counts valid log lines per status in runs/<night>.jsonl; null when the file does not exist.
export function countNight(runsDir: string, night: string): NightCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const entry = parseEntry(line);
    if (entry) counts[entry.status]++;
  }
  return counts;
}
