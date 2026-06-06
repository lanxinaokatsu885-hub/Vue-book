const express = require('express');

const asyncHandler = require('../utils/asyncHandler');
const linkRepository = require('../repositories/linkRepository');

const router = express.Router();

router.get('/links', asyncHandler(async (req, res) => {
    const data = await linkRepository.getLinks();
    res.json({ code: 200, msg: '获取成功', data });
}));

router.post('/links', express.json(), asyncHandler(async (req, res) => {
    const result = await linkRepository.saveLinks(req.body || {});
    res.json({
        code: 200,
        msg: result.persisted ? '链接保存成功' : '链接保存成功（仅保存到内存）',
        data: result.id ? { id: result.id } : null
    });
}));

module.exports = router;
