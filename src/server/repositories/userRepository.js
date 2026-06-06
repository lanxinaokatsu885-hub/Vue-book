const { query, execute } = require('../config/database');

async function findByCredentials(username, password) {
    const rows = await query('SELECT id, name, username, role FROM users WHERE username = ? AND password = ?', [username, password]);
    return rows[0] || null;
}

async function findAdminPassword() {
    const rows = await query('SELECT password FROM users WHERE role = ? LIMIT 1', ['admin']);
    return rows[0] ? rows[0].password : null;
}

async function listUsers() {
    return query('SELECT id, name, username, role, created_at FROM users ORDER BY role DESC, id');
}

async function getUser(id) {
    const rows = await query('SELECT id, name, username, role, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
}

async function createUser(data) {
    return execute(
        'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
        [data.name, data.username, data.password, data.role || 'employee']
    );
}

async function updateUser(id, data) {
    return execute(
        'UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?',
        [data.name, data.username, data.role || 'employee', id]
    );
}

async function resetPassword(id) {
    return execute('UPDATE users SET password = ? WHERE id = ?', ['123456', id]);
}

async function deleteUser(id) {
    return execute('DELETE FROM users WHERE id = ?', [id]);
}

module.exports = {
    createUser,
    deleteUser,
    findAdminPassword,
    findByCredentials,
    getUser,
    listUsers,
    resetPassword,
    updateUser
};
