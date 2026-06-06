const fs = require('fs/promises');
const path = require('path');

const { uploadDir } = require('../config/paths');
const contentRepository = require('../repositories/contentRepository');

function parseImages(row) {
    if (!row) {
        return [];
    }
    if (row.images) {
        try {
            return JSON.parse(row.images);
        } catch (error) {
            return row.image_url ? [row.image_url] : [];
        }
    }
    return row.image_url ? [row.image_url] : [];
}

async function getContent(type) {
    const row = await contentRepository.getLatestContent(type);
    if (!row) {
        return null;
    }
    return {
        text: row.content,
        images: parseImages(row),
        updated_at: row.updated_at
    };
}

async function saveContent(type, body, files) {
    let existingImages = [];
    try {
        existingImages = JSON.parse(body.existingImages || '[]');
    } catch (error) {
        existingImages = [];
    }

    const newImages = (files || []).map((file) => `/uploads/${file.filename}`);
    const allImages = [...existingImages, ...newImages];
    const id = await contentRepository.replaceContent(type, body.text || '', allImages);
    return { id, images: allImages };
}

async function deleteImage(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) {
        const error = new Error('无效的图片路径');
        error.status = 400;
        throw error;
    }

    const filename = path.basename(imageUrl);
    const filePath = path.resolve(uploadDir, filename);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!filePath.startsWith(resolvedUploadDir + path.sep)) {
        const error = new Error('无效的文件路径');
        error.status = 400;
        throw error;
    }

    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

module.exports = {
    deleteImage,
    getContent,
    saveContent
};
