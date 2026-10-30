import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { countNight } from '../src/digest/counts.js';

it('counts valid lines by status, skips bad lines, null when missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'counts-'));
  const l = (job: string, status: string) => JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job, status, owner: null });
  writeFileSync(join(dir, '2026-10-28.jsonl'), [l('a', 'ok'), l('a', 'ok'), l('b', 'retry'), 'garbage', l('c', 'fail'), ''].join('\n'));
  expect(countNight(dir, '2026-10-28')).toEqual({ ok: 2, retry: 1, fail: 1 });
  expect(countNight(dir, '2026-10-01')).toBeNull();
});
