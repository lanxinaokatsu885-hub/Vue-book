const express = require('express');

const asyncHandler = require('../utils/asyncHandler');
const scheduleService = require('../services/scheduleService');

const router = express.Router();

function sendError(res, error, successShape = false) {
    const status = error.status || 500;
    if (successShape) {
        return res.status(status).json({ success: false, message: error.message || '服务器错误' });
    }
    return res.status(status).json({ code: status, msg: error.message || '服务器错误', data: null });
}

router.get('/schedule-data', asyncHandler(async (req, res) => {
    const data = await scheduleService.getAreasSchedule(req.query.week);
    res.json({ code: 200, msg: '查询成功', data });
}));

router.get('/schedule', asyncHandler(async (req, res) => {
    const data = await scheduleService.getAreasSchedule(req.query.week);
    res.json({ code: 200, msg: '查询成功', data });
}));

router.post('/schedule', asyncHandler(async (req, res) => {
    await scheduleService.saveSchedule(req.body);
    res.json({ code: 200, msg: '排班数据保存成功', data: null });
}));

router.post('/save-schedule', asyncHandler(async (req, res) => {
    try {
        await scheduleService.saveSchedule(req.body);
        res.json({ code: 200, msg: '排班数据保存成功', data: null });
    } catch (error) {
        sendError(res, error);
    }
}));

router.get('/list-weeks', asyncHandler(async (req, res) => {
    const weeks = await scheduleService.listWeeks();
    res.json({ code: 200, msg: '获取成功', data: weeks });
}));

router.get('/load-schedule', asyncHandler(async (req, res) => {
    const data = await scheduleService.getEditableSchedule(req.query.week);
    res.json({ code: 200, msg: '加载成功', data });
}));

router.post('/delete-schedule', asyncHandler(async (req, res) => {
    if (!req.body.week) {
        return res.status(400).json({ code: 400, msg: '周次不能为空', data: null });
    }
    await scheduleService.deleteSchedule(req.body.week);
    return res.json({ code: 200, msg: '删除成功', data: null });
}));

router.post('/swap-shift', asyncHandler(async (req, res) => {
    try {
        const data = await scheduleService.swapShift(req.body);
        res.json({ success: true, message: '换班申请提交成功', data });
    } catch (error) {
        sendError(res, error, true);
    }
}));

router.post('/substitute', asyncHandler(async (req, res) => {
    try {
        const data = await scheduleService.substituteShift(req.body);
        res.json({ success: true, message: '代班申请提交成功', data });
    } catch (error) {
        sendError(res, error, true);
    }
}));

router.get('/swap-notices', asyncHandler(async (req, res) => {
    const data = await scheduleService.listSwapNotices(req.query.week);
    res.json({ code: 200, msg: '获取成功', data });
}));

router.get('/today-shift-records', asyncHandler(async (req, res) => {
    const data = await scheduleService.listTodayShiftRecords();
    res.json({ code: 200, msg: '获取当天记录成功', data });
}));

router.post('/revoke-shift', asyncHandler(async (req, res) => {
    try {
        await scheduleService.revokeShift(req.body);
        res.json({ success: true, message: '撤销成功' });
    } catch (error) {
        sendError(res, error, true);
    }
}));

module.exports = router;
