export const DAYS = [
    { full: '星期一', short: '周一' },
    { full: '星期二', short: '周二' },
    { full: '星期三', short: '周三' },
    { full: '星期四', short: '周四' },
    { full: '星期五', short: '周五' },
    { full: '星期六', short: '周六' },
    { full: '星期日', short: '周日' }
];

export const SHIFT_WINDOWS = {
    '白一': [7 * 60 + 30, 10 * 60 + 30],
    '白二': [10 * 60 + 30, 12 * 60 + 30],
    '白三': [12 * 60 + 30, 15 * 60 + 30],
    '白四': [15 * 60 + 30, 17 * 60 + 30],
    '晚五': [17 * 60 + 30, 22 * 60]
};

export function splitPersons(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.map(String).map((item) => item.trim()).filter(Boolean);
    }
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

export function joinPersons(persons) {
    return [...new Set((persons || []).map(String).map((item) => item.trim()).filter(Boolean))].join(',');
}

export function currentShift(now = new Date()) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    return Object.entries(SHIFT_WINDOWS).find(([, range]) => minutes >= range[0] && minutes < range[1])?.[0] || null;
}

export function currentDayIndex(now = new Date()) {
    const nativeDay = now.getDay();
    return nativeDay === 0 ? 6 : nativeDay - 1;
}

export function shiftKey(areaName, shiftName, dayIndex) {
    return `${areaName}-${shiftName}-${DAYS[dayIndex].short}`;
}

export function getWorkerNames(schedule, users = []) {
    const names = new Set(users.map((user) => user.name).filter(Boolean));
    schedule?.areas?.forEach((area) => {
        area.shifts?.forEach((shift) => {
            shift.days?.forEach((cell) => {
                splitPersons(cell).forEach((person) => names.add(person));
            });
        });
    });
    return [...names].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
}

export function findUserShifts(schedule, userName) {
    const shifts = [];
    schedule?.areas?.forEach((area) => {
        area.shifts?.forEach((shift) => {
            shift.days?.forEach((cell, dayIndex) => {
                if (splitPersons(cell).includes(userName)) {
                    shifts.push({
                        label: `${area.name} / ${shift.name} / ${DAYS[dayIndex].short}`,
                        value: shiftKey(area.name, shift.name, dayIndex),
                        area: area.name,
                        shift: shift.name,
                        dayIndex
                    });
                }
            });
        });
    });
    return shifts;
}

export function toScheduleRows(schedule) {
    const rows = [];
    schedule?.areas?.forEach((area) => {
        area.shifts?.forEach((shift) => {
            shift.days?.forEach((cell, dayIndex) => {
                if (!cell) {
                    return;
                }
                rows.push({
                    shift_day: shiftKey(area.name, shift.name, dayIndex),
                    persons: splitPersons(cell).join(','),
                    has_annotation: shift.annotations?.[dayIndex] ? 1 : 0
                });
            });
        });
    });
    return rows;
}

export function calculateHours(schedule) {
    const result = {};
    schedule?.areas?.forEach((area) => {
        area.shifts?.forEach((shift) => {
            shift.days?.forEach((cell) => {
                splitPersons(cell).forEach((person) => {
                    result[person] = (result[person] || 0) + Number(shift.hours || 0);
                });
            });
        });
    });
    return Object.entries(result)
        .map(([name, hours]) => ({ name, hours }))
        .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, 'zh-Hans-CN'));
}

export function cloneSchedule(schedule) {
    return JSON.parse(JSON.stringify(schedule || { areas: [] }));
}
