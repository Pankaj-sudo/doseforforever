const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const saPath = path.join(process.cwd(), 'serviceAccountKey.json');
try {
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/datastore']
  });
  client.authorize((err, tokens) => {
    if (err) {
      console.error('token err', err.message || err);
      process.exit(1);
    }
    console.log('tokens', tokens);
    process.exit(0);
  });
} catch (err) {
  console.error('init err', err.message);
  process.exit(1);
}
