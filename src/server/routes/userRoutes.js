const express = require('express');

const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');

const router = express.Router();

function codeFromStatus(status) {
    return status || 500;
}

router.post('/login', asyncHandler(async (req, res) => {
    try {
        const user = await userService.login(req.body.username, req.body.password);
        res.json({ code: 200, msg: '登录成功', data: user });
    } catch (error) {
        res.json({ code: codeFromStatus(error.status), msg: error.message });
    }
}));

router.post('/verify-admin-password', asyncHandler(async (req, res) => {
    try {
        const valid = await userService.verifyAdminPassword(req.body.password);
        res.json({ code: valid ? 200 : 401, msg: valid ? '密码验证成功' : '密码错误' });
    } catch (error) {
        res.json({ code: codeFromStatus(error.status), msg: error.message });
    }
}));

router.get('/users', asyncHandler(async (req, res) => {
    const users = await userService.listUsers();
    res.json({ code: 200, msg: '获取成功', data: users });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await userService.getUser(req.params.id);
    if (!user) {
        return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
    }
    return res.json({ code: 200, msg: '获取成功', data: user });
}));

router.post('/users', express.json(), asyncHandler(async (req, res) => {
    try {
        const result = await userService.saveUser(null, req.body);
        res.json({ code: 200, msg: '添加成功', data: { id: result.insertId } });
    } catch (error) {
        const msg = error.code === 'ER_DUP_ENTRY' ? '账号已存在' : error.message;
        res.status(error.status || 500).json({ code: error.status || 500, msg, data: null });
    }
}));

router.put('/users/:id', express.json(), asyncHandler(async (req, res) => {
    try {
        const result = await userService.saveUser(req.params.id, req.body);
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
        }
        return res.json({ code: 200, msg: '更新成功', data: null });
    } catch (error) {
        const msg = error.code === 'ER_DUP_ENTRY' ? '账号已存在' : error.message;
        return res.status(error.status || 500).json({ code: error.status || 500, msg, data: null });
    }
}));

router.post('/users/:id/reset-password', asyncHandler(async (req, res) => {
    const result = await userService.resetPassword(req.params.id);
    if (result.affectedRows === 0) {
        return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
    }
    return res.json({ code: 200, msg: '密码重置成功', data: null });
}));

router.put('/users/:id/change-password', asyncHandler(async (req, res) => {
    try {
        await userService.changePassword(req.params.id, req.body.oldPassword, req.body.newPassword);
        return res.json({ code: 200, msg: '密码修改成功', data: null });
    } catch (error) {
        const code = error.status || 500;
        return res.status(code).json({ code, msg: error.message, data: null });
    }
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
    const result = await userService.deleteUser(req.params.id);
    if (result.affectedRows === 0) {
        return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
    }
    return res.json({ code: 200, msg: '删除成功', data: null });
}));

module.exports = router;
