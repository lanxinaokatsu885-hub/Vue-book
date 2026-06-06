const { query, execute } = require('../config/database');

async function insertSwapRequest(record) {
    return execute(
        'INSERT INTO swap_requests (applicant, original_shift, swap_user, target_shift, swap_reason, week, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [
            record.applicant,
            record.originalShift,
            record.swapUser,
            record.targetShift || '',
            record.reason || '',
            record.week || '第一周',
            record.status || 'approved'
        ]
    );
}

async function insertSubstituteRequest(record) {
    return execute(
        'INSERT INTO substitute_requests (applicant, substitute_user, substitute_shift, substitute_reason, week, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [
            record.applicant,
            record.substituteUser,
            record.substituteShift || '',
            record.reason || '',
            record.week || '第一周',
            record.status || 'approved'
        ]
    );
}

async function listApprovedRequests(week) {
    const params = ['approved'];
    let swapSql = 'SELECT * FROM swap_requests WHERE status = ?';
    let substituteSql = 'SELECT * FROM substitute_requests WHERE status = ?';
    if (week) {
        swapSql += ' AND week = ?';
        substituteSql += ' AND week = ?';
        params.push(week);
    }
    swapSql += ' ORDER BY created_at DESC LIMIT 10';
    substituteSql += ' ORDER BY created_at DESC LIMIT 10';

    const [swaps, substitutes] = await Promise.all([
        query(swapSql, params),
        query(substituteSql, params)
    ]);

    return { swaps, substitutes };
}

async function listTodayRecords(todayStart, todayEnd) {
    const swapSql = `SELECT
        id,
        'swap' as type,
        applicant,
        swap_user as target_user,
        original_shift,
        target_shift,
        swap_reason as reason,
        week,
        created_at
    FROM swap_requests
    WHERE status = 'approved'
    AND created_at >= ? AND created_at < ?
    ORDER BY created_at DESC`;

    const substituteSql = `SELECT
        id,
        'substitute' as type,
        applicant,
        substitute_user as target_user,
        substitute_shift as original_shift,
        '' as target_shift,
        substitute_reason as reason,
        week,
        created_at
    FROM substitute_requests
    WHERE status = 'approved'
    AND created_at >= ? AND created_at < ?
    ORDER BY created_at DESC`;

    const [swaps, substitutes] = await Promise.all([
        query(swapSql, [todayStart, todayEnd]),
        query(substituteSql, [todayStart, todayEnd])
    ]);
    return [...swaps, ...substitutes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function getRequestById(type, id) {
    const table = type === 'swap' ? 'swap_requests' : 'substitute_requests';
    const rows = await query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
}

async function deleteRequestById(type, id) {
    const table = type === 'swap' ? 'swap_requests' : 'substitute_requests';
    return execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
}

module.exports = {
    deleteRequestById,
    getRequestById,
    insertSubstituteRequest,
    insertSwapRequest,
    listApprovedRequests,
    listTodayRecords
};
