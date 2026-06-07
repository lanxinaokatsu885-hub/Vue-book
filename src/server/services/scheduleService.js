const fs = require('fs/promises');
const path = require('path');

const { backupDir } = require('../config/paths');
const scheduleRepository = require('../repositories/scheduleRepository');
const requestRepository = require('../repositories/requestRepository');
const {
    cellHasPerson,
    convertAreasToScheduleData,
    convertShiftDayFormat,
    ensureAreasData,
    getCell,
    hasScheduleConflict,
    parseShiftKey,
    replacePersonInCell
} = require('../utils/schedule');

function parseScheduleData(data) {
    if (!data) {
        return {};
    }
    return typeof data === 'string' ? JSON.parse(data) : data;
}

async function getAreasSchedule(week) {
    const row = await scheduleRepository.getLatestScheduleRow(week);
    const data = ensureAreasData(row && row.data);
    if (week) {
        data.week = week;
    }
    return data;
}

async function getEditableSchedule(week) {
    const row = await scheduleRepository.getLatestScheduleRow(week);
    if (!row) {
        return null;
    }
    const data = ensureAreasData(row.data);
    return convertAreasToScheduleData(data);
}

async function saveSchedule({ schedule_data, week }) {
    const weekKey = week || '第一周';
    const latest = await scheduleRepository.getLatestScheduleRow(weekKey);
    if (latest) {
        const backupPath = path.join(backupDir, `${weekKey}.json`);
        const backupData = typeof latest.data === 'string' ? latest.data : JSON.stringify(latest.data);
        await fs.writeFile(backupPath, backupData);
    }

    const saveData = convertShiftDayFormat(schedule_data || []);
    saveData.week = weekKey;
    await scheduleRepository.upsertLatestSchedule(saveData);
}

async function listWeeks() {
    return scheduleRepository.listWeeks();
}

async function deleteSchedule(week) {
    return scheduleRepository.deleteWeek(week);
}

async function restoreSchedule(week) {
    const archive = await scheduleRepository.getLatestArchivedSchedule(week);
    if (!archive) {
        const error = new Error('未找到可恢复的排班归档');
        error.status = 404;
        throw error;
    }

    const data = parseScheduleData(archive.data);
    data.week = week;
    await scheduleRepository.upsertLatestSchedule(data);

    return {
        archiveId: archive.id,
        week,
        archivedAt: archive.archived_at
    };
}

async function listArchivedSchedules(week) {
    return scheduleRepository.listArchivedSchedules(week);
}

async function swapShift({ applicant, swapUser, originalShift, targetShift, reason, week }) {
    if (!applicant || !swapUser || !originalShift) {
        const error = new Error('参数不完整');
        error.status = 400;
        throw error;
    }

    const weekKey = week || '第一周';
    const scheduleData = await getAreasSchedule(weekKey);
    const originalInfo = parseShiftKey(originalShift);
    const targetInfo = targetShift ? parseShiftKey(targetShift) : null;

    if (!originalInfo) {
        const error = new Error('原班次格式不正确');
        error.status = 400;
        throw error;
    }

    const originalCell = getCell(scheduleData, originalInfo);
    if (!originalCell || !cellHasPerson(originalCell.shift.days[originalCell.dayIndex], applicant)) {
        const error = new Error('申请人在原班次中不存在');
        error.status = 400;
        throw error;
    }

    let swapped = false;

    if (targetInfo && targetShift) {
        const targetCell = getCell(scheduleData, targetInfo);
        if (!targetCell || !cellHasPerson(targetCell.shift.days[targetCell.dayIndex], swapUser)) {
            const error = new Error('换班对象在目标班次中不存在');
            error.status = 400;
            throw error;
        }

        if (hasScheduleConflict(scheduleData, applicant, targetInfo.area, targetInfo.shift, targetInfo.day)) {
            const error = new Error(`申请人 ${applicant} 在 ${targetInfo.shift}-${targetInfo.day} 时间段已有其他排班，不能换班！`);
            error.status = 400;
            throw error;
        }

        if (hasScheduleConflict(scheduleData, swapUser, originalInfo.area, originalInfo.shift, originalInfo.day)) {
            const error = new Error(`被替换人 ${swapUser} 在 ${originalInfo.shift}-${originalInfo.day} 时间段已有其他排班，不能换班！`);
            error.status = 400;
            throw error;
        }

        targetCell.shift.days[targetCell.dayIndex] = replacePersonInCell(targetCell.shift.days[targetCell.dayIndex], swapUser, applicant);
        originalCell.shift.days[originalCell.dayIndex] = replacePersonInCell(originalCell.shift.days[originalCell.dayIndex], applicant, swapUser);
        swapped = true;
    } else {
        if (hasScheduleConflict(scheduleData, swapUser, originalInfo.area, originalInfo.shift, originalInfo.day)) {
            const error = new Error(`被替换人 ${swapUser} 在 ${originalInfo.shift}-${originalInfo.day} 时间段已有其他排班，不能换班！`);
            error.status = 400;
            throw error;
        }
        originalCell.shift.days[originalCell.dayIndex] = replacePersonInCell(originalCell.shift.days[originalCell.dayIndex], applicant, swapUser);
        swapped = true;
    }

    scheduleData.week = weekKey;
    await scheduleRepository.upsertLatestSchedule(scheduleData);
    await requestRepository.insertSwapRequest({
        applicant,
        originalShift,
        swapUser,
        targetShift,
        reason,
        week: weekKey,
        status: 'approved'
    });

    return { swapped };
}

async function substituteShift({ applicant, substituteUser, substituteShift: shiftKey, reason, week }) {
    if (!applicant || !substituteUser || !shiftKey) {
        const error = new Error('参数不完整');
        error.status = 400;
        throw error;
    }

    const weekKey = week || '第一周';
    const scheduleData = await getAreasSchedule(weekKey);
    const shiftInfo = parseShiftKey(shiftKey);
    if (!shiftInfo) {
        const error = new Error('代班班次格式不正确');
        error.status = 400;
        throw error;
    }

    const cell = getCell(scheduleData, shiftInfo);
    if (!cell || !cellHasPerson(cell.shift.days[cell.dayIndex], applicant)) {
        const error = new Error('申请人在代班班次中不存在');
        error.status = 400;
        throw error;
    }

    if (hasScheduleConflict(scheduleData, substituteUser, shiftInfo.area, shiftInfo.shift, shiftInfo.day)) {
        const error = new Error(`代班人 ${substituteUser} 在 ${shiftInfo.shift}-${shiftInfo.day} 时间段已有其他排班，不能代班！`);
        error.status = 400;
        throw error;
    }

    cell.shift.days[cell.dayIndex] = replacePersonInCell(cell.shift.days[cell.dayIndex], applicant, substituteUser);
    scheduleData.week = weekKey;

    await scheduleRepository.upsertLatestSchedule(scheduleData);
    await requestRepository.insertSubstituteRequest({
        applicant,
        substituteUser,
        substituteShift: shiftKey,
        reason,
        week: weekKey,
        status: 'approved'
    });

    return { substituted: true };
}

async function listSwapNotices(week) {
    const { swaps, substitutes } = await requestRepository.listApprovedRequests(week);
    const notices = [
        ...swaps.map((record) => ({
            type: 'swap',
            applicant: record.applicant,
            target_user: record.swap_user,
            original_shift: record.original_shift,
            target_shift: record.target_shift,
            reason: record.swap_reason,
            created_at: record.created_at
        })),
        ...substitutes.map((record) => ({
            type: 'substitute',
            applicant: record.applicant,
            target_user: record.substitute_user,
            original_shift: record.substitute_shift,
            reason: record.substitute_reason,
            created_at: record.created_at
        }))
    ];
    return notices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function listTodayShiftRecords() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return requestRepository.listTodayRecords(todayStart, todayEnd);
}

function sameLocalDate(value, expected) {
    const date = value instanceof Date ? value : new Date(value);
    return date.getFullYear() === expected.getFullYear()
        && date.getMonth() === expected.getMonth()
        && date.getDate() === expected.getDate();
}

async function revokeShift({ recordId, type }) {
    if (!recordId || !['swap', 'substitute'].includes(type)) {
        const error = new Error('参数不完整');
        error.status = 400;
        throw error;
    }

    const record = await requestRepository.getRequestById(type, recordId);
    if (!record) {
        const error = new Error('记录不存在');
        error.status = 404;
        throw error;
    }
    if (record.status !== 'approved') {
        const error = new Error('只能撤销已批准的记录');
        error.status = 400;
        throw error;
    }
    if (!sameLocalDate(record.created_at, new Date())) {
        const error = new Error('只能撤销当天的记录');
        error.status = 400;
        throw error;
    }

    const weekKey = record.week || '第一周';
    const scheduleData = await getAreasSchedule(weekKey);
    let restored = false;

    if (type === 'swap') {
        const originalInfo = parseShiftKey(record.original_shift);
        const targetInfo = record.target_shift ? parseShiftKey(record.target_shift) : null;
        const originalCell = originalInfo && getCell(scheduleData, originalInfo);
        if (originalCell && cellHasPerson(originalCell.shift.days[originalCell.dayIndex], record.swap_user)) {
            originalCell.shift.days[originalCell.dayIndex] = replacePersonInCell(originalCell.shift.days[originalCell.dayIndex], record.swap_user, record.applicant);
            restored = true;
        }
        const targetCell = targetInfo && getCell(scheduleData, targetInfo);
        if (targetCell && cellHasPerson(targetCell.shift.days[targetCell.dayIndex], record.applicant)) {
            targetCell.shift.days[targetCell.dayIndex] = replacePersonInCell(targetCell.shift.days[targetCell.dayIndex], record.applicant, record.swap_user);
            restored = true;
        }
    } else {
        const originalInfo = parseShiftKey(record.substitute_shift);
        const originalCell = originalInfo && getCell(scheduleData, originalInfo);
        if (originalCell && cellHasPerson(originalCell.shift.days[originalCell.dayIndex], record.substitute_user)) {
            originalCell.shift.days[originalCell.dayIndex] = replacePersonInCell(originalCell.shift.days[originalCell.dayIndex], record.substitute_user, record.applicant);
            restored = true;
        }
    }

    if (!restored) {
        const error = new Error('恢复排班数据失败');
        error.status = 500;
        throw error;
    }

    await requestRepository.deleteRequestById(type, recordId);
    scheduleData.week = weekKey;
    await scheduleRepository.upsertLatestSchedule(scheduleData);
}

module.exports = {
    deleteSchedule,
    getAreasSchedule,
    getEditableSchedule,
    listArchivedSchedules,
    listSwapNotices,
    listTodayShiftRecords,
    listWeeks,
    revokeShift,
    restoreSchedule,
    saveSchedule,
    substituteShift,
    swapShift
};
