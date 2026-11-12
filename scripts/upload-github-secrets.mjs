#!/usr/bin/env node
/**
 * Загрузка секретов GitHub Actions через API (Промт 9, Часть B).
 *
 * Шифрование — libsodium sealed box публичным ключом репозитория.
 * Значения читаются из secrets/.env.local и никогда не печатаются.
 *
 * Запуск: node scripts/upload-github-secrets.mjs
 */
import fs from 'node:fs';
import _sodium from 'libsodium-wrappers';

const REPO = 'bolqor83-crypto/bazar';

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

  const secrets = {
    NEON_DATABASE_URL_DIRECT: local.NEON_DATABASE_URL_DIRECT,
    NEON_DATABASE_URL_POOLED: local.NEON_DATABASE_URL_POOLED,
    JWT_ACCESS_SECRET: local.JWT_ACCESS_SECRET_CI,
    JWT_REFRESH_SECRET: local.JWT_REFRESH_SECRET_CI,
  };
  for (const [k, v] of Object.entries(secrets)) {
    if (!v) throw new Error(`Не задано значение ${k} (в secrets/.env.local)`);
  }

  await _sodium.ready;
  const sodium = _sodium;

  // Публичный ключ репозитория.
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
  console.log('Все секреты GitHub Actions загружены');
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});
