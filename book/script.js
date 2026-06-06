// 全局变量
let currentUser = {
    name: '',
    avatar: '',
    role: 'normal' // normal:普通管理员, scheduler:排班员
};
let scheduleData = []; // 排班数据
let allWorkers = []; // 所有员工列表

// DOM元素
const loading = document.getElementById('loading');
const scheduleTable = document.getElementById('scheduleTable');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const passwordModal = document.getElementById('passwordModal');
const swapShiftModal = document.getElementById('swapShiftModal');
const substituteModal = document.getElementById('substituteModal');
const revokeShiftModal = document.getElementById('revokeShiftModal');
const toast = document.getElementById('toast');



// 显示提示
function showToast(message, duration = 2000) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

// 获取当前班次
function getCurrentShift() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // 7:30-10:30 白一
    if (totalMinutes >= 7*60+30 && totalMinutes < 10*60+30) {
        return '白一';
    }
    // 10:30-12:30 白二
    else if (totalMinutes >= 10*60+30 && totalMinutes < 12*60+30) {
        return '白二';
    }
    // 12:30-15:30 白三
    else if (totalMinutes >= 12*60+30 && totalMinutes < 15*60+30) {
        return '白三';
    }
    // 15:30-17:30 白四
    else if (totalMinutes >= 15*60+30 && totalMinutes < 17*60+30) {
        return '白四';
    }
    // 17:30-22:00 晚五
    else if (totalMinutes >= 17*60+30 && totalMinutes < 22*60) {
        return '晚五';
    }
    return null;
}

// 获取当前星期
function getCurrentDay() {
    const now = new Date();
    const dayIndex = now.getDay();
    const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return days[dayIndex];
}

// 更新当前时间显示
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const currentShift = getCurrentShift();
    const currentDay = getCurrentDay();
    
    let shiftText = currentShift ? `当前班次：${currentShift}` : '当前非工作时间';
    
    const currentTimeElement = document.getElementById('currentTime');
    if (currentTimeElement) {
        currentTimeElement.innerHTML = `当前时间：${timeString} ${currentDay} ${shiftText}`;
    }
    
    // 每秒钟更新一次
    setTimeout(updateCurrentTime, 1000);
}

// 高亮当前时间的排班
function highlightCurrentTimeSchedule() {
    const currentShift = getCurrentShift();
    const currentDay = getCurrentDay();

    if (!currentShift) return;

    // 清除之前的高亮
    document.querySelectorAll('.time-highlight').forEach(el => {
        el.classList.remove('time-highlight');
    });

    // 映射星期几到单元格索引（第一列是班次名称，所以从1开始）
    const dayToIndex = {
        "星期一": 1,
        "星期二": 2,
        "星期三": 3,
        "星期四": 4,
        "星期五": 5,
        "星期六": 6,
        "星期日": 7
    };

    const dayIndex = dayToIndex[currentDay];
    if (dayIndex === undefined) return;

    // 找到对应班次和星期的单元格
    const shiftRows = document.querySelectorAll(`tr[data-shift="${currentShift}"]`);
    shiftRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells[dayIndex]) {
            cells[dayIndex].classList.add('time-highlight');
        }
    });
}

// 显示弹窗
function showModal(modal) {
    modal.style.display = 'flex';
}

// 隐藏弹窗
function hideModal(modal) {
    modal.style.display = 'none';
}

// 初始化用户信息
function initUserInfo() {
    // 从localStorage获取登录用户信息
    const userInfoStr = localStorage.getItem('userInfo');
    
    if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        currentUser = {
            name: userInfo.name || '',
            avatar: 'JL',
            role: userInfo.role === 'admin' ? 'scheduler' : 'normal'
        };
        
        userName.textContent = currentUser.name;
        userAvatar.textContent = currentUser.avatar;
    } else {
        // 未登录，跳转到登录页面
        window.location.href = 'login.html';
    }
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('userInfo');
        window.location.href = 'login.html';
    }
}

// 加载排班数据（调用真实后端接口）
async function loadScheduleData(week = null) {
    try {
        // 添加时间戳防止缓存
        const timestamp = new Date().getTime();
        // 调用后端接口获取排班数据
        let url = `/api/schedule-data?t=${timestamp}`;
        if (week) {
            url += `&week=${encodeURIComponent(week)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('接口请求失败');

        const result = await res.json();
        console.log('API返回的完整数据:', result);

        // 适配后端返回的数据结构 {code, msg, data}
        const weekData = result.data || result;
        console.log('weekData:', weekData);
        console.log('weekData.areas:', weekData.areas);
        console.log('weekData.areas长度:', weekData.areas ? weekData.areas.length : 0);

        // 重构为前端渲染需要的结构
        const loadedWeek = weekData.week || '第一周';
        scheduleData = [
            {
                week: loadedWeek,
                days: ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
                areas: weekData.areas.map(area => ({
                    name: area.name,
                    shifts: area.shifts.map(shift => ({
                        name: shift.name,
                        hours: shift.hours,
                        persons: shift.persons,
                        days: shift.days,
                        annotations: shift.annotations || [null, null, null, null, null, null, null]
                    }))
                }))
            }
        ];

        // 更新周次选择器的值
        const weekSelect = document.getElementById('weekSelect');
        if (weekSelect) {
            weekSelect.value = loadedWeek;
        }

        // 提取所有员工
        allWorkers = Array.from(new Set(
            scheduleData[0].areas.flatMap(area =>
                area.shifts.flatMap(shift => shift.persons.filter(p => p))
            )
        ));

        // 渲染排班表
        renderScheduleTable();

        // 加载员工列表到换班/代班下拉框
        loadWorkerSelect();

        // 加载当前用户班次到换班下拉框
        loadUserShifts();

        loading.style.display = 'none';
        scheduleTable.style.display = 'table';

        // 高亮当前时间的排班
        highlightCurrentTimeSchedule();

        // 数据加载完毕后再加载对应周的代换班记录
        loadNotices(loadedWeek);
    } catch (error) {
        console.error('加载排班数据失败：', error);
        loading.textContent = '加载失败，请刷新重试';
        showToast('加载排班数据失败！');
        return null;
    }
}

// 渲染排班表
function renderScheduleTable() {
    let tableHtml = '';
    
    // 表头行 - 使用动态周数
    tableHtml += '<tr>';
    tableHtml += `<th>${scheduleData[0].week || '第一周'}</th>`;
    const dayClasses = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    scheduleData[0].days.forEach((day, index) => {
        tableHtml += `<th class="${dayClasses[index]}">${day}</th>`;
    });
    tableHtml += '</tr>';
    
    // 渲染各区域班次
    scheduleData[0].areas.forEach(area => {
        // 区域标题行
        tableHtml += `<tr><td></td><td colspan="7">${area.name}</td></tr>`;
        
        // 班次行
        area.shifts.forEach(shift => {
            tableHtml += `<tr data-shift="${shift.name}" data-hour="${shift.hours}">`;
            tableHtml += `<td>${shift.name}</td>`;
            
            shift.days.forEach((person, index) => {
                const dayClass = dayClasses[index];
                const hasAnnotation = shift.annotations && shift.annotations[index];
                let personHtml = person;
                
                // 如果有批注，添加（有）标记
                if (hasAnnotation && person) {
                    personHtml = person + '（有）';
                }
                
                // 高亮当前用户姓名
                if (person === currentUser.name) {
                    personHtml = `<span class="self-name">${personHtml}</span>`;
                }
                tableHtml += `<td class="${dayClass}">${personHtml || ''}</td>`;
            });
            
            tableHtml += '</tr>';
        });
    });
    
    // 班次说明行
    tableHtml += `<tr><td>白一</td><td colspan="7">七点半到十点半（3小时）</td></tr>`;
    tableHtml += `<tr><td>白二</td><td colspan="7">十点半到十二点半（2小时）</td></tr>`;
    tableHtml += `<tr><td>白三</td><td colspan="7">十二点半到十五点半（3小时）</td></tr>`;
    tableHtml += `<tr><td>白四</td><td colspan="7">十五点半到十七点半（2小时）</td></tr>`;
    tableHtml += `<tr><td>晚五</td><td colspan="7">十七点半到二十二点（4.5小时）</td></tr>`;
    
    scheduleTable.innerHTML = tableHtml;
}

// 加载员工列表到下拉框
function loadWorkerSelect() {
    const swapUser = document.getElementById('swapUser');
    const substituteUser = document.getElementById('substituteUser');
    const substituteUserList = document.getElementById('substituteUserList');
    
    // 保存当前选择的值
    const savedSwapUser = swapUser.value;
    const savedSubstituteUser = substituteUser.value;
    
    let options = '<option value="">请选择人员</option>';
    let datalistOptions = '';
    allWorkers.forEach(worker => {
        if (worker !== currentUser.name) {
            options += `<option value="${worker}">${worker}</option>`;
            datalistOptions += `<option value="${worker}"></option>`;
        }
    });
    
    swapUser.innerHTML = options;
    substituteUserList.innerHTML = datalistOptions;
    
    // 恢复之前选择的值
    if (savedSwapUser) swapUser.value = savedSwapUser;
    if (savedSubstituteUser) substituteUser.value = savedSubstituteUser;
    
    // 换班对象选择变化时，加载该对象的班次
    swapUser.addEventListener('change', function() {
        loadTargetShifts(this.value);
    });
}

// 加载目标班次（换班对象的班次）
function loadTargetShifts(userName) {
    const targetShift = document.getElementById('targetShift');
    
    // 保存当前选择的值
    const savedTargetShift = targetShift.value;
    
    let shiftOptions = '<option value="">请选择目标班次</option>';
    
    if (userName) {
        // 遍历排班数据，找到该用户的班次
        scheduleData[0].areas.forEach(area => {
            area.shifts.forEach(shift => {
                shift.days.forEach((person, index) => {
                    if (person === userName) {
                        const day = scheduleData[0].days[index];
                        const shiftKey = `${area.name}-${shift.name}-${day}`;
                        shiftOptions += `<option value="${shiftKey}">${area.name}-${shift.name}-${day}</option>`;
                    }
                });
            });
        });
    }
    
    targetShift.innerHTML = shiftOptions;
    
    // 恢复之前选择的值
    if (savedTargetShift) targetShift.value = savedTargetShift;
}

// 加载当前用户的班次到换班下拉框
function loadUserShifts() {
    const originalShift = document.getElementById('originalShift');
    const substituteShift = document.getElementById('substituteShift');
    
    // 保存当前选择的值
    const savedOriginalShift = originalShift.value;
    const savedSubstituteShift = substituteShift.value;
    
    let shiftOptions = '<option value="">请选择班次</option>';
    
    // 遍历排班数据，找到当前用户的班次
    scheduleData[0].areas.forEach(area => {
        area.shifts.forEach(shift => {
            shift.days.forEach((person, index) => {
                if (person === currentUser.name) {
                    const day = scheduleData[0].days[index];
                    const shiftKey = `${area.name}-${shift.name}-${day}`;
                    shiftOptions += `<option value="${shiftKey}">${area.name}-${shift.name}-${day}</option>`;
                }
            });
        });
    });
    
    originalShift.innerHTML = shiftOptions;
    substituteShift.innerHTML = shiftOptions;
    
    // 恢复之前选择的值
    if (savedOriginalShift) originalShift.value = savedOriginalShift;
    if (savedSubstituteShift) substituteShift.value = savedSubstituteShift;
}

// 排班编辑按钮点击事件
document.getElementById('editScheduleBtn').addEventListener('click', () => {
    // 如果是管理员，直接跳转到排班编辑页面
    if (currentUser.role === 'scheduler') {
        window.location.href = '/paiban/index.html';
    } else {
        // 非管理员，显示密码验证弹窗
        showModal(passwordModal);
    }
});

// 负责书架按钮
const shelfBtn = document.getElementById('shelfBtn');
const shelfModal = document.getElementById('shelfModal');
const closeShelfBtn = document.getElementById('closeShelfBtn');
const shelfContentDiv = document.getElementById('shelfModalContent');

if (shelfBtn && shelfModal && closeShelfBtn && shelfContentDiv) {
    shelfBtn.addEventListener('click', async () => {
        await loadShelfData();
        showModal(shelfModal);
    });

    closeShelfBtn.addEventListener('click', () => {
        hideModal(shelfModal);
    });
}

// 巡查表按钮
const inspectBtn = document.getElementById('inspectBtn');
const inspectModal = document.getElementById('inspectModal');
const closeInspectBtn = document.getElementById('closeInspectBtn');
const inspectContentDiv = document.getElementById('inspectModalContent');

if (inspectBtn && inspectModal && closeInspectBtn && inspectContentDiv) {
    inspectBtn.addEventListener('click', async () => {
        await loadInspectData();
        showModal(inspectModal);
    });

    closeInspectBtn.addEventListener('click', () => {
        hideModal(inspectModal);
    });
}

// 加载负责书架数据
async function loadShelfData() {
    if (!shelfContentDiv) return;
    
    try {
        const response = await fetch(`/api/shelf`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            const data = result.data;
            let html = '';
            
            if (data.text) {
                html += `<div class="info-text">${data.text}</div>`;
            }
            
            // 处理多张图片
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                data.images.forEach((imageUrl, index) => {
                    const url = imageUrl.startsWith('http') ? imageUrl : imageUrl;
                    html += `<img src="${url}" class="info-image" alt="负责书架图片${index + 1}">`;
                });
            } else if (data.image) {
                // 兼容旧的单图格式
                const imageUrl = data.image.startsWith('http') ? data.image : data.image;
                html += `<img src="${imageUrl}" class="info-image" alt="负责书架图片">`;
            }
            
            if (!data.text && (!data.images || data.images.length === 0) && !data.image) {
                html = '<div class="empty-notice">暂无负责书架信息</div>';
            }
            
            shelfContentDiv.innerHTML = html;
        } else {
            shelfContentDiv.innerHTML = '<div class="empty-notice">暂无负责书架信息</div>';
        }
    } catch (error) {
        console.error('加载负责书架失败:', error);
        shelfContentDiv.innerHTML = '<div class="empty-notice">暂无负责书架信息</div>';
    }
}

// 加载巡查表数据
async function loadInspectData() {
    if (!inspectContentDiv) return;
    
    try {
        const response = await fetch(`/api/inspect`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            const data = result.data;
            let html = '';
            
            if (data.text) {
                html += `<div class="info-text">${data.text}</div>`;
            }
            
            // 处理多张图片
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                data.images.forEach((imageUrl, index) => {
                    const url = imageUrl.startsWith('http') ? imageUrl : imageUrl;
                    html += `<img src="${url}" class="info-image" alt="巡查表图片${index + 1}">`;
                });
            } else if (data.image) {
                // 兼容旧的单图格式
                const imageUrl = data.image.startsWith('http') ? data.image : data.image;
                html += `<img src="${imageUrl}" class="info-image" alt="巡查表图片">`;
            }
            
            if (!data.text && (!data.images || data.images.length === 0) && !data.image) {
                html = '<div class="empty-notice">暂无巡查表信息</div>';
            }
            
            inspectContentDiv.innerHTML = html;
        } else {
            inspectContentDiv.innerHTML = '<div class="empty-notice">暂无巡查表信息</div>';
        }
    } catch (error) {
        console.error('加载巡查表失败:', error);
        inspectContentDiv.innerHTML = '<div class="empty-notice">暂无巡查表信息</div>';
    }
}

// 公告按钮
const noticeBtn = document.getElementById('noticeBtn');
const noticeModal = document.getElementById('noticeModal');
const closeNoticeBtn = document.getElementById('closeNoticeBtn');
const noticeContentDiv = document.getElementById('noticeModalContent');

if (noticeBtn && noticeModal && closeNoticeBtn && noticeContentDiv) {
    noticeBtn.addEventListener('click', async () => {
        await loadNoticeData();
        showModal(noticeModal);
    });

    closeNoticeBtn.addEventListener('click', () => {
        hideModal(noticeModal);
    });
}

// 活动按钮
const activityBtn = document.getElementById('activityBtn');
const activityModal = document.getElementById('activityModal');
const closeActivityBtn = document.getElementById('closeActivityBtn');
const activityContentDiv = document.getElementById('activityModalContent');

if (activityBtn && activityModal && closeActivityBtn && activityContentDiv) {
    activityBtn.addEventListener('click', async () => {
        await loadActivityData();
        showModal(activityModal);
    });

    closeActivityBtn.addEventListener('click', () => {
        hideModal(activityModal);
    });
}

// 加载公告数据
async function loadNoticeData() {
    if (!noticeContentDiv) return;
    
    try {
        const response = await fetch(`/api/notice`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            const data = result.data;
            let html = '';
            
            if (data.text) {
                html += `<div class="info-text">${data.text}</div>`;
            }
            
            // 处理多张图片
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                data.images.forEach((imageUrl, index) => {
                    const url = imageUrl.startsWith('http') ? imageUrl : imageUrl;
                    html += `<img src="${url}" class="info-image" alt="公告图片${index + 1}">`;
                });
            } else if (data.image) {
                // 兼容旧的单图格式
                const imageUrl = data.image.startsWith('http') ? data.image : data.image;
                html += `<img src="${imageUrl}" class="info-image" alt="公告图片">`;
            }
            
            if (!data.text && (!data.images || data.images.length === 0) && !data.image) {
                html = '<div class="empty-notice">暂无公告</div>';
            }
            
            noticeContentDiv.innerHTML = html;
        } else {
            noticeContentDiv.innerHTML = '<div class="empty-notice">暂无公告</div>';
        }
    } catch (error) {
        console.error('加载公告失败:', error);
        noticeContentDiv.innerHTML = '<div class="empty-notice">暂无公告</div>';
    }
}

// 加载活动数据
async function loadActivityData() {
    if (!activityContentDiv) return;
    
    try {
        const response = await fetch(`/api/activity`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            const data = result.data;
            let html = '';
            
            if (data.text) {
                html += `<div class="info-text">${data.text}</div>`;
            }
            
            // 处理多张图片
            if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                data.images.forEach((imageUrl, index) => {
                    const url = imageUrl.startsWith('http') ? imageUrl : imageUrl;
                    html += `<img src="${url}" class="info-image" alt="活动图片${index + 1}">`;
                });
            } else if (data.image) {
                // 兼容旧的单图格式
                const imageUrl = data.image.startsWith('http') ? data.image : data.image;
                html += `<img src="${imageUrl}" class="info-image" alt="活动图片">`;
            }
            
            if (!data.text && (!data.images || data.images.length === 0) && !data.image) {
                html = '<div class="empty-notice">暂无活动</div>';
            }
            
            activityContentDiv.innerHTML = html;
        } else {
            activityContentDiv.innerHTML = '<div class="empty-notice">暂无活动</div>';
        }
    } catch (error) {
        console.error('加载活动失败:', error);
        activityContentDiv.innerHTML = '<div class="empty-notice">暂无活动</div>';
    }
}

// 密码确认按钮
document.getElementById('confirmPwdBtn').addEventListener('click', async () => {
    const password = document.getElementById('editPassword').value;
    if (!password) {
        showToast('请输入密码！');
        return;
    }
    
    try {
        // 调用后端接口验证管理员密码
        const response = await fetch(`/api/verify-admin-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            hideModal(passwordModal);
            // 跳转到排班编辑页面（拖拽版）
            window.location.href = '/paiban/index.html';
        } else {
            showToast(result.msg || '密码错误，请重试！');
            document.getElementById('editPassword').value = '';
        }
    } catch (error) {
        console.error('验证密码失败:', error);
        showToast('网络错误，请稍后重试！');
    }
});

// 密码取消按钮
document.getElementById('cancelPwdBtn').addEventListener('click', () => {
    hideModal(passwordModal);
    document.getElementById('editPassword').value = '';
});

// 换班申请按钮
document.getElementById('swapShiftBtn').addEventListener('click', () => {
    showModal(swapShiftModal);
});

// 取消换班按钮
document.getElementById('cancelSwapBtn').addEventListener('click', () => {
    hideModal(swapShiftModal);
});

// 提交换班申请（调用后端接口）
document.getElementById('confirmSwapBtn').addEventListener('click', async () => {
    const originalShift = document.getElementById('originalShift').value;
    const swapUser = document.getElementById('swapUser').value;
    const targetShift = document.getElementById('targetShift').value;
    const swapReason = document.getElementById('swapReason').value;
    
    if (!originalShift || !swapUser || !swapReason) {
        showToast('请填写完整换班信息！');
        return;
    }
    
    try {
        // 调用后端换班申请接口
        const res = await fetch(`/api/swap-shift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicant: currentUser.name,
                swapUser: swapUser,
                originalShift: originalShift,
                targetShift: targetShift,
                reason: swapReason,
                week: scheduleData[0]?.week || '第一周'
            })
        });
        
        const data = await res.json();
        console.log('换班申请响应:', data);
        if (data.success) {
            hideModal(swapShiftModal);
            showToast('换班申请提交成功！');
            // 清空表单
            document.getElementById('originalShift').value = '';
            document.getElementById('swapUser').value = '';
            document.getElementById('targetShift').value = '';
            document.getElementById('swapReason').value = '';
            // 刷新排班数据和公告
            setTimeout(async () => {
                const currentWeek = document.getElementById('weekSelect').value;
                await loadScheduleData(currentWeek);
            }, 500);
        } else {
            showToast('提交失败：' + data.message);
        }
    } catch (error) {
        console.error('提交换班申请失败：', error);
        showToast('提交换班申请失败！');
    }
});

// 代班申请按钮
document.getElementById('substituteBtn').addEventListener('click', () => {
    showModal(substituteModal);
});

// 取消代班按钮
document.getElementById('cancelSubstituteBtn').addEventListener('click', () => {
    hideModal(substituteModal);
});

// 提交代班申请（调用后端接口）
document.getElementById('confirmSubstituteBtn').addEventListener('click', async () => {
    const substituteUser = document.getElementById('substituteUser').value;
    const substituteShift = document.getElementById('substituteShift').value;
    const substituteReason = document.getElementById('substituteReason').value;
    
    if (!substituteUser || !substituteReason) {
        showToast('请填写完整代班信息！');
        return;
    }
    
    try {
        // 调用后端代班申请接口
        const res = await fetch(`/api/substitute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                applicant: currentUser.name,
                substituteUser: substituteUser,
                substituteShift: substituteShift,
                reason: substituteReason,
                week: scheduleData[0]?.week || '第一周'
            })
        });
        
        const data = await res.json();
        if (data.success) {
            hideModal(substituteModal);
            showToast('代班申请提交成功！');
            // 清空表单
            document.getElementById('substituteUser').value = '';
            document.getElementById('substituteShift').value = '';
            document.getElementById('substituteReason').value = '';
            // 刷新排班数据和公告
            setTimeout(async () => {
                const currentWeek = document.getElementById('weekSelect').value;
                await loadScheduleData(currentWeek);
            }, 500);
        } else {
            showToast('提交失败：' + data.message);
        }
    } catch (error) {
        console.error('提交代班申请失败：', error);
        showToast('提交代班申请失败！');
    }
});

// 链接数据
let linkData = {
    checkinUrl: 'https://jielong.com/s/Mjc3NTcwNCwzMDAyMDE=',
    activityCheckinUrl: 'https://d2.xksyun.com/website/totp_code?qrcode_token_url=https%3A%2F%2Fd2.xksyun.com%2Fg_api4%2Fr%3Fs%3D69dda990156d8441851e2946&secret=Ulk1Y0lxTmVtRDlYV3ZZVTRTYUgyWjVNNk01a0cwVjlKdmk5Q05hdjdLV2NoWmJvN3ExZGxBckR4ZEp4ZFhRSy0tb0Z1ZjQ4NjRnZXI5Q3FlY2tuaThLUT09--e1dd48e42f199a255635528b00f71e22d6c6f6a0',
    activityCheckoutUrl: 'https://d2.xksyun.com/website/totp_code?qrcode_token_url=https%3A%2F%2Fd2.xksyun.com%2Fg_api4%2Fr%3Fs%3D69ddafc9156d8441851e30bc&secret=Y2R0T0xkYmVGSTBTUTRzSzZIYlNBMWo5MVBhUlJsUlhHMTBJUzRYME5OaStXdEhkL1FyQ0V5c1NROTdpRDVHMi0teVlTQitJbHZ2V2phUXpBSWpUY2ppdz09--f3641aba405b5ef9c76d71ea5b5d34d6476ca25f',
    bookSearchUrl: 'https://i.cqwyp.edu.cn/InDigLib/WyjxSso!opacLogin.action'
};

// 加载链接数据
async function loadLinkData() {
    try {
        const response = await fetch(`/api/links`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            linkData = {
                checkinUrl: result.data.checkinUrl !== undefined ? result.data.checkinUrl : linkData.checkinUrl,
                activityCheckinUrl: result.data.activityCheckinUrl !== undefined ? result.data.activityCheckinUrl : linkData.activityCheckinUrl,
                activityCheckoutUrl: result.data.activityCheckoutUrl !== undefined ? result.data.activityCheckoutUrl : linkData.activityCheckoutUrl,
                bookSearchUrl: result.data.bookSearchUrl !== undefined ? result.data.bookSearchUrl : linkData.bookSearchUrl
            };
        }
    } catch (error) {
        console.error('加载链接数据失败:', error);
    }
}

// 打卡按钮
document.getElementById('checkinBtn').addEventListener('click', () => {
    // 跳转打卡链接
    window.open(linkData.checkinUrl, '_blank');
});

// 活动签到按钮
const activityCheckinBtn = document.getElementById('activityCheckinBtn');
if (activityCheckinBtn) {
    activityCheckinBtn.addEventListener('click', function() {
        if (linkData.activityCheckinUrl) {
            window.open(linkData.activityCheckinUrl, '_blank');
        } else {
            showToast('活动签到链接未设置！');
        }
    });
}

// 活动签退按钮
const activityCheckoutBtn = document.getElementById('activityCheckoutBtn');
if (activityCheckoutBtn) {
    activityCheckoutBtn.addEventListener('click', function() {
        if (linkData.activityCheckoutUrl) {
            window.open(linkData.activityCheckoutUrl, '_blank');
        } else {
            showToast('活动签退链接未设置！');
        }
    });
}

// 图书查找按钮
document.getElementById('bookSearchBtn').addEventListener('click', () => {
    // 跳转图书查找链接
    window.open(linkData.bookSearchUrl, '_blank');
});

// 公告面板折叠/展开功能
function initNoticePanel() {
    const noticeToggle = document.getElementById('noticeToggle');
    const noticeContent = document.getElementById('noticeContent');
    const toggleArrow = document.getElementById('toggleArrow');
    
    if (noticeToggle) {
        noticeToggle.addEventListener('click', () => {
            const isCollapsed = noticeContent.classList.contains('collapsed');
            
            if (isCollapsed) {
                // 展开
                noticeContent.classList.remove('collapsed');
                noticeContent.classList.add('expanded');
                toggleArrow.classList.add('expanded');
            } else {
                // 收起
                noticeContent.classList.remove('expanded');
                noticeContent.classList.add('collapsed');
                toggleArrow.classList.remove('expanded');
            }
        });
    }
}

// 排班表面板折叠/展开功能
function initSchedulePanel() {
    const scheduleToggle = document.getElementById('scheduleToggle');
    const scheduleContent = document.getElementById('scheduleContent');
    const scheduleArrow = document.getElementById('scheduleArrow');
    
    if (scheduleToggle) {
        scheduleToggle.addEventListener('click', () => {
            const isCollapsed = scheduleContent.classList.contains('collapsed');
            
            if (isCollapsed) {
                // 展开
                scheduleContent.classList.remove('collapsed');
                scheduleContent.classList.add('expanded');
                scheduleArrow.classList.add('expanded');
            } else {
                // 收起
                scheduleContent.classList.remove('expanded');
                scheduleContent.classList.add('collapsed');
                scheduleArrow.classList.remove('expanded');
            }
        });
    }
}

// 加载公告数据
async function loadNotices(week = null) {
    try {
        // 如果没有指定周次，从 scheduleData 获取
        const targetWeek = week || scheduleData[0]?.week || '第一周';
        // 添加时间戳防止缓存
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/swap-notices?week=${encodeURIComponent(targetWeek)}&t=${timestamp}`);
        const data = await res.json();
        
        const noticeList = document.getElementById('noticeList');
        
        if (data.code === 200 && data.data && data.data.length > 0) {
            let noticesHtml = '';
            
            data.data.forEach(notice => {
                const dateTime = new Date(notice.created_at);
                const dateStr = dateTime.toLocaleDateString('zh-CN');
                const timeStr = dateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                
                let typeIcon = '';
                let typeClass = '';
                let noticeText = '';
                
                if (notice.type === 'swap') {
                    // 换班记录
                    typeIcon = '🔄';
                    typeClass = 'swap';
                    if (notice.target_shift) {
                        noticeText = `${notice.applicant} 与 ${notice.target_user} 换班`;
                    } else {
                        noticeText = `${notice.applicant} 换班给 ${notice.target_user}`;
                    }
                } else {
                    // 代班记录
                    typeIcon = '👥';
                    typeClass = 'substitute';
                    noticeText = `${notice.applicant} 请 ${notice.target_user} 代班`;
                }
                
                noticesHtml += `
                    <div class="notice-record ${typeClass}">
                        <span class="notice-type-icon">${typeIcon}</span>
                        <div class="notice-details">
                            <div class="notice-datetime">${dateStr} ${timeStr}</div>
                            <div class="notice-text">${noticeText}</div>
                            <div class="notice-reason">班次：${notice.original_shift}${notice.target_shift ? ' ↔ ' + notice.target_shift : ''}</div>
                        </div>
                    </div>
                `;
            });
            
            noticeList.innerHTML = noticesHtml;
        } else {
            noticeList.innerHTML = '<div class="notice-empty">暂无换班/代班记录</div>';
        }
    } catch (error) {
        console.error('加载公告失败:', error);
        const noticeList = document.getElementById('noticeList');
        if (noticeList) {
            noticeList.innerHTML = '<div class="notice-empty">加载失败，请稍后重试</div>';
        }
    }
}

// 撤销代换班按钮点击事件
document.getElementById('revokeShiftBtn').addEventListener('click', () => {
    // 显示模态框
    showModal(revokeShiftModal);
    
    // 加载当天的代换班记录
    loadTodayShiftRecords();
});

// 取消撤销按钮
document.getElementById('cancelRevokeBtn').addEventListener('click', () => {
    hideModal(revokeShiftModal);
});

// 加载当天的代换班记录
async function loadTodayShiftRecords() {
    try {
        // 添加时间戳防止缓存
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/today-shift-records?t=${timestamp}`);
        const data = await res.json();
        
        const revokeRecordSelect = document.getElementById('revokeRecordSelect');
        revokeRecordSelect.innerHTML = '<option value="">请选择要撤销的记录</option>';
        
        if (data.code === 200 && data.data && data.data.length > 0) {
            data.data.forEach(record => {
                const option = document.createElement('option');
                option.value = record.id;
                option.setAttribute('data-type', record.type);
                const dateTime = new Date(record.created_at);
                const timeStr = dateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                option.textContent = `${record.type === 'swap' ? '换班' : '代班'}: ${record.applicant} ${record.type === 'swap' ? '与' : '请'} ${record.target_user} (${timeStr})`;
                revokeRecordSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '今天没有代换班记录';
            revokeRecordSelect.appendChild(option);
        }
    } catch (error) {
        console.error('加载代换班记录失败:', error);
        showToast('加载代换班记录失败！');
        
        const revokeRecordSelect = document.getElementById('revokeRecordSelect');
        revokeRecordSelect.innerHTML = '<option value="">加载失败，请稍后重试</option>';
    }
}

// 确认撤销代换班
document.getElementById('confirmRevokeBtn').addEventListener('click', async () => {
    const revokeRecordSelect = document.getElementById('revokeRecordSelect');
    const recordId = revokeRecordSelect.value;
    const selectedOption = revokeRecordSelect.options[revokeRecordSelect.selectedIndex];
    const type = selectedOption.getAttribute('data-type');
    
    if (!recordId) {
        showToast('请选择要撤销的记录！');
        return;
    }
    
    if (!type) {
        showToast('记录类型错误，请重新选择！');
        return;
    }
    
    try {
        const res = await fetch(`/api/revoke-shift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recordId: recordId,
                type: type
            })
        });
        
        const data = await res.json();
        if (data.success) {
            hideModal(revokeShiftModal);
            showToast('代换班已撤销！');
            setTimeout(async () => {
                const currentWeek = document.getElementById('weekSelect').value;
                await loadScheduleData(currentWeek);
            }, 500);
        } else {
            showToast('撤销失败：' + data.message);
        }
    } catch (error) {
        console.error('撤销代换班失败:', error);
        showToast('撤销代换班失败！');
    }
});

// 加载周次列表
async function loadWeekList() {
    try {
        const res = await fetch(`/api/list-weeks`);
        const data = await res.json();
        
        if (data.code === 200 && data.data && data.data.length > 0) {
            const weekSelect = document.getElementById('weekSelect');
            weekSelect.innerHTML = data.data.map(week => 
                `<option value="${week}">${week}</option>`
            ).join('');
            
            // 添加周次切换事件（loadNotices 由 loadScheduleData 末尾统一调用，避免竞态）
            weekSelect.addEventListener('change', (e) => {
                loadScheduleData(e.target.value);
            });
        }
    } catch (error) {
        console.error('加载周次列表失败:', error);
    }
}

// 点击空白处关闭弹窗
window.addEventListener('click', (e) => {
    if (e.target === passwordModal) hideModal(passwordModal);
    if (e.target === swapShiftModal) hideModal(swapShiftModal);
    if (e.target === substituteModal) hideModal(substituteModal);
    if (e.target === revokeShiftModal) hideModal(revokeShiftModal);
});

// 页面初始化
window.onload = function() {
    initUserInfo();
    initNoticePanel();
    initSchedulePanel();
    loadWeekList();
    loadScheduleData(null); // loadNotices() 在 loadScheduleData 完成后自动调用
    loadLinkData(); // 加载链接数据

    // 启动当前时间更新
    updateCurrentTime();

    // 绑定用户名点击事件（退出登录）
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.addEventListener('click', logout);
    }

    // 定时刷新排班数据（实时更新）
    setInterval(() => {
        const currentWeek = document.getElementById('weekSelect').value;
        loadScheduleData(currentWeek);
    }, 30000); // 每30秒刷新一次

    // 定时刷新代换班记录（独立刷新，此时 scheduleData 已有数据）
    setInterval(() => {
        loadNotices();
    }, 60000); // 每60秒刷新一次

    // 定时更新高亮显示（每5秒）
    setInterval(() => {
        highlightCurrentTimeSchedule();
    }, 5000); // 每5秒更新一次高亮

    // 绑定图片点击事件，实现预览功能
    bindImagePreviewEvents();
};

// 绑定图片预览事件
function bindImagePreviewEvents() {
    // 为公告、活动、负责书架和巡查表弹窗添加事件委托，处理图片点击
    const noticeModal = document.getElementById('noticeModal');
    const activityModal = document.getElementById('activityModal');
    const shelfModal = document.getElementById('shelfModal');
    const inspectModal = document.getElementById('inspectModal');
    const imagePreviewModal = document.getElementById('imagePreviewModal');
    const previewImage = document.getElementById('previewImage');
    const closeImagePreview = document.getElementById('closeImagePreview');

    // 处理公告图片点击
    if (noticeModal) {
        noticeModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-image')) {
                showImagePreview(e.target.src);
            }
        });
    }

    // 处理活动图片点击
    if (activityModal) {
        activityModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-image')) {
                showImagePreview(e.target.src);
            }
        });
    }

    // 处理负责书架图片点击
    if (shelfModal) {
        shelfModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-image')) {
                showImagePreview(e.target.src);
            }
        });
    }

    // 处理巡查表图片点击
    if (inspectModal) {
        inspectModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('info-image')) {
                showImagePreview(e.target.src);
            }
        });
    }

    // 关闭图片预览
    if (closeImagePreview) {
        closeImagePreview.addEventListener('click', () => {
            hideImagePreview();
        });
    }

    // 点击预览背景关闭
    if (imagePreviewModal) {
        imagePreviewModal.addEventListener('click', (e) => {
            if (e.target === imagePreviewModal) {
                hideImagePreview();
            }
        });
    }
}

// 显示图片预览
function showImagePreview(imageUrl) {
    const imagePreviewModal = document.getElementById('imagePreviewModal');
    const previewImage = document.getElementById('previewImage');
    
    if (imagePreviewModal && previewImage) {
        previewImage.src = imageUrl;
        imagePreviewModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }
}

// 隐藏图片预览
function hideImagePreview() {
    const imagePreviewModal = document.getElementById('imagePreviewModal');
    
    if (imagePreviewModal) {
        imagePreviewModal.style.display = 'none';
        document.body.style.overflow = ''; // 恢复背景滚动
    }
}
