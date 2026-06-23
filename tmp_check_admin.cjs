const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const saPath = path.join(process.cwd(), 'serviceAccountKey.json');
try {
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  console.log('serviceAccount project_id:', sa.project_id);
  const app = admin.initializeApp({
    credential: admin.credential.cert(sa),
    projectId: sa.project_id
  });
  console.log('app options', app.options);
  const db = admin.firestore();
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
