const SEMESTER_OPTIONS = ['第一学期', '第二学期'];
const CHINESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export const semesterOptions = SEMESTER_OPTIONS;

export function toChineseNumber(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        return '';
    }
    if (number < 10) {
        return CHINESE_DIGITS[number];
    }
    if (number === 10) {
        return '十';
    }
    if (number < 20) {
        return `十${CHINESE_DIGITS[number % 10]}`;
    }
    if (number < 100) {
        const ones = number % 10;
        return `${CHINESE_DIGITS[Math.floor(number / 10)]}十${ones ? CHINESE_DIGITS[ones] : ''}`;
    }
    return String(number);
}

export function parseChineseNumber(value) {
    const text = String(value || '').trim();
    if (!text) {
        return null;
    }
    if (/^\d+$/.test(text)) {
        return Number(text);
    }
    const directIndex = CHINESE_DIGITS.indexOf(text);
    if (directIndex > 0) {
        return directIndex;
    }
    if (text === '十') {
        return 10;
    }
    if (text.startsWith('十')) {
        const ones = CHINESE_DIGITS.indexOf(text.slice(1));
        return ones > 0 ? 10 + ones : null;
    }
    if (text.includes('十')) {
        const [tensText, onesText] = text.split('十');
        const tens = CHINESE_DIGITS.indexOf(tensText);
        const ones = onesText ? CHINESE_DIGITS.indexOf(onesText) : 0;
        if (tens > 0 && ones >= 0) {
            return tens * 10 + ones;
        }
    }
    return null;
}

export function formatAcademicWeekTitle({ year, semester, weekNumber }) {
    const normalizedYear = Number(year) || new Date().getFullYear();
    const normalizedSemester = SEMESTER_OPTIONS.includes(semester) ? semester : SEMESTER_OPTIONS[0];
    const normalizedWeek = Number(weekNumber) || 1;
    return `${normalizedYear}年${normalizedSemester}第${toChineseNumber(normalizedWeek)}周`;
}

export function parseAcademicWeekTitle(title, now = new Date()) {
    const text = String(title || '').trim();
    const fullMatch = text.match(/^(\d{4})年(第一学期|第二学期)第(.+)周$/);
    if (fullMatch) {
        return {
            year: Number(fullMatch[1]),
            semester: fullMatch[2],
            weekNumber: parseChineseNumber(fullMatch[3]) || 1
        };
    }

    const legacyMatch = text.match(/^第(.+)周$/);
    if (legacyMatch) {
        return {
            year: now.getFullYear(),
            semester: SEMESTER_OPTIONS[0],
            weekNumber: parseChineseNumber(legacyMatch[1]) || 1
        };
    }

    return {
        ...getCurrentAcademicWeekParts(now)
    };
}

export function defaultAcademicWeekTitle(now = new Date()) {
    return formatAcademicWeekTitle(getCurrentAcademicWeekParts(now));
}

export function getCurrentAcademicWeekParts(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const semester = month >= 9 || month <= 1 ? SEMESTER_OPTIONS[1] : SEMESTER_OPTIONS[0];
    const semesterYear = month <= 1 ? year - 1 : year;
    const startDate = semester === SEMESTER_OPTIONS[0]
        ? nthMonday(semesterYear, 2, 2)
        : nthMonday(semesterYear, 8, 1);
    const diffDays = Math.floor((startOfDay(now) - startOfDay(startDate)) / 86400000);
    const weekNumber = Math.min(30, Math.max(1, Math.floor(diffDays / 7) + 1));

    return {
        year: semesterYear,
        semester,
        weekNumber
    };
}

function nthMonday(year, monthIndex, nth) {
    const date = new Date(year, monthIndex, 1);
    const offset = (8 - date.getDay()) % 7;
    date.setDate(1 + offset + (nth - 1) * 7);
    return date;
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
