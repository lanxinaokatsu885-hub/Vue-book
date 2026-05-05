const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 创建上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 创建备份目录
const beifenDir = path.join(__dirname, 'beifen');
if (!fs.existsSync(beifenDir)) {
    fs.mkdirSync(beifenDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 限制10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('只支持图片文件!'));
        }
    }
});

// multer错误处理中间件
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('Multer错误:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ code: 400, msg: '文件大小超过限制(最大10MB)', data: null });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ code: 400, msg: '文件数量超过限制(最多10张)', data: null });
        }
        return res.status(400).json({ code: 400, msg: '文件上传失败: ' + err.message, data: null });
    } else if (err) {
        console.error('上传错误:', err);
        return res.status(400).json({ code: 400, msg: err.message || '文件上传失败', data: null });
    }
    next();
};

// 班次工时配置
const shiftHourMap = {
    '白一': 3,
    '白二': 2,
    '白三': 3,
    '白四': 2,
    '晚五': 4.5
};

// 内存中的链接存储（作为数据库连接失败时的回退）
let memoryLinks = {
    checkinUrl: 'https://jielong.com/s/Mjc3NTcwNCwzMDAyMDE=',
    activityCheckinUrl: 'https://d2.xksyun.com/website/totp_code?qrcode_token_url=https%3A%2F%2Fd2.xksyun.com%2Fg_api4%2Fr%3Fs%3D69dda990156d8441851e2946&secret=Ulk1Y0lxTmVtRDlYV3ZZVTRTYUgyWjVNNk01a0cwVjlKdmk5Q05hdjdLV2NoWmJvN3ExZGxBckR4ZEp4ZFhRSy0tb0Z1ZjQ4NjRnZXI5Q3FlY2tuaThLUT09--e1dd48e42f199a255635528b00f71e22d6c6f6a0',
    activityCheckoutUrl: 'https://d2.xksyun.com/website/totp_code?qrcode_token_url=https%3A%2F%2Fd2.xksyun.com%2Fg_api4%2Fr%3Fs%3D69ddafc9156d8441851e30bc&secret=Y2R0T0xkYmVGSTBTUTRzSzZIYlNBMWo5MVBhUlJsUlhHMTBJUzRYME5OaStXdEhkL1FyQ0V5c1NROTdpRDVHMi0teVlTQitJbHZ2V2phUXpBSWpUY2ppdz09--f3641aba405b5ef9c76d71ea5b5d34d6476ca25f',
    bookSearchUrl: 'https://i.cqwyp.edu.cn/InDigLib/WyjxSso!opacLogin.action'
};

// 检查用户是否在同一时间段已有排班（跨区域冲突检查）
function checkScheduleConflict(scheduleData, userName, targetArea, targetShift, targetDay) {
    // 遍历所有区域
    for (const area of scheduleData.areas) {
        // 跳过目标区域，因为我们要检查的是其他区域的冲突
        if (area.name === targetArea) {
            continue;
        }
        
        // 遍历该区域的所有班次
        for (const shift of area.shifts) {
            // 找到目标班次
            if (shift.name === targetShift) {
                const dayIndex = dayMap[targetDay];
                if (dayIndex !== undefined && shift.days) {
                    const currentPersons = shift.days[dayIndex];
                    if (currentPersons && currentPersons.includes(userName)) {
                        return true; // 发现冲突
                    }
                }
            }
        }
    }
    return false; // 无冲突
}

// 日期映射（支持完整和简写格式）
const dayMap = {
    '星期一': 0,
    '星期二': 1,
    '星期三': 2,
    '星期四': 3,
    '星期五': 4,
    '星期六': 5,
    '星期日': 6,
    '周一': 0,
    '周二': 1,
    '周三': 2,
    '周四': 3,
    '周五': 4,
    '周六': 5,
    '周日': 6
};

// 区域配置
const areaConfig = [
    { name: '期刊', shifts: ['白一', '白二', '白三', '白四', '晚五'] },
    { name: '总服务台一', shifts: ['白一', '白二', '白三', '白四', '晚五'] },
    { name: '总服务台二', shifts: ['白一', '白二', '白三', '白四', '晚五'] }
];

// 转换排班编辑页面的 shift_day 格式为前端需要的 areas 格式
function convertShiftDayFormat(scheduleData) {
    const areas = areaConfig.map(area => ({
        name: area.name,
        shifts: area.shifts.map(shiftName => ({
            name: shiftName,
            hours: shiftHourMap[shiftName] || 0,
            persons: [],
            days: [null, null, null, null, null, null, null],
            annotations: [null, null, null, null, null, null, null]
        }))
    }));

    scheduleData.forEach(item => {
        if (item.shift_day) {
            const parts = item.shift_day.split('-');
            let areaName, shiftName, dayName;
            
            if (parts.length === 3) {
                areaName = parts[0];
                shiftName = parts[1];
                dayName = parts[2];
            } else if (parts.length === 2) {
                shiftName = parts[0];
                dayName = parts[1];
                areaName = '期刊';
            }

            const dayIndex = dayMap[dayName];
            if (dayIndex !== undefined) {
                const area = areas.find(a => a.name === areaName);
                if (area) {
                    const shift = area.shifts.find(s => s.name === shiftName);
                    if (shift) {
                        if (item.persons) {
                            const persons = item.persons.split(',').filter(p => p.trim());
                            shift.days[dayIndex] = persons.join(',');
                            persons.forEach(p => {
                                if (!shift.persons.includes(p)) {
                                    shift.persons.push(p);
                                }
                            });
                        }
                        if (item.has_annotation === 1 || item.has_annotation === true) {
                            shift.annotations[dayIndex] = true;
                        }
                    }
                }
            }
        }
    });

    return { areas };
}

// 转换 areas 格式为 schedule_data 格式（用于排班编辑页）
function convertAreasToScheduleData(areasData) {
    const schedule_data = [];
    const hour_stats = {};

    if (areasData && areasData.areas) {
        areasData.areas.forEach(area => {
            area.shifts.forEach(shift => {
                const shiftName = shift.name;
                const hours = shift.hours || 0;

                shift.days.forEach((persons, dayIndex) => {
                    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                    const dayName = dayNames[dayIndex];
                    const shiftDay = `${area.name}-${shiftName}-${dayName}`;

                    if (persons) {
                        const personList = Array.isArray(persons) ? persons : persons.split(',').map(p => p.trim());
                        const hasAnnotation = shift.annotations && shift.annotations[dayIndex];

                        schedule_data.push({
                            shift_day: shiftDay,
                            persons: personList.join(','),
                            has_annotation: hasAnnotation ? 1 : 0
                        });

                        personList.forEach(person => {
                            if (person) {
                                if (!hour_stats[person]) {
                                    hour_stats[person] = 0;
                                }
                                hour_stats[person] += hours;
                            }
                        });
                    }
                });
            });
        });
    }

    return { schedule_data, hour_stats, week: areasData.week || '第一周' };
}

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// 静态文件服务 - 提供上传的图片访问
app.use('/uploads', express.static(uploadDir));

// 静态文件服务 - 提供HTML、CSS、JS等静态文件
app.use(express.static('book'));
app.use('/paiban', express.static('paiban'));

// 数据库连接配置
const dbConfig = {
    host: 'localhost',
    user: 'paiban_user',
    password: 'abc147258',
    database: 'paiban_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 使用连接池
const db = mysql.createPool(dbConfig);

// 测试连接
db.getConnection((err, connection) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
    
    // 迁移：为 swap_requests / substitute_requests 添加 week 字段（兼容旧表结构）
    connection.query("SHOW COLUMNS FROM swap_requests LIKE 'week'", (err, results) => {
        if (!err && results.length === 0) {
            connection.query("ALTER TABLE swap_requests ADD COLUMN week VARCHAR(50) NOT NULL DEFAULT ''", (alterErr) => {
                if (alterErr) console.error('添加 swap_requests.week 字段失败:', alterErr);
                else console.log('已自动添加 swap_requests.week 字段');
            });
        }
    });
    connection.query("SHOW COLUMNS FROM substitute_requests LIKE 'week'", (err, results) => {
        if (!err && results.length === 0) {
            connection.query("ALTER TABLE substitute_requests ADD COLUMN week VARCHAR(50) NOT NULL DEFAULT ''", (alterErr) => {
                if (alterErr) console.error('添加 substitute_requests.week 字段失败:', alterErr);
                else console.log('已自动添加 substitute_requests.week 字段');
            });
        }
    });
    
    // 初始化链接表
    connection.query(`CREATE TABLE IF NOT EXISTS links (
        id INT PRIMARY KEY AUTO_INCREMENT,
        checkinUrl TEXT,
        activityCheckinUrl TEXT,
        activityCheckoutUrl TEXT,
        bookSearchUrl TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('创建链接表失败:', err);
        } else {
            // 检查是否有默认数据，如果没有则插入
            connection.query('SELECT * FROM links LIMIT 1', (err, results) => {
                if (!err && results.length === 0) {
                    const defaultLinks = {
                        checkinUrl: 'https://jielong.com/s/Mjc3NTcwNCwzMDAyMDE=',
                        activityCheckinUrl: 'https://d2.xksyun.com/website/totp_code?qrcode_token_url=https%3A%2F%2Fd2.xksyun.com%2Fg_api4%2Fr%3Fs%3D69dda990156d8441851e2946&secret=Ulk1Y0lxTmVtRDlYV3ZZVTRTYUgyWjVNNk01a0cwVjlKdmk5Q05hdjdLV2NoWmJvN3ExZGxBckR4ZEp4ZFhRSy0tb0Z1ZjQ4NjRnZXI5Q3FlY2tuaThLUT09--e1dd48e42f199a255635528b00f71e22d6c6f6a0',
                        activityCheckoutUrl: 'https://d2.xksyun.com/website/totp_code?qrcode_token_url=https%3A%2F%2Fd2.xksyun.com%2Fg_api4%2Fr%3Fs%3D69ddafc9156d8441851e30bc&secret=Y2R0T0xkYmVGSTBTUTRzSzZIYlNBMWo5MVBhUlJsUlhHMTBJUzRYME5OaStXdEhkL1FyQ0V5c1NROTdpRDVHMi0teVlTQitJbHZ2V2phUXpBSWpUY2ppdz09--f3641aba405b5ef9c76d71ea5b5d34d6476ca25f',
                        bookSearchUrl: 'https://i.cqwyp.edu.cn/InDigLib/WyjxSso!opacLogin.action'
                    };
                    connection.query('INSERT INTO links SET ?', defaultLinks, (err) => {
                        if (err) console.error('插入默认链接数据失败:', err);
                        else console.log('已插入默认链接数据');
                    });
                }
            });
        }
    });
    
    connection.release();
});

// 处理连接错误
db.on('error', (err) => {
    console.error('数据库连接错误:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('数据库连接已断开，正在重新连接...');
    }
});

// 1. 获取排班数据
app.get('/api/schedule-data', (req, res) => {
    const { week } = req.query;
    
    let sql = 'SELECT * FROM schedule_data ORDER BY id DESC LIMIT 1';
    
    if (week) {
        sql = "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? ORDER BY id DESC LIMIT 1";
    }
    
    db.query(sql, week ? [week] : [], (err, results) => {
        if (err) {
            console.error('查询排班数据失败:', err);
            return res.status(500).json({ code: 500, msg: '查询排班数据失败', data: null });
        }
        
        let scheduleData;
        
        if (results.length === 0) {
            scheduleData = createDefaultScheduleData();
        } else {
            let dbData = results[0].data;
            
            if (typeof dbData === 'string') {
                try {
                    dbData = JSON.parse(dbData);
                } catch (e) {
                    console.error('解析数据库数据失败:', e);
                }
            }
            
            if (dbData && dbData.schedule_data && Array.isArray(dbData.schedule_data)) {
                const firstItem = dbData.schedule_data[0];
                if (firstItem && firstItem.shift_day) {
                    scheduleData = convertShiftDayFormat(dbData.schedule_data);
                } else if (firstItem && firstItem.shifts) {
                    const areas = [];
                    dbData.schedule_data.forEach(item => {
                        if (item.shifts && Array.isArray(item.shifts)) {
                            areas.push({
                                name: item.title || '未命名区域',
                                shifts: item.shifts.map(shift => ({
                                    name: shift.name,
                                    hours: shift.hours,
                                    persons: shift.persons || [],
                                    days: shift.days || [null, null, null, null, null, null, null]
                                }))
                            });
                        }
                    });
                    scheduleData = { areas: areas };
                } else {
                    scheduleData = { areas: [] };
                }
            } else if (dbData && dbData.areas) {
                const weekFromDb = dbData.week;
                scheduleData = dbData;
                if (weekFromDb) {
                    scheduleData.week = weekFromDb;
                }
            } else {
                scheduleData = createDefaultScheduleData();
            }
        }
        
        res.json({ code: 200, msg: '查询成功', data: scheduleData });
    });
});

function createDefaultScheduleData() {
    return {
        areas: [
            {
                name: '期刊',
                shifts: [
                    { name: '白一', hours: 3, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白二', hours: 2, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白三', hours: 3, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白四', hours: 2, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '晚五', hours: 4.5, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] }
                ]
            },
            {
                name: '总服务台一',
                shifts: [
                    { name: '白一', hours: 3, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白二', hours: 2, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白三', hours: 3, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白四', hours: 2, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '晚五', hours: 4.5, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] }
                ]
            },
            {
                name: '总服务台二',
                shifts: [
                    { name: '白一', hours: 3, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白二', hours: 2, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白三', hours: 3, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '白四', hours: 2, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] },
                    { name: '晚五', hours: 4.5, persons: [], days: [null, null, null, null, null, null, null], annotations: [null, null, null, null, null, null, null] }
                ]
            }
        ]
    };
}

// 2. 申请换班（直接生效）
app.post('/api/swap-shift', (req, res) => {
    const { applicant, swapUser, originalShift, targetShift, reason, week } = req.body;
    
    if (!applicant || !swapUser || !originalShift) {
        return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    // 根据周次获取对应排班数据
    const getSql = week
        ? "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? ORDER BY id DESC LIMIT 1"
        : 'SELECT * FROM schedule_data ORDER BY id DESC LIMIT 1';
    const getParams = week ? [week] : [];
    db.query(getSql, getParams, (err, results) => {
        if (err) {
            console.error('获取排班数据失败:', err);
            return res.status(500).json({ success: false, message: '获取排班数据失败' });
        }
        
        let dbData = null;
        if (results.length > 0) {
            dbData = results[0].data;
            if (typeof dbData === 'string') {
                dbData = JSON.parse(dbData);
            }
        }
        
        // 确保使用 areas 格式（前端需要的格式）
        if (!dbData || !dbData.areas || !Array.isArray(dbData.areas)) {
            if (dbData && dbData.schedule_data && Array.isArray(dbData.schedule_data)) {
                // 转换为 areas 格式
                dbData = convertShiftDayFormat(dbData.schedule_data);
            } else {
                // 创建默认数据
                dbData = createDefaultScheduleData();
            }
        }
        
        // 解析班次信息
        const parseShift = (shiftStr) => {
            const parts = shiftStr.split('-');
            if (parts.length >= 3) {
                return { area: parts[0], shift: parts[1], day: parts.slice(2).join('-') };
            }
            return null;
        };
        
        const originalInfo = parseShift(originalShift);
        const targetInfo = targetShift ? parseShift(targetShift) : null;
        
        if (!originalInfo) {
            return res.status(400).json({ success: false, message: '原班次格式不正确' });
        }
        
        let swapped = false;
        
        // 直接处理 areas 格式
        for (const area of dbData.areas) {
            for (const shift of area.shifts) {
                if (area.name === originalInfo.area && shift.name === originalInfo.shift) {
                    const dayIndex = dayMap[originalInfo.day];
                    if (dayIndex !== undefined && shift.days) {
                        const currentPerson = shift.days[dayIndex];
                        if (currentPerson && currentPerson.includes(applicant)) {
                            if (targetInfo && targetShift) {
                                // 查找目标班次
                                for (const targetArea of dbData.areas) {
                                    for (const targetShiftItem of targetArea.shifts) {
                                        if (targetArea.name === targetInfo.area && targetShiftItem.name === targetInfo.shift) {
                                            const targetDayIndex = dayMap[targetInfo.day];
                                            if (targetDayIndex !== undefined && targetShiftItem.days) {
                                                const targetPerson = targetShiftItem.days[targetDayIndex];
                                                if (targetPerson && targetPerson.includes(swapUser)) {
                                                    // 检查冲突：申请人是否在目标班次的时间段已有其他排班
                                                    if (checkScheduleConflict(dbData, applicant, targetInfo.area, targetInfo.shift, targetInfo.day)) {
                                                        return res.status(400).json({ success: false, message: `申请人 ${applicant} 在 ${targetInfo.shift}-${targetInfo.day} 时间段已有其他排班，不能换班！` });
                                                    }
                                                    
                                                    // 检查冲突：被替换人是否在原班次的时间段已有其他排班
                                                    if (checkScheduleConflict(dbData, swapUser, originalInfo.area, originalInfo.shift, originalInfo.day)) {
                                                        return res.status(400).json({ success: false, message: `被替换人 ${swapUser} 在 ${originalInfo.shift}-${originalInfo.day} 时间段已有其他排班，不能换班！` });
                                                    }
                                                    
                                                    // 交换人员
                                                    targetShiftItem.days[targetDayIndex] = targetPerson.replace(swapUser, applicant);
                                                    shift.days[dayIndex] = currentPerson.replace(applicant, swapUser);
                                                    swapped = true;
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // 检查冲突：被替换人是否在原班次的时间段已有其他排班
                                if (checkScheduleConflict(dbData, swapUser, originalInfo.area, originalInfo.shift, originalInfo.day)) {
                                    return res.status(400).json({ success: false, message: `被替换人 ${swapUser} 在 ${originalInfo.shift}-${originalInfo.day} 时间段已有其他排班，不能换班！` });
                                }
                                
                                // 直接替换
                                shift.days[dayIndex] = currentPerson.replace(applicant, swapUser);
                                swapped = true;
                            }
                        }
                    }
                }
            }
        }
        
        // 确保保存时包含周次信息
        dbData.week = week || '第一周';
        const saveSql = 'INSERT INTO schedule_data (data, created_at, updated_at) VALUES (?, NOW(), NOW())';
        const saveData = JSON.stringify(dbData);
        
        db.query(saveSql, [saveData], (saveErr) => {
            if (saveErr) {
                console.error('保存排班数据失败:', saveErr);
                return res.status(500).json({ success: false, message: '保存排班数据失败' });
            }
        });
        
        const recordSql = 'INSERT INTO swap_requests (applicant, original_shift, swap_user, target_shift, swap_reason, week, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())';
        const recordValues = [applicant, originalShift, swapUser, targetShift || '', reason || '', week || '第一周', 'approved'];
        
        db.query(recordSql, recordValues, (recordErr) => {
            if (recordErr) {
                console.error('插入换班记录失败:', recordErr);
            }
        });
        
        res.json({ success: true, message: '换班申请提交成功', data: { swapped: swapped } });
    });
});

// 3. 申请代班（直接生效）
app.post('/api/substitute', (req, res) => {
    const { applicant, substituteUser, substituteShift, reason, week } = req.body;
    
    if (!applicant || !substituteUser) {
        return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    // 根据周次获取对应排班数据
    const getSql = week
        ? "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? ORDER BY id DESC LIMIT 1"
        : 'SELECT * FROM schedule_data ORDER BY id DESC LIMIT 1';
    const getParams = week ? [week] : [];
    db.query(getSql, getParams, (err, results) => {
        if (err) {
            console.error('获取排班数据失败:', err);
            return res.status(500).json({ success: false, message: '获取排班数据失败' });
        }
        
        let dbData = null;
        if (results.length > 0) {
            dbData = results[0].data;
            if (typeof dbData === 'string') {
                dbData = JSON.parse(dbData);
            }
        }
        
        // 确保使用 areas 格式（前端需要的格式）
        if (!dbData || !dbData.areas || !Array.isArray(dbData.areas)) {
            if (dbData && dbData.schedule_data && Array.isArray(dbData.schedule_data)) {
                // 转换为 areas 格式
                dbData = convertShiftDayFormat(dbData.schedule_data);
            } else {
                // 创建默认数据
                dbData = createDefaultScheduleData();
            }
        }
        
        // 解析班次信息
        const parseShift = (shiftStr) => {
            const parts = shiftStr.split('-');
            if (parts.length >= 3) {
                return { area: parts[0], shift: parts[1], day: parts.slice(2).join('-') };
            }
            return null;
        };
        
        const shiftInfo = substituteShift ? parseShift(substituteShift) : null;
        let substituted = false;
        
        // 直接处理 areas 格式
        if (shiftInfo) {
            for (const area of dbData.areas) {
                for (const shift of area.shifts) {
                    if (area.name === shiftInfo.area && shift.name === shiftInfo.shift) {
                        const dayIndex = dayMap[shiftInfo.day];
                        if (dayIndex !== undefined && shift.days) {
                            const currentPerson = shift.days[dayIndex];
                            if (currentPerson && currentPerson.includes(applicant)) {
                                // 检查冲突：代班人是否在目标班次的时间段已有其他排班
                                if (checkScheduleConflict(dbData, substituteUser, shiftInfo.area, shiftInfo.shift, shiftInfo.day)) {
                                    return res.status(400).json({ success: false, message: `代班人 ${substituteUser} 在 ${shiftInfo.shift}-${shiftInfo.day} 时间段已有其他排班，不能代班！` });
                                }
                                
                                shift.days[dayIndex] = currentPerson.replace(applicant, substituteUser);
                                substituted = true;
                            }
                        }
                    }
                }
            }
        }
        
        // 确保保存时包含周次信息
        dbData.week = week || '第一周';
        const saveSql = 'INSERT INTO schedule_data (data, created_at, updated_at) VALUES (?, NOW(), NOW())';
        db.query(saveSql, [JSON.stringify(dbData)], (saveErr) => {
            if (saveErr) {
                console.error('保存排班数据失败:', saveErr);
                return res.status(500).json({ success: false, message: '保存排班数据失败' });
            }
        });
        
        const recordSql = 'INSERT INTO substitute_requests (applicant, substitute_user, substitute_shift, substitute_reason, week, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';
        db.query(recordSql, [applicant, substituteUser, substituteShift || '', reason || '', week || '第一周', 'approved'], (recordErr) => {
            if (recordErr) {
                console.error('插入代班记录失败:', recordErr);
            }
        });
        
        res.json({ success: true, message: '代班申请提交成功', data: { substituted: substituted } });
    });
});

// 4. 保存排班数据
app.post('/api/save-schedule', (req, res) => {
    const { schedule_data, hour_stats, week } = req.body;
    const weekKey = week || '第一周';

    if (!schedule_data) {
        return res.status(400).json({ code: 400, msg: '排班数据不能为空', data: null });
    }

    // 先查询该周最新数据，备份到 beifen 目录
    const checkSql = "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? ORDER BY id DESC LIMIT 1";
    db.query(checkSql, [weekKey], (checkErr, checkResults) => {
        if (!checkErr && checkResults.length > 0) {
            const backupRaw = checkResults[0].data;
            const backupStr = typeof backupRaw === 'string' ? backupRaw : JSON.stringify(backupRaw);
            const backupFile = path.join(beifenDir, `${weekKey}.json`);
            fs.writeFile(backupFile, backupStr, (writeErr) => {
                if (writeErr) {
                    console.error('备份数据失败:', writeErr);
                }
            });
        }

        // 转换为 areas 格式并保存
        const saveData = convertShiftDayFormat(schedule_data);
        saveData.week = weekKey;

        const sql = 'INSERT INTO schedule_data (data, created_at, updated_at) VALUES (?, NOW(), NOW())';
        db.query(sql, [JSON.stringify(saveData)], (err) => {
            if (err) {
                console.error('保存排班数据失败:', err);
                return res.status(500).json({ code: 500, msg: '保存排班数据失败', data: null });
            }
            res.json({ code: 200, msg: '排班数据保存成功', data: null });
        });
    });
});

// 4.5 获取所有已保存的周次列表
app.get('/api/list-weeks', (req, res) => {
    const sql = "SELECT JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) as week, MAX(id) as latest_id FROM schedule_data WHERE JSON_EXTRACT(data, '$.week') IS NOT NULL GROUP BY week ORDER BY latest_id DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('获取周次列表失败:', err);
            return res.status(500).json({ code: 500, msg: '获取周次列表失败', data: null });
        }
        const weeks = results.map(r => r.week).filter(w => w && w !== 'null');
        res.json({ code: 200, msg: '获取成功', data: weeks });
    });
});

// 5. 加载排班数据（用于排班编辑页面，支持 ?week= 参数按周加载）
app.get('/api/load-schedule', (req, res) => {
    const { week } = req.query;
    const sql = week
        ? "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? ORDER BY id DESC LIMIT 1"
        : 'SELECT * FROM schedule_data ORDER BY id DESC LIMIT 1';
    const params = week ? [week] : [];
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('加载排班数据失败:', err);
            return res.status(500).json({ code: 500, msg: '加载排班数据失败', data: null });
        }

        if (results.length === 0) {
            return res.json({ code: 200, msg: '加载成功', data: null });
        }

        let data = results[0].data;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error('解析排班数据失败:', e);
                return res.status(500).json({ code: 500, msg: '解析排班数据失败', data: null });
            }
        }

        // 转换为排班编辑页需要的格式
        let responseData = data;
        if (data && data.areas) {
            responseData = convertAreasToScheduleData(data);
        }

        res.json({ code: 200, msg: '加载成功', data: responseData });
    });
});

// 5.1 删除周次排班数据
app.post('/api/delete-schedule', (req, res) => {
    const { week } = req.body;
    
    if (!week) {
        return res.status(400).json({ code: 400, msg: '周次不能为空', data: null });
    }

    const sql = "DELETE FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ?";
    db.query(sql, [week], (err, result) => {
        if (err) {
            console.error('删除排班数据失败:', err);
            return res.status(500).json({ code: 500, msg: '删除排班数据失败', data: null });
        }

        // 删除对应的备份文件
        const backupFile = path.join(beifenDir, `${week}.json`);
        if (fs.existsSync(backupFile)) {
            fs.unlink(backupFile, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('删除备份文件失败:', unlinkErr);
                }
            });
        }

        res.json({ code: 200, msg: '删除成功', data: null });
    });
});

// 6. 获取换班/代班公告
app.get('/api/swap-notices', (req, res) => {
    const { week } = req.query;
    
    let swapSql = 'SELECT * FROM swap_requests WHERE status = ?';
    let subSql = 'SELECT * FROM substitute_requests WHERE status = ?';
    const params = ['approved'];
    
    if (week) {
        swapSql += ' AND week = ?';
        subSql += ' AND week = ?';
        params.push(week);
    }
    
    swapSql += ' ORDER BY created_at DESC LIMIT 10';
    subSql += ' ORDER BY created_at DESC LIMIT 10';
    
    db.query(swapSql, params, (swapErr, swapResults) => {
        if (swapErr) {
            console.error('获取换班记录失败:', swapErr);
        }
        
        db.query(subSql, params, (subErr, subResults) => {
            if (subErr) {
                console.error('获取代班记录失败:', subErr);
            }
            
            const notices = [];
            
            if (swapResults) {
                swapResults.forEach(record => {
                    notices.push({
                        type: 'swap',
                        applicant: record.applicant,
                        target_user: record.swap_user,
                        original_shift: record.original_shift,
                        target_shift: record.target_shift,
                        reason: record.swap_reason,
                        created_at: record.created_at
                    });
                });
            }
            
            if (subResults) {
                subResults.forEach(record => {
                    notices.push({
                        type: 'substitute',
                        applicant: record.applicant,
                        target_user: record.substitute_user,
                        original_shift: record.substitute_shift,
                        reason: record.substitute_reason,
                        created_at: record.created_at
                    });
                });
            }
            
            notices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            res.json({ code: 200, msg: '获取成功', data: notices });
        });
    });
});

// 获取当天的代换班记录
app.get('/api/today-shift-records', (req, res) => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const swapSql = `SELECT 
        id,
        'swap' as type,
        applicant,
        swap_user as target_user,
        original_shift,
        target_shift,
        swap_reason as reason,
        created_at
    FROM swap_requests 
    WHERE status = 'approved' 
    AND created_at >= ? AND created_at < ?
    ORDER BY created_at DESC`;
    
    const substituteSql = `SELECT 
        id,
        'substitute' as type,
        applicant,
        substitute_user as target_user,
        substitute_shift as original_shift,
        '' as target_shift,
        substitute_reason as reason,
        created_at
    FROM substitute_requests 
    WHERE status = 'approved' 
    AND created_at >= ? AND created_at < ?
    ORDER BY created_at DESC`;
    
    db.query(swapSql, [todayStart, todayEnd], (swapErr, swapResults) => {
        if (swapErr) {
            console.error('获取换班记录失败:', swapErr);
            return res.status(500).json({ code: 500, msg: '获取换班记录失败', data: null });
        }
        
        db.query(substituteSql, [todayStart, todayEnd], (subErr, subResults) => {
            if (subErr) {
                console.error('获取代班记录失败:', subErr);
                return res.status(500).json({ code: 500, msg: '获取代班记录失败', data: null });
            }
            
            const allRecords = [...(swapResults || []), ...(subResults || [])];
            allRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            res.json({ 
                code: 200, 
                msg: '获取当天记录成功', 
                data: allRecords 
            });
        });
    });
});

// 8. 撤销代换班
app.post('/api/revoke-shift', (req, res) => {
    const { recordId, type } = req.body;
    
    if (!recordId || !type) {
        return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    if (!['swap', 'substitute'].includes(type)) {
        return res.status(400).json({ success: false, message: '类型参数错误' });
    }
    
    const tableName = type === 'swap' ? 'swap_requests' : 'substitute_requests';
    
    const getRecordSql = `SELECT * FROM ${tableName} WHERE id = ?`;
    db.query(getRecordSql, [recordId], (err, results) => {
        if (err) {
            console.error('查询记录失败:', err);
            return res.status(500).json({ success: false, message: '查询记录失败' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: '记录不存在' });
        }
        
        const record = results[0];
        
        // 处理字段名映射
        if (type === 'swap') {
            record.target_user = record.swap_user;
            record.original_shift = record.original_shift;
            record.target_shift = record.target_shift;
        } else if (type === 'substitute') {
            record.target_user = record.substitute_user;
            record.original_shift = record.substitute_shift;
            record.target_shift = '';
        }
        
        if (record.status !== 'approved') {
            return res.status(400).json({ success: false, message: '只能撤销已批准的记录' });
        }
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        let recordDateStr;
        if (typeof record.created_at === 'string') {
            recordDateStr = record.created_at.split(' ')[0];
        } else if (record.created_at instanceof Date) {
            recordDateStr = record.created_at.toISOString().split('T')[0];
        } else {
            recordDateStr = todayStr;
        }
        
        const isToday = recordDateStr === todayStr;
        
        if (!isToday) {
            return res.status(400).json({ success: false, message: '只能撤销当天的记录' });
        }
        
        const deleteSql = `DELETE FROM ${tableName} WHERE id = ?`;
        db.query(deleteSql, [recordId], (deleteErr) => {
            if (deleteErr) {
                console.error('删除记录失败:', deleteErr);
                return res.status(500).json({ success: false, message: '删除记录失败' });
            }
            
            // 根据记录中的周次获取对应排班数据
            const getScheduleSql = record.week
                ? "SELECT * FROM schedule_data WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.week')) = ? ORDER BY id DESC LIMIT 1"
                : 'SELECT * FROM schedule_data ORDER BY id DESC LIMIT 1';
            const getScheduleParams = record.week ? [record.week] : [];
            db.query(getScheduleSql, getScheduleParams, (scheduleErr, scheduleResults) => {
                if (scheduleErr) {
                    console.error('获取排班数据失败:', scheduleErr);
                    return res.status(500).json({ success: false, message: '获取排班数据失败' });
                }
                
                let dbData = null;
                if (scheduleResults.length > 0) {
                    dbData = scheduleResults[0].data;
                    if (typeof dbData === 'string') {
                        dbData = JSON.parse(dbData);
                    }
                }
                
                if (!dbData) {
                    return res.status(500).json({ success: false, message: '排班数据不存在' });
                }
                
                // 确保使用 areas 格式（前端需要的格式）
                if (!dbData.areas || !Array.isArray(dbData.areas)) {
                    if (dbData && dbData.schedule_data && Array.isArray(dbData.schedule_data)) {
                        // 转换为 areas 格式
                        dbData = convertShiftDayFormat(dbData.schedule_data);
                    } else {
                        // 创建默认数据
                        dbData = createDefaultScheduleData();
                    }
                }
                
                let restored = false;
                
                // 解析班次信息
                const parseShift = (shiftStr) => {
                    const parts = shiftStr.split('-');
                    if (parts.length >= 3) {
                        return { area: parts[0], shift: parts[1], day: parts.slice(2).join('-') };
                    }
                    return null;
                };
                
                if (type === 'swap') {
                    // 还原换班：互换回原人员
                    const originalInfo = parseShift(record.original_shift);
                    const targetInfo = record.target_shift ? parseShift(record.target_shift) : null;
                    
                    if (originalInfo) {
                        // 还原原班次
                        dbData.areas.forEach(area => {
                            area.shifts.forEach(shift => {
                                if (area.name === originalInfo.area && shift.name === originalInfo.shift) {
                                    const dayIndex = dayMap[originalInfo.day];
                                    if (dayIndex !== undefined && shift.days) {
                                        const currentPerson = shift.days[dayIndex];
                                        if (currentPerson && currentPerson.includes(record.target_user)) {
                                            shift.days[dayIndex] = currentPerson.replace(record.target_user, record.applicant);
                                            restored = true;
                                        }
                                    }
                                }
                            });
                        });
                        
                        // 还原目标班次
                        if (targetInfo && record.target_shift) {
                            dbData.areas.forEach(area => {
                                area.shifts.forEach(shift => {
                                    if (area.name === targetInfo.area && shift.name === targetInfo.shift) {
                                        const dayIndex = dayMap[targetInfo.day];
                                        if (dayIndex !== undefined && shift.days) {
                                            const currentPerson = shift.days[dayIndex];
                                            if (currentPerson && currentPerson.includes(record.applicant)) {
                                                shift.days[dayIndex] = currentPerson.replace(record.applicant, record.target_user);
                                                restored = true;
                                            }
                                        }
                                    }
                                });
                            });
                        }
                    }
                } else {
                    // 还原代班：直接换回申请人
                    const originalInfo = parseShift(record.original_shift);
                    
                    if (originalInfo) {
                        dbData.areas.forEach(area => {
                            area.shifts.forEach(shift => {
                                if (area.name === originalInfo.area && shift.name === originalInfo.shift) {
                                    const dayIndex = dayMap[originalInfo.day];
                                    if (dayIndex !== undefined && shift.days) {
                                        const currentPerson = shift.days[dayIndex];
                                        if (currentPerson && currentPerson.includes(record.target_user)) {
                                            shift.days[dayIndex] = currentPerson.replace(record.target_user, record.applicant);
                                            restored = true;
                                        }
                                    }
                                }
                            });
                        });
                    }
                }
                
                if (!restored) {
                    console.log('恢复排班数据失败:', { type, original_shift: record.original_shift, target_shift: record.target_shift });
                    return res.status(500).json({ success: false, message: '恢复排班数据失败' });
                }
                
                // 确保保存时包含周次信息（从记录中获取）
                const recordWeek = record.week || '第一周';
                dbData.week = recordWeek;
                
                const saveScheduleSql = 'INSERT INTO schedule_data (data, created_at, updated_at) VALUES (?, NOW(), NOW())';
                db.query(saveScheduleSql, [JSON.stringify(dbData)], (saveScheduleErr) => {
                    if (saveScheduleErr) {
                        console.error('保存排班数据失败:', saveScheduleErr);
                        return res.status(500).json({ success: false, message: '保存排班数据失败' });
                    }
                    
                    res.json({ success: true, message: '撤销成功' });
                });
            });
        });
    });
});

// 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ code: 400, msg: '账号和密码不能为空' });
    }
    
    const query = 'SELECT id, name, username, role FROM users WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            console.error('登录查询错误:', err);
            return res.json({ code: 500, msg: '服务器错误' });
        }
        
        if (results.length === 0) {
            return res.json({ code: 401, msg: '账号或密码错误' });
        }
        
        const user = results[0];
        res.json({
            code: 200,
            msg: '登录成功',
            data: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role
            }
        });
    });
});

// 验证管理员密码接口（用于排班编辑权限验证）
app.post('/api/verify-admin-password', (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.json({ code: 400, msg: '密码不能为空' });
    }
    
    // 查询管理员密码
    const query = 'SELECT password FROM users WHERE role = ? LIMIT 1';
    db.query(query, ['admin'], (err, results) => {
        if (err) {
            console.error('查询管理员密码错误:', err);
            return res.json({ code: 500, msg: '服务器错误' });
        }
        
        if (results.length === 0) {
            return res.json({ code: 404, msg: '未找到管理员账户' });
        }
        
        const adminPassword = results[0].password;
        
        if (password === adminPassword) {
            res.json({ code: 200, msg: '密码验证成功' });
        } else {
            res.json({ code: 401, msg: '密码错误' });
        }
    });
});

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({ code: 200, msg: '服务正常运行', data: { timestamp: new Date().toISOString() } });
});

// ==================== 公告和活动管理接口 ====================

// 图片上传接口
app.post('/api/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ code: 400, msg: '没有上传文件' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ 
        code: 200, 
        msg: '上传成功', 
        data: { 
            url: imageUrl,
            filename: req.file.filename 
        } 
    });
});

// 获取公告
app.get('/api/notice', (req, res) => {
    const sql = 'SELECT * FROM notices WHERE type = "notice" ORDER BY id DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('查询公告失败:', err);
            return res.status(500).json({ code: 500, msg: '查询公告失败', data: null });
        }
        
        if (results.length === 0) {
            return res.json({ code: 200, msg: '暂无公告', data: null });
        }
        
        const data = results[0];
        // 解析images字段（JSON字符串）
        let images = [];
        if (data.images) {
            try {
                images = JSON.parse(data.images);
            } catch (e) {
                // 如果是旧的单图格式
                if (data.image_url) {
                    images = [data.image_url];
                }
            }
        } else if (data.image_url) {
            images = [data.image_url];
        }
        
        res.json({
            code: 200,
            msg: '查询成功',
            data: {
                text: data.content,
                images: images,
                updated_at: data.updated_at
            }
        });
    });
});

// 保存公告（支持多图上传）
app.post('/api/notice', (req, res, next) => {
    // 使用 any() 允许任意字段名的文件上传
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer处理错误:', err);
            return res.status(400).json({ code: 400, msg: '文件上传失败: ' + err.message, data: null });
        }
        
        console.log('收到公告保存请求');
        console.log('请求体字段:', Object.keys(req.body));
        console.log('上传文件数量:', req.files ? req.files.length : 0);
        
        const text = req.body.text || '';
        let existingImages = [];
        
        try {
            existingImages = JSON.parse(req.body.existingImages || '[]');
        } catch (e) {
            existingImages = [];
        }
        
        // 合并已有图片和新上传的图片
        const newImageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const allImages = [...existingImages, ...newImageUrls];
        
        console.log('已有图片:', existingImages);
        console.log('新上传图片:', newImageUrls);
        console.log('合并后图片:', allImages);
        
        // 先检查表结构
        db.query('DESCRIBE notices', (descErr, descResult) => {
            if (descErr) {
                console.error('查看表结构失败:', descErr);
            } else {
                console.log('notices表结构:', descResult.map(col => col.Field));
            }
        });
        
        // 先删除旧公告
        const deleteSql = 'DELETE FROM notices WHERE type = "notice"';
        db.query(deleteSql, (err) => {
            if (err) {
                console.error('删除旧公告失败:', err);
                return res.status(500).json({ code: 500, msg: '保存公告失败', data: null });
            }
            
            // 插入新公告
            const insertSql = 'INSERT INTO notices (type, content, images, image_url, updated_at) VALUES (?, ?, ?, ?, NOW())';
            const imagesJson = JSON.stringify(allImages);
            const firstImage = allImages.length > 0 ? allImages[0] : null;
            console.log('执行SQL:', insertSql);
            console.log('SQL参数:', ['notice', text, imagesJson, firstImage]);
            db.query(insertSql, ['notice', text, imagesJson, firstImage], (err, result) => {
                if (err) {
                    console.error('保存公告失败:', err);
                    return res.status(500).json({ code: 500, msg: '保存公告失败', data: null });
                }
                
                console.log('公告保存成功, ID:', result.insertId);
                res.json({ code: 200, msg: '保存成功', data: { id: result.insertId, images: allImages } });
            });
        });
    });
});

// 公告上传错误处理
app.use('/api/notice', handleUploadError);

// 获取活动
app.get('/api/activity', (req, res) => {
    const sql = 'SELECT * FROM notices WHERE type = "activity" ORDER BY id DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('查询活动失败:', err);
            return res.status(500).json({ code: 500, msg: '查询活动失败', data: null });
        }
        
        if (results.length === 0) {
            return res.json({ code: 200, msg: '暂无活动', data: null });
        }
        
        const data = results[0];
        // 解析images字段（JSON字符串）
        let images = [];
        if (data.images) {
            try {
                images = JSON.parse(data.images);
            } catch (e) {
                // 如果是旧的单图格式
                if (data.image_url) {
                    images = [data.image_url];
                }
            }
        } else if (data.image_url) {
            images = [data.image_url];
        }
        
        res.json({
            code: 200,
            msg: '查询成功',
            data: {
                text: data.content,
                images: images,
                updated_at: data.updated_at
            }
        });
    });
});

// 保存活动（支持多图上传）
app.post('/api/activity', (req, res, next) => {
    // 使用 any() 允许任意字段名的文件上传
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer处理错误:', err);
            return res.status(400).json({ code: 400, msg: '文件上传失败: ' + err.message, data: null });
        }
        
        const text = req.body.text || '';
        let existingImages = [];
        
        try {
            existingImages = JSON.parse(req.body.existingImages || '[]');
        } catch (e) {
            existingImages = [];
        }
        
        // 合并已有图片和新上传的图片
        const newImageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const allImages = [...existingImages, ...newImageUrls];
        
        console.log('活动保存 - 已有图片:', existingImages);
        console.log('活动保存 - 新上传图片:', newImageUrls);
        
        // 先删除旧活动
        const deleteSql = 'DELETE FROM notices WHERE type = "activity"';
        db.query(deleteSql, (err) => {
            if (err) {
                console.error('删除旧活动失败:', err);
                return res.status(500).json({ code: 500, msg: '保存活动失败', data: null });
            }
            
            // 插入新活动
            const insertSql = 'INSERT INTO notices (type, content, images, image_url, updated_at) VALUES (?, ?, ?, ?, NOW())';
            const imagesJson = JSON.stringify(allImages);
            const firstImage = allImages.length > 0 ? allImages[0] : null;
            db.query(insertSql, ['activity', text, imagesJson, firstImage], (err, result) => {
                if (err) {
                    console.error('保存活动失败:', err);
                    return res.status(500).json({ code: 500, msg: '保存活动失败', data: null });
                }
                
                console.log('活动保存成功, ID:', result.insertId);
                res.json({ code: 200, msg: '保存成功', data: { id: result.insertId, images: allImages } });
            });
        });
    });
});

// 活动上传错误处理
app.use('/api/activity', handleUploadError);

// ==================== 负责书架和巡查表管理接口 ====================

// 获取负责书架
app.get('/api/shelf', (req, res) => {
    const sql = 'SELECT * FROM notices WHERE type = "shelf" ORDER BY id DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('查询负责书架失败:', err);
            return res.status(500).json({ code: 500, msg: '查询负责书架失败', data: null });
        }
        
        if (results.length === 0) {
            return res.json({ code: 200, msg: '暂无负责书架信息', data: null });
        }
        
        const data = results[0];
        // 解析images字段（JSON字符串）
        let images = [];
        if (data.images) {
            try {
                images = JSON.parse(data.images);
            } catch (e) {
                // 如果是旧的单图格式
                if (data.image_url) {
                    images = [data.image_url];
                }
            }
        } else if (data.image_url) {
            images = [data.image_url];
        }
        
        res.json({
            code: 200,
            msg: '查询成功',
            data: {
                text: data.content,
                images: images,
                updated_at: data.updated_at
            }
        });
    });
});

// 保存负责书架（支持多图上传）
app.post('/api/shelf', (req, res, next) => {
    // 使用 any() 允许任意字段名的文件上传
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer处理错误:', err);
            return res.status(400).json({ code: 400, msg: '文件上传失败: ' + err.message, data: null });
        }
        
        console.log('收到负责书架保存请求');
        console.log('请求体字段:', Object.keys(req.body));
        console.log('上传文件数量:', req.files ? req.files.length : 0);
        
        const text = req.body.text || '';
        let existingImages = [];
        
        try {
            existingImages = JSON.parse(req.body.existingImages || '[]');
        } catch (e) {
            existingImages = [];
        }
        
        // 合并已有图片和新上传的图片
        const newImageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const allImages = [...existingImages, ...newImageUrls];
        
        console.log('负责书架保存 - 已有图片:', existingImages);
        console.log('负责书架保存 - 新上传图片:', newImageUrls);
        
        // 先删除旧负责书架
        const deleteSql = 'DELETE FROM notices WHERE type = "shelf"';
        db.query(deleteSql, (err) => {
            if (err) {
                console.error('删除旧负责书架失败:', err);
                return res.status(500).json({ code: 500, msg: '保存负责书架失败', data: null });
            }
            
            // 插入新负责书架
            const insertSql = 'INSERT INTO notices (type, content, images, image_url, updated_at) VALUES (?, ?, ?, ?, NOW())';
            const imagesJson = JSON.stringify(allImages);
            const firstImage = allImages.length > 0 ? allImages[0] : null;
            db.query(insertSql, ['shelf', text, imagesJson, firstImage], (err, result) => {
                if (err) {
                    console.error('保存负责书架失败:', err);
                    return res.status(500).json({ code: 500, msg: '保存负责书架失败', data: null });
                }
                
                console.log('负责书架保存成功, ID:', result.insertId);
                res.json({ code: 200, msg: '保存成功', data: { id: result.insertId, images: allImages } });
            });
        });
    });
});

// 负责书架上传错误处理
app.use('/api/shelf', handleUploadError);

// 获取巡查表
app.get('/api/inspect', (req, res) => {
    const sql = 'SELECT * FROM notices WHERE type = "inspect" ORDER BY id DESC LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('查询巡查表失败:', err);
            return res.status(500).json({ code: 500, msg: '查询巡查表失败', data: null });
        }
        
        if (results.length === 0) {
            return res.json({ code: 200, msg: '暂无巡查表信息', data: null });
        }
        
        const data = results[0];
        // 解析images字段（JSON字符串）
        let images = [];
        if (data.images) {
            try {
                images = JSON.parse(data.images);
            } catch (e) {
                // 如果是旧的单图格式
                if (data.image_url) {
                    images = [data.image_url];
                }
            }
        } else if (data.image_url) {
            images = [data.image_url];
        }
        
        res.json({
            code: 200,
            msg: '查询成功',
            data: {
                text: data.content,
                images: images,
                updated_at: data.updated_at
            }
        });
    });
});

// 保存巡查表（支持多图上传）
app.post('/api/inspect', (req, res, next) => {
    // 使用 any() 允许任意字段名的文件上传
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer处理错误:', err);
            return res.status(400).json({ code: 400, msg: '文件上传失败: ' + err.message, data: null });
        }
        
        console.log('收到巡查表保存请求');
        console.log('请求体字段:', Object.keys(req.body));
        console.log('上传文件数量:', req.files ? req.files.length : 0);
        
        const text = req.body.text || '';
        let existingImages = [];
        
        try {
            existingImages = JSON.parse(req.body.existingImages || '[]');
        } catch (e) {
            existingImages = [];
        }
        
        // 合并已有图片和新上传的图片
        const newImageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
        const allImages = [...existingImages, ...newImageUrls];
        
        console.log('巡查表保存 - 已有图片:', existingImages);
        console.log('巡查表保存 - 新上传图片:', newImageUrls);
        
        // 先删除旧巡查表
        const deleteSql = 'DELETE FROM notices WHERE type = "inspect"';
        db.query(deleteSql, (err) => {
            if (err) {
                console.error('删除旧巡查表失败:', err);
                return res.status(500).json({ code: 500, msg: '保存巡查表失败', data: null });
            }
            
            // 插入新巡查表
            const insertSql = 'INSERT INTO notices (type, content, images, image_url, updated_at) VALUES (?, ?, ?, ?, NOW())';
            const imagesJson = JSON.stringify(allImages);
            const firstImage = allImages.length > 0 ? allImages[0] : null;
            db.query(insertSql, ['inspect', text, imagesJson, firstImage], (err, result) => {
                if (err) {
                    console.error('保存巡查表失败:', err);
                    return res.status(500).json({ code: 500, msg: '保存巡查表失败', data: null });
                }
                
                console.log('巡查表保存成功, ID:', result.insertId);
                res.json({ code: 200, msg: '保存成功', data: { id: result.insertId, images: allImages } });
            });
        });
    });
});

// 巡查表上传错误处理
app.use('/api/inspect', handleUploadError);

// 删除图片文件API
app.post('/api/delete-image', express.json(), (req, res) => {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
        return res.status(400).json({ code: 400, msg: '缺少图片URL', data: null });
    }
    
    // 安全检查：确保路径在uploads目录内
    if (!imageUrl.startsWith('/uploads/')) {
        return res.status(400).json({ code: 400, msg: '无效的图片路径', data: null });
    }
    
    // 构建完整路径
    const filename = path.basename(imageUrl);
    const filePath = path.join(uploadDir, filename);
    
    // 安全检查：确保解析后的路径仍在uploads目录内
    if (!filePath.startsWith(uploadDir)) {
        return res.status(400).json({ code: 400, msg: '无效的文件路径', data: null });
    }
    
    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.log('文件不存在:', filePath);
            return res.json({ code: 200, msg: '文件不存在或已删除', data: null });
        }
        
        // 删除文件
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('删除文件失败:', err);
                return res.status(500).json({ code: 500, msg: '删除文件失败', data: null });
            }
            
            console.log('文件删除成功:', filePath);
            res.json({ code: 200, msg: '文件删除成功', data: null });
        });
    });
});

// 用户管理API
// 获取所有用户
app.get('/api/users', (req, res) => {
    const sql = 'SELECT id, name, username, role, created_at FROM users ORDER BY role DESC, id';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('查询用户列表失败:', err);
            return res.status(500).json({ code: 500, msg: '查询用户列表失败', data: null });
        }
        res.json({ code: 200, msg: '获取成功', data: results });
    });
});

// 获取单个用户
app.get('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT id, name, username, role, created_at FROM users WHERE id = ?';
    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('查询用户失败:', err);
            return res.status(500).json({ code: 500, msg: '查询用户失败', data: null });
        }
        if (results.length === 0) {
            return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
        }
        res.json({ code: 200, msg: '获取成功', data: results[0] });
    });
});

// 添加用户
app.post('/api/users', express.json(), (req, res) => {
    const { name, username, password, role } = req.body;
    
    if (!name || !username || !password) {
        return res.status(400).json({ code: 400, msg: '姓名、账号和密码不能为空', data: null });
    }
    
    const sql = 'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, username, password, role || 'employee'], (err, result) => {
        if (err) {
            console.error('添加用户失败:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ code: 400, msg: '账号已存在', data: null });
            }
            return res.status(500).json({ code: 500, msg: '添加用户失败', data: null });
        }
        res.json({ code: 200, msg: '添加成功', data: { id: result.insertId } });
    });
});

// 更新用户
app.put('/api/users/:id', express.json(), (req, res) => {
    const { id } = req.params;
    const { name, username, role } = req.body;
    
    if (!name || !username) {
        return res.status(400).json({ code: 400, msg: '姓名和账号不能为空', data: null });
    }
    
    const sql = 'UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?';
    db.query(sql, [name, username, role, id], (err, result) => {
        if (err) {
            console.error('更新用户失败:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ code: 400, msg: '账号已存在', data: null });
            }
            return res.status(500).json({ code: 500, msg: '更新用户失败', data: null });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
        }
        res.json({ code: 200, msg: '更新成功', data: null });
    });
});

// 重置用户密码
app.post('/api/users/:id/reset-password', (req, res) => {
    const { id } = req.params;
    const defaultPassword = '123456';
    
    const sql = 'UPDATE users SET password = ? WHERE id = ?';
    db.query(sql, [defaultPassword, id], (err, result) => {
        if (err) {
            console.error('重置密码失败:', err);
            return res.status(500).json({ code: 500, msg: '重置密码失败', data: null });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
        }
        res.json({ code: 200, msg: '密码重置成功', data: null });
    });
});

// 删除用户
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM users WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('删除用户失败:', err);
            return res.status(500).json({ code: 500, msg: '删除用户失败', data: null });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ code: 404, msg: '用户不存在', data: null });
        }
        res.json({ code: 200, msg: '删除成功', data: null });
    });
});

// 链接管理API
// 获取链接数据
app.get('/api/links', (req, res) => {
    db.query('SELECT * FROM links ORDER BY id DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('查询链接数据失败，使用内存存储:', err);
            // 数据库连接失败，使用内存中的链接数据
            return res.json({ code: 200, msg: '获取成功（使用内存存储）', data: memoryLinks });
        }
        if (results.length === 0) {
            return res.json({ code: 200, msg: '获取成功', data: memoryLinks });
        }
        res.json({ code: 200, msg: '获取成功', data: results[0] });
    });
});

// 保存链接数据
app.post('/api/links', express.json(), (req, res) => {
    const links = req.body;
    
    // 先更新内存中的链接数据（确保即使数据库失败也能正常工作）
    memoryLinks = {
        checkinUrl: links.checkinUrl !== undefined ? links.checkinUrl : memoryLinks.checkinUrl,
        activityCheckinUrl: links.activityCheckinUrl !== undefined ? links.activityCheckinUrl : memoryLinks.activityCheckinUrl,
        activityCheckoutUrl: links.activityCheckoutUrl !== undefined ? links.activityCheckoutUrl : memoryLinks.activityCheckoutUrl,
        bookSearchUrl: links.bookSearchUrl !== undefined ? links.bookSearchUrl : memoryLinks.bookSearchUrl
    };
    
    // 尝试保存到数据库
    db.query('SELECT * FROM links LIMIT 1', (err, results) => {
        if (err) {
            console.error('查询链接数据失败，仅保存到内存:', err);
            // 数据库连接失败，只保存到内存
            return res.json({ code: 200, msg: '链接保存成功（仅保存到内存）', data: null });
        }
        
        if (results.length === 0) {
            // 插入新数据
            db.query('INSERT INTO links SET ?', links, (err, result) => {
                if (err) {
                    console.error('插入链接数据失败，仅保存到内存:', err);
                    return res.json({ code: 200, msg: '链接保存成功（仅保存到内存）', data: null });
                }
                res.json({ code: 200, msg: '链接保存成功', data: { id: result.insertId } });
            });
        } else {
            // 更新现有数据
            db.query('UPDATE links SET ? WHERE id = ?', [links, results[0].id], (err) => {
                if (err) {
                    console.error('更新链接数据失败，仅保存到内存:', err);
                    return res.json({ code: 200, msg: '链接保存成功（仅保存到内存）', data: null });
                }
                res.json({ code: 200, msg: '链接保存成功', data: null });
            });
        }
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在关闭服务器...');
    db.end(() => {
        console.log('数据库连接已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在关闭服务器...');
    db.end(() => {
        console.log('数据库连接已关闭');
        process.exit(0);
    });
});
