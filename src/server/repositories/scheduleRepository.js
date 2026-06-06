const { query, execute } = require('../config/database');

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

async function listWeeks() {
    const rows = await query(
        "SELECT JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) as week, MAX(id) as latest_id FROM schedule_data WHERE JSON_EXTRACT(data, '$.week') IS NOT NULL GROUP BY week ORDER BY latest_id DESC"
    );
    return rows.map((row) => row.week).filter((week) => week && week !== 'null');
}

async function deleteWeek(week) {
    return execute(
        "DELETE FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ?",
        [week]
    );
}

module.exports = {
    deleteWeek,
    getLatestScheduleRow,
    insertSchedule,
    listWeeks
};
