const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(process.cwd(), 'serviceAccountKey.json'), 'utf8');
console.log('raw index of "\\n":', raw.indexOf('\\n'));
console.log('first 200 chars raw:', raw.slice(0,200));
try {
  const json = JSON.parse(raw);
  const key = json.private_key;
  console.log('key type:', typeof key);
  console.log('key length:', key.length);
  console.log('key startswith BEGIN:', key.startsWith('-----BEGIN PRIVATE KEY-----'));
  console.log('key includes backslash-n literal:', key.includes('\\n'));
  console.log('key first 60:', key.slice(0,60));
  console.log('key lines:', key.split('\n').length);
  console.log('last 60:', key.slice(-60));
} catch (err) {
  console.error('json parse err', err.message);
}
