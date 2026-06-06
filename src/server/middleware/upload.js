const multer = require('multer');
const path = require('path');

const { uploadDir } = require('../config/paths');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        return cb(new Error('只支持图片文件!'));
    }
});

function handleUploadError(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ code: 400, msg: '文件大小超过限制(最大10MB)', data: null });
        }
        return res.status(400).json({ code: 400, msg: `文件上传失败: ${err.message}`, data: null });
    }
    if (err) {
        return res.status(400).json({ code: 400, msg: err.message || '文件上传失败', data: null });
    }
    return next();
}

module.exports = {
    upload,
    handleUploadError
};
