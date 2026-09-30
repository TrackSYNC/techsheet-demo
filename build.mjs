// Builds index.html: the four TechSheet prototype screens, AES-256-GCM encrypted,
// behind a password prompt that decrypts them in the browser (WebCrypto).
// Only ciphertext is written; the plain screens never enter this repo.
//
// Usage: DEMO_PASSWORD=xxxx node build.mjs [path/to/techsheet/prototype]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';

const password = process.env.DEMO_PASSWORD;
if (!password) { console.error('Set DEMO_PASSWORD'); process.exit(1); }
const src = process.argv[2] || '../techsheet/prototype';
const ITER = 600000;

const screens = {};
for (const name of ['participant', 'inspector', 'instructor', 'staff']) {
  screens[name] = readFileSync(join(src, `tech-sheet-${name}-view.html`), 'utf8');
}

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update(JSON.stringify(screens), 'utf8'), cipher.final(), cipher.getAuthTag()]);

const payload = JSON.stringify({ salt: salt.toString('base64'), iv: iv.toString('base64'), iter: ITER, ct: ct.toString('base64') });
const template = readFileSync(new URL('./template.html', import.meta.url), 'utf8');
writeFileSync(new URL('./index.html', import.meta.url), template.replace('__PAYLOAD__', payload));
console.log(`index.html written (${(ct.length / 1024).toFixed(0)} KB ciphertext)`);
