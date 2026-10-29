import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const line = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error ? { error } : {}) });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  const normal = [
    line('2026-10-28T01:00:00+01:00', 'zeta-sync', 'ok', 'ola'),
    line('2026-10-28T01:05:00+01:00', 'alpha-backup', 'retry', 'kuba', 'timeout'),
    line('2026-10-28T01:10:00+01:00', 'alpha-backup', 'retry', 'kuba', 'timeout'),
    line('2026-10-28T01:15:00+01:00', 'alpha-backup', 'retry', 'kuba', 'timeout'),
    line('2026-10-28T01:20:00+01:00', 'alpha-backup', 'ok', 'kuba'),
    line('2026-10-28T02:00:00+01:00', 'mid-report', 'fail', null, 'boom'),
  ];
  writeFileSync(join(dir, '2026-10-01.jsonl'), normal.join('\n') + '\n');
  writeFileSync(join(dir, '2026-10-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-10-03.jsonl'),
    [line('2026-10-03T01:00:00+01:00', 'only-job', 'ok', 'ola'), 'this is not json'].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

type Body = { night: string; rows: { job: string }[]; badLines: number };

describe('digest page', () => {
  it('200 renders a table with warn marks and a dash for a null owner', async () => {
    const res = await app.request('/digest/2026-10-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<table');
    expect(html).toContain('warn');
    expect(html).toContain('—');
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-09-30')).status).toBe(404);
  });

  it('empty night says nothing ran', async () => {
    const res = await app.request('/digest/2026-10-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('a night with a bad line still renders', async () => {
    const res = await app.request('/digest/2026-10-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('only-job');
  });
});

describe('digest json', () => {
  it('200 returns night, sorted rows and badLines', async () => {
    const res = await app.request('/api/digest/2026-10-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.night).toBe('2026-10-01');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(['alpha-backup', 'mid-report', 'zeta-sync']);
    expect(body.rows[0]).toEqual({
      job: 'alpha-backup',
      owner: 'kuba',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'timeout',
      firstAt: '2026-10-28T01:05:00+01:00',
      lastAt: '2026-10-28T01:20:00+01:00',
    });
  });

  it('404 for a night with no file', async () => {
    expect((await app.request('/api/digest/2026-09-30')).status).toBe(404);
  });

  it('empty night has an empty rows array', async () => {
    const res = await app.request('/api/digest/2026-10-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.rows).toEqual([]);
  });

  it('bad-line night reports badLines 1', async () => {
    const res = await app.request('/api/digest/2026-10-03');
    expect(res.status).toBe(200);
    expect(((await res.json()) as Body).badLines).toBe(1);
  });
});

describe('page and json agree', () => {
  it('lists the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-01')).text();
    const body = (await (await app.request('/api/digest/2026-10-01')).json()) as Body;
    const jobs = body.rows.map((r) => r.job);
    const positions = jobs.map((j) => html.indexOf(j));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
