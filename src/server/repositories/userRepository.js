const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, execute } = require('../config/database');

function sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

async function findByCredentials(username, password) {
    const rows = await query('SELECT id, name, username, password, role FROM users WHERE username = ?', [username]);
    const user = rows[0] || null;
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

async function findAdminPassword() {
    const rows = await query('SELECT id, name, username, password, role FROM users WHERE role = ? LIMIT 1', ['admin']);
    return rows[0] || null;
}

async function listUsers() {
    return query('SELECT id, name, username, role, created_at FROM users ORDER BY role DESC, id');
}

async function getUser(id) {
    const rows = await query('SELECT id, name, username, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
}

async function createUser(data) {
    const hashedPassword = await bcrypt.hash(sha256(data.password), 10);
    return execute(
        'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
        [data.name, data.username, hashedPassword, data.role || 'employee']
    );
}

async function updateUser(id, data) {
    return execute(
        'UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?',
        [data.name, data.username, data.role || 'employee', id]
    );
}

async function resetPassword(id) {
    const hashedPassword = await bcrypt.hash(sha256('123456'), 10);
    return execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
}

async function deleteUser(id) {
    return execute('DELETE FROM users WHERE id = ?', [id]);
}

async function changePassword(id, oldPasswordHash, newPasswordHash) {
    // 先验证旧密码是否正确
    const rows = await query('SELECT password FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return 0;
    const user = rows[0];
    const isMatch = await bcrypt.compare(oldPasswordHash, user.password);
    if (!isMatch) return -1; // 旧密码不正确
    // 更新为新密码
    const hashedNewPassword = await bcrypt.hash(newPasswordHash, 10);
    const result = await execute('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, id]);
    return result.affectedRows;
}

module.exports = {
    changePassword,
    createUser,
    deleteUser,
    findAdminPassword,
    findByCredentials,
    getUser,
    listUsers,
    resetPassword,
    updateUser
};
