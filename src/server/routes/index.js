const express = require('express');

const contentRoutes = require('./contentRoutes');
const linkRoutes = require('./linkRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({ code: 200, msg: '服务正常运行', data: { timestamp: new Date().toISOString() } });
});

router.use(scheduleRoutes);
router.use(contentRoutes);
router.use(userRoutes);
router.use(linkRoutes);

module.exports = router;
