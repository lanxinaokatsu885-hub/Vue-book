const { pool, query, execute } = require('../config/database');

function stringifyData(data) {
    return typeof data === 'string' ? data : JSON.stringify(data);
}

async function getLatestScheduleRow(week) {
    if (week) {
        const rows = await query(
            "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? ORDER BY id DESC LIMIT 1",
            [week]
        );
        return rows[0] || null;
    }
    const rows = await query('SELECT * FROM schedule_data ORDER BY id DESC LIMIT 1');
    return rows[0] || null;
}

async function insertSchedule(data) {
    return execute(
        'INSERT INTO schedule_data (data, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [JSON.stringify(data)]
    );
}

async function updateScheduleById(id, data) {
    return execute(
        'UPDATE schedule_data SET data = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(data), id]
    );
}

async function upsertLatestSchedule(data) {
    const week = data && data.week;
    const latest = await getLatestScheduleRow(week);
    if (latest) {
        return updateScheduleById(latest.id, data);
    }
    return insertSchedule(data);
}

async function listWeeks() {
    const rows = await query(
        "SELECT JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) as week, MAX(id) as latest_id FROM schedule_data WHERE JSON_EXTRACT(data, '$.week') IS NOT NULL GROUP BY week ORDER BY latest_id DESC"
    );
    return rows.map((row) => row.week).filter((week) => week && week !== 'null');
}

async function deleteWeek(week) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? FOR UPDATE",
            [week]
        );

        for (const row of rows) {
            await connection.execute(
                `INSERT INTO schedule_data_archive
                    (original_id, week, data, archived_reason, original_created_at, original_updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    row.id,
                    week,
                    stringifyData(row.data),
                    'delete-schedule',
                    row.created_at,
                    row.updated_at
                ]
            );
        }

        const [result] = await connection.execute(
            "DELETE FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ?",
            [week]
        );

        await connection.commit();
        return {
            archivedCount: rows.length,
            deletedCount: result.affectedRows
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getLatestArchivedSchedule(week) {
    const rows = await query(
        'SELECT * FROM schedule_data_archive WHERE week = ? ORDER BY archived_at DESC, id DESC LIMIT 1',
        [week]
    );
    return rows[0] || null;
}

async function listArchivedSchedules(week) {
    const params = [];
    let sql = `
        SELECT id, original_id, week, archived_reason, original_created_at, original_updated_at, archived_at
        FROM schedule_data_archive
    `;

    if (week) {
        sql += ' WHERE week = ?';
        params.push(week);
    }

    sql += ' ORDER BY archived_at DESC, id DESC LIMIT 100';
    return query(sql, params);
}

module.exports = {
    deleteWeek,
    getLatestArchivedSchedule,
    getLatestScheduleRow,
    insertSchedule,
    listArchivedSchedules,
    listWeeks,
    updateScheduleById,
    upsertLatestSchedule
};
