const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const uploadDir = path.join(rootDir, 'uploads');
const backupDir = path.join(rootDir, 'beifen');
const publicDir = path.join(rootDir, 'public');
const bookDir = path.join(rootDir, 'book');

for (const dir of [uploadDir, backupDir, publicDir]) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

module.exports = {
    rootDir,
    uploadDir,
    backupDir,
    publicDir,
    bookDir
};
