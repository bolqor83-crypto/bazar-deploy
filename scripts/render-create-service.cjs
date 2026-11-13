#!/usr/bin/env node
/**
 * Создание Render web-сервиса bazar (Промт 10, Часть A).
 *
 * POST /v1/services: web_service, node, free, frankfurt,
 * repo bolqor83-crypto/bazar, branch main. Env — через API,
 * значения не печатаются. Результат: id + URL сервиса.
 */
const { readFileSync } = require('node:fs');
const crypto = require('node:crypto');

function readEnv() {
  const out = {};
  for (const line of readFileSync('/home/z/my-project/secrets/.env.local', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const secrets = readEnv();
const RENDER_API_KEY = secrets.RENDER_API_KEY;
if (!RENDER_API_KEY) throw new Error('RENDER_API_KEY отсутствует');

const envVars = [
  { key: 'NODE_VERSION', value: '22' },
  { key: 'DATABASE_URL_POOLED', value: secrets.NEON_DATABASE_URL_POOLED },
  { key: 'DATABASE_URL_DIRECT', value: secrets.NEON_DATABASE_URL_DIRECT },
  { key: 'JWT_ACCESS_SECRET', value: crypto.randomBytes(48).toString('hex') },
  { key: 'JWT_REFRESH_SECRET', value: crypto.randomBytes(48).toString('hex') },
  { key: 'SMS_PROVIDER', value: 'console' },
  { key: 'EXPO_PUBLIC_API_URL', value: '/api' },
  { key: 'CORS_ORIGINS', value: '' },
];

const payload = {
  ownerId: 'tea-dbo9mo6c6qcc73d1mne0',
  autoDeploy: 'no',
  branch: 'main',
  name: 'bazar',
  repo: 'https://github.com/bolqor83-crypto/bazar-deploy',
  type: 'web_service',
  serviceDetails: {
    runtime: 'node',
    region: 'frankfurt',
    plan: 'free',
    buildCommand:
      'pnpm install --frozen-lockfile && pnpm --filter api build && pnpm --filter mobile exec expo export --platform web',
    startCommand: 'node apps/api/dist/src/main.js',
    healthCheckPath: '/api/health',
    envSpecificDetails: {
      buildCommand:
        'pnpm install --frozen-lockfile && pnpm --filter api build && pnpm --filter mobile exec expo export --platform web',
      startCommand: 'node apps/api/dist/src/main.js',
      envVars,
    },
  },
};

fetch('https://api.render.com/v1/services', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${RENDER_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify(payload),
})
  .then(async (res) => {
    const body = await res.json();
    if (!res.ok) {
      console.error('ОШИБКА', res.status, JSON.stringify(body).slice(0, 500));
      process.exit(1);
    }
    const svc = body.service ?? body;
    console.log(
      JSON.stringify(
        { id: svc.id, name: svc.name, slug: svc.slug, serviceDetails: { url: svc.serviceDetails?.url ?? null } },
        null,
        2,
      ),
    );
  })
  .catch((e) => {
    console.error('СБОЙ СЕТИ:', e.message);
    process.exit(1);
  });
