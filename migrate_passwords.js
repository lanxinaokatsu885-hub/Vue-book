const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

function sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

async function migratePasswords() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'paiban_user',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'paiban_system'
    });

    try {
        const [users] = await connection.query('SELECT id, username, password FROM users');
        console.log(`找到 ${users.length} 个用户，开始迁移密码（SHA-256 + bcrypt 双层加密）...`);

        for (const user of users) {
            // 检查密码是否已经是双层加密（bcrypt哈希长度为60字符）
            if (user.password.startsWith('$2') && user.password.length === 60) {
                // 需要判断是否为旧的 bcrypt(明文) 还是新的 bcrypt(SHA-256)
                // 旧的迁移都是 bcrypt(明文)，需要重新迁移为 bcrypt(SHA-256(明文))
                // 由于无法区分，统一重新迁移
            }

            // 尝试用常见明文密码的SHA-256+bcrypt来匹配，确定原始密码
            // 这里我们直接用已知的原始密码重新生成
            const isOldBcrypt = user.password.startsWith('$2');

            if (isOldBcrypt) {
                // 旧的 bcrypt(明文密码)，需要转为 bcrypt(SHA-256(明文密码))
                // 尝试常见密码
                const commonPasswords = ['123456', '654321'];
                let matched = false;

                for (const plainPwd of commonPasswords) {
                    const isMatch = await bcrypt.compare(plainPwd, user.password);
                    if (isMatch) {
                        const newHash = await bcrypt.hash(sha256(plainPwd), 10);
                        await connection.query('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
                        console.log(`  已迁移用户 ${user.username}（原始密码: ${plainPwd}）`);
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    console.log(`  跳过用户 ${user.username}（无法匹配常见密码，请手动处理）`);
                }
            } else {
                // 明文密码，先SHA-256再bcrypt
                const hash = await bcrypt.hash(sha256(user.password), 10);
                await connection.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
                console.log(`  已迁移用户 ${user.username}`);
            }
        }

        console.log('密码迁移完成！');
    } catch (error) {
        console.error('迁移失败:', error.message);
    } finally {
        await connection.end();
    }
}

migratePasswords();
