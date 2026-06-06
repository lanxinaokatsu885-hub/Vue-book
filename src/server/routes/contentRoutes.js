const express = require('express');

const asyncHandler = require('../utils/asyncHandler');
const contentService = require('../services/contentService');
const { handleUploadError, upload } = require('../middleware/upload');

const router = express.Router();
const CONTENT_TYPES = new Set(['notice', 'activity', 'shelf', 'inspect']);

function routeType(req) {
    const type = req.path.split('/').filter(Boolean)[0];
    return CONTENT_TYPES.has(type) ? type : null;
}

router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ code: 400, msg: '没有上传文件', data: null });
    }
    return res.json({
        code: 200,
        msg: '上传成功',
        data: {
            url: `/uploads/${req.file.filename}`,
            filename: req.file.filename
        }
    });
});

for (const type of CONTENT_TYPES) {
    router.get(`/${type}`, asyncHandler(async (req, res) => {
        const data = await contentService.getContent(type);
        const emptyMsg = {
            notice: '暂无公告',
            activity: '暂无活动',
            shelf: '暂无负责书架信息',
            inspect: '暂无巡查表信息'
        }[type];
        res.json({ code: 200, msg: data ? '查询成功' : emptyMsg, data });
    }));

    router.post(`/${type}`, (req, res, next) => {
        upload.any()(req, res, (err) => {
            if (err) {
                return handleUploadError(err, req, res, next);
            }
            return next();
        });
    }, asyncHandler(async (req, res) => {
        const currentType = routeType(req);
        const data = await contentService.saveContent(currentType, req.body, req.files);
        res.json({ code: 200, msg: '保存成功', data });
    }));
}

router.post('/delete-image', express.json(), asyncHandler(async (req, res) => {
    await contentService.deleteImage(req.body.imageUrl);
    res.json({ code: 200, msg: '文件删除成功', data: null });
}));

module.exports = router;
