import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readNight } from './digest/read.js';
import { readStatus } from './status.js';
import { DigestTable } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

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
    const night = c.req.param('night');
    const digest = NIGHT.test(night) ? readNight(config.runsDir, night) : null;
    if (digest === null) {
      return c.html(
        <Layout title={`digest · ${night}`} lane={lane()}>
          <p>no run log for {night}</p>
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestTable night={night} digest={digest} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!NIGHT.test(night)) return c.json({ error: 'not found' }, 404);
    const digest = readNight(config.runsDir, night);
    if (digest === null) return c.json({ error: 'not found', night }, 404);
    return c.json({ night, rows: digest.rows, badLines: digest.badLines });
  });

  return app;
}
