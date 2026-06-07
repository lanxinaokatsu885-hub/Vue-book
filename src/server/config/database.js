const mysql = require('mysql2/promise');

const DEFAULT_LINKS = require('../constants/links');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'paiban_user',
    password: process.env.DB_PASSWORD || 'abc147258',
    database: process.env.DB_NAME || 'paiban_system',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0
});

async function query(sql, params = []) {
    const [rows] = await pool.query(sql, params);
    return rows;
}

async function execute(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
}

async function initDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('数据库连接成功');

        await connection.query(`CREATE TABLE IF NOT EXISTS schedule_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            data JSON NOT NULL COMMENT 'schedule data json',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'created time',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'updated time',
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='schedule data table'`);

        await connection.query(`CREATE TABLE IF NOT EXISTS schedule_data_archive (
            id INT AUTO_INCREMENT PRIMARY KEY,
            original_id INT NULL,
            week VARCHAR(50) NOT NULL DEFAULT '',
            data JSON NOT NULL COMMENT 'archived schedule data json',
            archived_reason VARCHAR(100) NOT NULL DEFAULT 'delete-schedule',
            original_created_at TIMESTAMP NULL,
            original_updated_at TIMESTAMP NULL,
            archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_week_archived_at (week, archived_at),
            INDEX idx_original_id (original_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='schedule data archive table'`);

        const [swapColumns] = await connection.query("SHOW COLUMNS FROM swap_requests LIKE 'week'");
        if (swapColumns.length === 0) {
            await connection.query("ALTER TABLE swap_requests ADD COLUMN week VARCHAR(50) NOT NULL DEFAULT ''");
            console.log('已自动添加 swap_requests.week 字段');
        }

        const [subColumns] = await connection.query("SHOW COLUMNS FROM substitute_requests LIKE 'week'");
        if (subColumns.length === 0) {
            await connection.query("ALTER TABLE substitute_requests ADD COLUMN week VARCHAR(50) NOT NULL DEFAULT ''");
            console.log('已自动添加 substitute_requests.week 字段');
        }

        await connection.query(`CREATE TABLE IF NOT EXISTS links (
            id INT PRIMARY KEY AUTO_INCREMENT,
            checkinUrl TEXT,
            activityCheckinUrl TEXT,
            activityCheckoutUrl TEXT,
            bookSearchUrl TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);

        const [links] = await connection.query('SELECT * FROM links LIMIT 1');
        if (links.length === 0) {
            await connection.query('INSERT INTO links SET ?', DEFAULT_LINKS);
            console.log('已插入默认链接数据');
        }
    } catch (error) {
        console.error('数据库初始化失败，服务仍会启动:', error.message);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

async function closePool() {
    await pool.end();
}

module.exports = {
    pool,
    query,
    execute,
    initDatabase,
    closePool
};
