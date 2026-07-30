const fs = require('fs');
const path = require('path');

const publicFiles = ['account-deletion.html', 'privacy-policy.html'];

for (const file of publicFiles) {
  fs.copyFileSync(
    path.join(__dirname, '..', 'public', file),
    path.join(__dirname, '..', 'dist', file),
  );
}
