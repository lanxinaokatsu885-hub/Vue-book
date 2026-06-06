const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const apiRoutes = require('./routes');
const { bookDir, publicDir, uploadDir } = require('./config/paths');

function sendSpaEntry(req, res, next) {
    const entry = path.join(publicDir, 'index.html');
    if (!fs.existsSync(entry)) {
        return next();
    }
    return res.sendFile(entry);
}

function createApp() {
    const app = express();

    app.use(cors());
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

    app.use('/uploads', express.static(uploadDir));
    app.use('/static/book', express.static(bookDir));
    app.use('/api', apiRoutes);

    app.use(express.static(publicDir));

    app.get([
        '/',
        '/login',
        '/book',
        '/book/',
        '/book/index.html',
        '/book/login.html',
        '/paiban',
        '/paiban/',
        '/paiban/index.html'
    ], sendSpaEntry);

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/static')) {
            return next();
        }
        if (path.extname(req.path)) {
            return next();
        }
        return sendSpaEntry(req, res, next);
    });

    app.use((req, res) => {
        res.status(404).json({ code: 404, msg: '资源不存在', data: null });
    });

    app.use((err, req, res, next) => {
        console.error('请求处理失败:', err);
        if (res.headersSent) {
            return next(err);
        }
        return res.status(500).json({ code: 500, msg: err.message || '服务器错误', data: null });
    });

    return app;
}

module.exports = { createApp };
