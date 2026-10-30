import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNight, Status } from './types.js';

type Entry = { at: string; job: string; status: Status; owner: string | null; error: string | null };

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: readonly string[] = ['ok', 'retry', 'fail'] satisfies Status[];

export function parseEntry(line: string): Entry | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.at !== 'string' || typeof v.job !== 'string' || v.job === '') return null;
  if (typeof v.status !== 'string' || !STATUSES.includes(v.status)) return null;
  if (v.owner !== null && typeof v.owner !== 'string') return null;
  if (v.error !== undefined && v.error !== null && typeof v.error !== 'string') return null;
  return {
    at: v.at,
    job: v.job,
    status: v.status as Status,
    owner: v.owner,
    error: typeof v.error === 'string' ? v.error : null,
  };
}

// Reads runs/<night>.jsonl into one row per job. Bad lines are counted, never thrown.
// Rows follow file order within a job: first/last/lastStatus come from the first and last lines.
export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const entry = parseEntry(line);
    if (!entry) {
      badLines++;
      continue;
    }
    const row = byJob.get(entry.job);
    if (!row) {
      byJob.set(entry.job, {
        job: entry.job,
        owner: entry.owner,
        runs: 1,
        retries: entry.status === 'retry' ? 1 : 0,
        lastStatus: entry.status,
        lastError: entry.error,
        first: entry.at,
        last: entry.at,
      });
      continue;
    }
    row.owner = entry.owner;
    row.runs++;
    if (entry.status === 'retry') row.retries++;
    row.lastStatus = entry.status;
    if (entry.error !== null) row.lastError = entry.error;
    row.last = entry.at;
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { rows, badLines };
};
