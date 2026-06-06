const DAYS = [
    { full: '星期一', short: '周一' },
    { full: '星期二', short: '周二' },
    { full: '星期三', short: '周三' },
    { full: '星期四', short: '周四' },
    { full: '星期五', short: '周五' },
    { full: '星期六', short: '周六' },
    { full: '星期日', short: '周日' }
];

const DAY_MAP = DAYS.reduce((map, day, index) => {
    map[day.full] = index;
    map[day.short] = index;
    return map;
}, {});

const SHIFT_HOURS = {
    '白一': 3,
    '白二': 2,
    '白三': 3,
    '白四': 2,
    '晚五': 4.5
};

const AREAS = [
    { name: '期刊', shifts: ['白一', '白二', '白三', '白四', '晚五'] },
    { name: '总服务台一', shifts: ['白一', '白二', '白三', '白四', '晚五'] },
    { name: '总服务台二', shifts: ['白一', '白二', '白三', '白四', '晚五'] }
];

module.exports = {
    AREAS,
    DAYS,
    DAY_MAP,
    SHIFT_HOURS
};
