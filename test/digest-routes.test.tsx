import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { readNight } from '../src/digest/read.js';
import type { NightDigest } from '../src/digest/types.js';

const REAL_NIGHT = 'runs/2026-10-28.jsonl';
const GOOD_LINE = '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}';
const BAD_LINE = '{"at":"2026-10-28T23:05:00+01:00","job":';

let runsDir: string;

function config(): Parameters<typeof createApp>[0] {
  return {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  };
}

beforeAll(() => {
  process.env.LANE_MARKER = 'TEST-MARKER';
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  copyFileSync(REAL_NIGHT, join(runsDir, '2026-10-28.jsonl'));
  writeFileSync(join(runsDir, '2026-10-27.jsonl'), '');
  writeFileSync(join(runsDir, '2026-10-26.jsonl'), `${GOOD_LINE}\n${BAD_LINE}\n`);
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('renders a table of jobs with the lane banner', async () => {
    const res = await createApp(config()).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    expect(html).toContain('<table');
    for (const job of ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']) {
      expect(html).toContain(job);
    }
  });

  it('marks rows with 3+ retries or a last status of fail with class="warn"', async () => {
    const html = await (await createApp(config()).request('/digest/2026-10-28')).text();
    // fixtures/refresh has 3 retries; notes/backup ends with fail.
    expect(html).toMatch(/class="warn"[^>]*>[\s\S]*?fixtures\/refresh/);
    expect(html).toMatch(/class="warn"[^>]*>[\s\S]*?notes\/backup/);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config()).request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty night', async () => {
    const res = await createApp(config()).request('/digest/2026-10-27');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('still renders 200 and reports the bad line', async () => {
    const res = await createApp(config()).request('/digest/2026-10-26');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('rig/rotate-logs');
    expect(html).toContain('1 line(s) did not parse');
  });
});

describe('GET /api/digest/:night', () => {
  it('answers 200 with exactly { night, rows, badLines }', async () => {
    const res = await createApp(config()).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as NightDigest & { night: string };
    expect(Object.keys(body).sort()).toEqual(['badLines', 'night', 'rows']);
    expect(body.night).toBe('2026-10-28');
    expect(body).toEqual({ night: '2026-10-28', ...readNight(runsDir, '2026-10-28') });
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(config()).request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('returns no rows and zero bad lines for an empty night', async () => {
    const res = await createApp(config()).request('/api/digest/2026-10-27');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-10-27', rows: [], badLines: 0 });
  });

  it('counts the bad line and keeps the other rows', async () => {
    const res = await createApp(config()).request('/api/digest/2026-10-26');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['rig/rotate-logs']);
  });
});

describe('page and JSON agree', () => {
  it('lists jobs in the HTML in the same order as rows', async () => {
    const app = createApp(config());
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as { rows: { job: string }[] };
    const positions = body.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
