const { AREAS, DAYS, DAY_MAP, SHIFT_HOURS } = require('../constants/schedule');

function parseJsonValue(value) {
    if (!value) {
        return null;
    }
    if (typeof value === 'object') {
        return value;
    }
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
}

function splitPersons(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.map(String).map((item) => item.trim()).filter(Boolean);
    }
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function joinPersons(persons) {
    const unique = [];
    for (const person of persons) {
        const clean = String(person || '').trim();
        if (clean && !unique.includes(clean)) {
            unique.push(clean);
        }
    }
    return unique.join(',');
}

function createDefaultScheduleData() {
    return {
        areas: AREAS.map((area) => ({
            name: area.name,
            shifts: area.shifts.map((shiftName) => ({
                name: shiftName,
                hours: SHIFT_HOURS[shiftName] || 0,
                persons: [],
                days: [null, null, null, null, null, null, null],
                annotations: [null, null, null, null, null, null, null]
            }))
        }))
    };
}

function convertShiftDayFormat(scheduleData = []) {
    const result = createDefaultScheduleData();

    for (const item of scheduleData) {
        if (!item || !item.shift_day) {
            continue;
        }

        const parts = String(item.shift_day).split('-');
        const areaName = parts.length >= 3 ? parts[0] : '期刊';
        const shiftName = parts.length >= 3 ? parts[1] : parts[0];
        const dayName = parts.length >= 3 ? parts.slice(2).join('-') : parts[1];
        const dayIndex = DAY_MAP[dayName];

        if (dayIndex === undefined) {
            continue;
        }

        const area = result.areas.find((entry) => entry.name === areaName);
        const shift = area && area.shifts.find((entry) => entry.name === shiftName);
        if (!shift) {
            continue;
        }

        const persons = splitPersons(item.persons);
        if (persons.length > 0) {
            shift.days[dayIndex] = joinPersons(persons);
            for (const person of persons) {
                if (!shift.persons.includes(person)) {
                    shift.persons.push(person);
                }
            }
        }
        if (item.has_annotation === 1 || item.has_annotation === true) {
            shift.annotations[dayIndex] = true;
        }
    }

    return result;
}

function normalizeAreasData(data) {
    if (!data || !Array.isArray(data.areas)) {
        return createDefaultScheduleData();
    }

    data.areas.forEach((area) => {
        if (!Array.isArray(area.shifts)) {
            area.shifts = [];
        }
        area.shifts.forEach((shift) => {
            if (!Array.isArray(shift.days)) {
                shift.days = [null, null, null, null, null, null, null];
            }
            if (!Array.isArray(shift.annotations)) {
                shift.annotations = [null, null, null, null, null, null, null];
            }
            shift.hours = shift.hours || SHIFT_HOURS[shift.name] || 0;
            shift.persons = shift.persons || [];
        });
    });

    return data;
}

function ensureAreasData(rawData) {
    const data = parseJsonValue(rawData);
    if (!data) {
        return createDefaultScheduleData();
    }
    if (Array.isArray(data.schedule_data)) {
        const converted = convertShiftDayFormat(data.schedule_data);
        converted.week = data.week;
        return normalizeAreasData(converted);
    }
    if (Array.isArray(data.areas)) {
        return normalizeAreasData(data);
    }
    return createDefaultScheduleData();
}

function convertAreasToScheduleData(areasData) {
    const schedule_data = [];
    const hour_stats = {};
    const normalized = normalizeAreasData(areasData || createDefaultScheduleData());

    normalized.areas.forEach((area) => {
        area.shifts.forEach((shift) => {
            shift.days.forEach((cell, dayIndex) => {
                const persons = splitPersons(cell);
                if (persons.length === 0) {
                    return;
                }

                schedule_data.push({
                    shift_day: `${area.name}-${shift.name}-${DAYS[dayIndex].short}`,
                    persons: joinPersons(persons),
                    has_annotation: shift.annotations && shift.annotations[dayIndex] ? 1 : 0
                });

                for (const person of persons) {
                    hour_stats[person] = (hour_stats[person] || 0) + (Number(shift.hours) || 0);
                }
            });
        });
    });

    return {
        schedule_data,
        hour_stats,
        week: normalized.week || '第一周'
    };
}

function parseShiftKey(shiftKey) {
    const parts = String(shiftKey || '').split('-');
    if (parts.length < 3) {
        return null;
    }
    return {
        area: parts[0],
        shift: parts[1],
        day: parts.slice(2).join('-')
    };
}

function getCell(scheduleData, shiftInfo) {
    const dayIndex = DAY_MAP[shiftInfo.day];
    if (dayIndex === undefined) {
        return null;
    }
    const area = scheduleData.areas.find((entry) => entry.name === shiftInfo.area);
    const shift = area && area.shifts.find((entry) => entry.name === shiftInfo.shift);
    if (!shift || !shift.days) {
        return null;
    }
    return { shift, dayIndex };
}

function replacePersonInCell(cellValue, fromPerson, toPerson) {
    const persons = splitPersons(cellValue).map((person) => person === fromPerson ? toPerson : person);
    return joinPersons(persons) || null;
}

function cellHasPerson(cellValue, person) {
    return splitPersons(cellValue).includes(person);
}

function hasScheduleConflict(scheduleData, userName, targetArea, targetShift, targetDay) {
    const dayIndex = DAY_MAP[targetDay];
    if (dayIndex === undefined) {
        return false;
    }

    for (const area of scheduleData.areas) {
        if (area.name === targetArea) {
            continue;
        }
        for (const shift of area.shifts) {
            if (shift.name !== targetShift) {
                continue;
            }
            if (cellHasPerson(shift.days && shift.days[dayIndex], userName)) {
                return true;
            }
        }
    }
    return false;
}

module.exports = {
    cellHasPerson,
    convertAreasToScheduleData,
    convertShiftDayFormat,
    createDefaultScheduleData,
    ensureAreasData,
    getCell,
    hasScheduleConflict,
    joinPersons,
    parseJsonValue,
    parseShiftKey,
    replacePersonInCell,
    splitPersons
};
