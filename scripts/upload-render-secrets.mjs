#!/usr/bin/env node
/**
 * Загрузка секретов деплоя Render в GitHub Actions (Промт 10).
 *
 * RENDER_SERVICE_ID — id сервиса; RENDER_API_KEY — ключ API.
 * Значения читаются из secrets/.env.local, не печатаются.
 */
import fs from 'node:fs';
import _sodium from 'libsodium-wrappers';

const REPO = 'bolqor83-crypto/bazar';
const SERVICE_ID = 'srv-dbrcjbd6e07s73b8tba0';

function readEnvLocal() {
  const text = fs.readFileSync('secrets/.env.local', 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

async function main() {
  const local = readEnvLocal();
  const token = local.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN не найден в secrets/.env.local');
  if (!local.RENDER_API_KEY) throw new Error('RENDER_API_KEY не найден');

  const secrets = {
    RENDER_SERVICE_ID: SERVICE_ID,
    RENDER_API_KEY: local.RENDER_API_KEY,
    MIRROR_PAT: local.GITHUB_TOKEN,
  };

  await _sodium.ready;
  const sodium = _sodium;

  const pkRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/secrets/public-key`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    },
  );
  if (!pkRes.ok) throw new Error(`public-key: HTTP ${pkRes.status}`);
  const { key, key_id: keyId } = await pkRes.json();

  const binKey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
  for (const [name, value] of Object.entries(secrets)) {
    const encrypted = sodium.crypto_box_seal(value, binKey);
    const b64 = sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/secrets/${name}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encrypted_value: b64, key_id: keyId }),
      },
    );
    if (!res.ok) throw new Error(`secret ${name}: HTTP ${res.status}`);
    console.log(`Секрет ${name}: загружен`);
  }
  console.log('Секреты деплоя Render загружены');
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
