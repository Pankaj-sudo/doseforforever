const { Firestore } = require('@google-cloud/firestore');
const fs = require('fs');
const path = require('path');
const saPath = path.join(process.cwd(), 'serviceAccountKey.json');
try {
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  console.log('serviceAccount project_id:', sa.project_id);
  const db = new Firestore({
    projectId: sa.project_id,
    credentials: {
      client_email: sa.client_email,
      private_key: sa.private_key
    }
  });
  db.collection('orders').limit(1).get().then(snapshot => {
    console.log('ok', snapshot.size);
    process.exit(0);
  }).catch(err => {
    console.error('firestore err', err.message);
    console.error(err);
    process.exit(1);
  });
} catch (err) {
  console.error('init err', err.message);
  process.exit(1);
}
