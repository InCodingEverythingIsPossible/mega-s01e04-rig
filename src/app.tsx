import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { isNight } from './digest/flags.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const id = c.req.param('night');
    const night = isNight(id) ? readNight(config.runsDir, id) : null;
    if (!night) return c.notFound();
    return c.html(
      <Layout title={`digest ${id}`} lane={lane()}>
        <DigestPage night={night} />
      </Layout>,
    );
  });

  // Same reader and the same night check as the page, so the two never disagree (ADR 0001).
  app.get('/api/digest/:night', (c) => {
    const id = c.req.param('night');
    if (!isNight(id)) return c.json({ error: 'not found' }, 404);
    const night = readNight(config.runsDir, id);
    if (!night) return c.json({ error: `no digest for ${id}` }, 404);
    return c.json(night);
  });

  return app;
}
