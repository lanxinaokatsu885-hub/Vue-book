const { query, execute } = require('../config/database');

async function getLatestContent(type) {
    const rows = await query('SELECT * FROM notices WHERE type = ? ORDER BY id DESC LIMIT 1', [type]);
    return rows[0] || null;
}

async function replaceContent(type, text, images) {
    await execute('DELETE FROM notices WHERE type = ?', [type]);
    const imageJson = JSON.stringify(images || []);
    const firstImage = images && images.length > 0 ? images[0] : null;
    const result = await execute(
        'INSERT INTO notices (type, content, images, image_url, updated_at) VALUES (?, ?, ?, ?, NOW())',
        [type, text || '', imageJson, firstImage]
    );
    return result.insertId;
}

module.exports = {
    getLatestContent,
    replaceContent
};
