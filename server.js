const { createApp } = require('./src/server/app');
const { closePool, initDatabase } = require('./src/server/config/database');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
    await initDatabase();

    const app = createApp();
    const server = app.listen(PORT, HOST, () => {
        console.log(`服务器运行在 http://${HOST}:${PORT}`);
    });

    const shutdown = async (signal) => {
        console.log(`收到 ${signal} 信号，正在关闭服务...`);
        server.close(async () => {
            await closePool();
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
    console.error('服务器启动失败:', error);
    process.exit(1);
});
