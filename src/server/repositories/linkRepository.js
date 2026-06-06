const { query, execute } = require('../config/database');
const defaultLinks = require('../constants/links');

let memoryLinks = { ...defaultLinks };

async function getLinks() {
    try {
        const rows = await query('SELECT * FROM links ORDER BY id DESC LIMIT 1');
        if (rows.length === 0) {
            return memoryLinks;
        }
        memoryLinks = {
            ...memoryLinks,
            ...rows[0]
        };
        return rows[0];
    } catch (error) {
        console.error('查询链接数据失败，使用内存存储:', error.message);
        return memoryLinks;
    }
}

async function saveLinks(links) {
    memoryLinks = {
        checkinUrl: links.checkinUrl !== undefined ? links.checkinUrl : memoryLinks.checkinUrl,
        activityCheckinUrl: links.activityCheckinUrl !== undefined ? links.activityCheckinUrl : memoryLinks.activityCheckinUrl,
        activityCheckoutUrl: links.activityCheckoutUrl !== undefined ? links.activityCheckoutUrl : memoryLinks.activityCheckoutUrl,
        bookSearchUrl: links.bookSearchUrl !== undefined ? links.bookSearchUrl : memoryLinks.bookSearchUrl
    };

    try {
        const rows = await query('SELECT * FROM links LIMIT 1');
        if (rows.length === 0) {
            const result = await query('INSERT INTO links SET ?', memoryLinks);
            return { persisted: true, id: result.insertId };
        }
        await query('UPDATE links SET ? WHERE id = ?', [memoryLinks, rows[0].id]);
        return { persisted: true };
    } catch (error) {
        console.error('保存链接数据失败，仅保存到内存:', error.message);
        return { persisted: false };
    }
}

module.exports = {
    getLinks,
    saveLinks
};
