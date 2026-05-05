

// 存储当前拖拽的姓名
let draggedName = '';
// 存储当前选中的单元格
let activeCell = null;
// 操作历史记录栈
let operationHistory = [];
// 最大历史记录数
const MAX_HISTORY = 50;
// 撤回按钮元素
const undoBtn = document.getElementById('undo-btn');
// 工时阈值（≥10小时变红）
const HOUR_THRESHOLD = 10;
// 每个单元格最大人数
const MAX_PERSON_PER_CELL = 2;
// 存储人员排班记录（班次+日期 → 人员姓名数组）
const scheduleRecords = {};
// 提示弹窗元素
const toast = document.getElementById('toast');

// 班次工时配置
const shiftHourMap = {
    '白一': 3,
    '白二': 2,
    '白三': 3,
    '白四': 2,
    '晚五': 4.5
};

// 所有人员列表
const allWorkers = [
    '罗俊毅', '贾川', '孙必发', '王怿萌', '贾庆', '张艺涵', '王宏睿', '李豪', 
    '张意来', '邓淏堃', '向欢', '李秉羲', '李延溯', '钟琴', '刘娟', '杨玉婷', 
    '刘盛友', '汪鑫烨', '唐礼豪', '戴佳秀', '范文', '朱鋆翔', '龚纱', '黄路茜', 
    '王鑫源', '刘一德', '张先龙', '甘胤呈', '周俊杰', '张巧莹', '李盈盈', '张鲁阳', '廖航雪'
];

// 初始化工时统计
let hourStats = {};
allWorkers.forEach(worker => {
    hourStats[worker] = 0;
});

// 显示提示弹窗
function showToast(message, duration = 2000) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

// 解析单元格内容，返回人员列表和批注状态
function parseCellContent(content) {
    const hasAnnotation = content.includes('（有）');
    // 移除批注后分割人员（支持换行、逗号、空格分隔）
    const cleanContent = content.replace('（有）', '').trim();
    let persons = [];
    
    if (cleanContent) {
        // 支持多种分隔方式：换行、逗号、空格
        persons = cleanContent.split(/[\n,，\s]+/).filter(p => p.trim());
        // 去重
        persons = [...new Set(persons)];
        // 限制最大人数
        persons = persons.slice(0, MAX_PERSON_PER_CELL);
    }
    
    return {
        persons: persons,
        hasAnnotation: hasAnnotation
    };
}

// 格式化单元格内容，显示多个人和批注
function formatCellContent(persons, hasAnnotation) {
    if (persons.length === 0) {
        return hasAnnotation ? '（有）' : '';
    }
    
    // 格式化多个人显示
    let content = persons.map(p => `<span class="person-item">${p}</span>`).join('');
    // 添加批注
    if (hasAnnotation) {
        content += '<span class="annotation-text">（有）</span>';
    }
    
    return content;
}

// 检查周次是否已填写
function checkWeekFilled() {
    const weekCell = document.getElementById('weekCell');
    const weekValue = weekCell.textContent.trim();
    if (!weekValue || weekValue === '第周') {
        showToast('请先填写左上角的周次！');
        return false;
    }
    return true;
}

// 检查人员是否已在该【班次+日期】排班（跨区域也判定为同一时间）
function checkDuplicateSchedule(shiftDayKey, userName) {
    // 解析当前班次和日期
    const parts = shiftDayKey.split('-');
    if (parts.length < 3) return false;
    
    const currentShift = parts[1]; // 班次（如白一、白二）
    const currentDay = parts[2]; // 日期（如周一、周二）
    
    // 遍历所有排班记录，判断该人员是否已在同一班次+日期的任何区域排班
    for (const key in scheduleRecords) {
        const keyParts = key.split('-');
        if (keyParts.length >= 3) {
            const keyShift = keyParts[1];
            const keyDay = keyParts[2];
            
            // 如果班次和日期相同，且该人员已在该时间段排班
            if (keyShift === currentShift && keyDay === currentDay && scheduleRecords[key].includes(userName)) {
                alert(`⚠️ 提示：${userName} 已在【${keyShift}-${keyDay}】时间段排班（跨区域也属于同一时间），不能重复排班！`);
                return true; // 重复排班
            }
        }
    }
    return false; // 未重复
}

// 更新排班记录（支持多人）
function updateScheduleRecords(shiftDayKey, oldPersons, newPersons) {
    // 清空旧记录
    if (scheduleRecords[shiftDayKey]) {
        // 移除旧人员
        oldPersons.forEach(person => {
            const index = scheduleRecords[shiftDayKey].indexOf(person);
            if (index > -1) {
                scheduleRecords[shiftDayKey].splice(index, 1);
            }
        });
    } else {
        scheduleRecords[shiftDayKey] = [];
    }
    
    // 添加新人员
    newPersons.forEach(person => {
        if (!scheduleRecords[shiftDayKey].includes(person)) {
            scheduleRecords[shiftDayKey].push(person);
        }
    });
    
    // 如果为空，删除该记录
    if (scheduleRecords[shiftDayKey].length === 0) {
        delete scheduleRecords[shiftDayKey];
    }
}

// 保存当前状态到历史记录
function saveState(type, cell, oldValue, newValue, shiftHour = 0) {
    // 生成唯一的单元格标识
    const cellIndex = Array.from(document.querySelectorAll('td[contenteditable="true"]')).indexOf(cell);
    // 获取班次+日期标识
    const shiftDayKey = cell.dataset.shiftDay;
    
    // 保存工时统计和排班记录的深拷贝
    const hourStatsCopy = JSON.parse(JSON.stringify(hourStats));
    const scheduleRecordsCopy = JSON.parse(JSON.stringify(scheduleRecords));
    
    // 创建操作记录
    const operation = {
        type: type, // 'drop' | 'edit' | 'annotation'
        cellIndex: cellIndex,
        cell: cell,
        oldValue: oldValue,
        newValue: newValue,
        shiftHour: shiftHour,
        shiftDayKey: shiftDayKey,
        hourStats: hourStatsCopy,
        scheduleRecords: scheduleRecordsCopy,
        timestamp: new Date().getTime()
    };

    // 添加到历史记录
    operationHistory.push(operation);
    
    // 限制历史记录数量
    if (operationHistory.length > MAX_HISTORY) {
        operationHistory.shift();
    }

    // 更新撤回按钮状态
    undoBtn.disabled = operationHistory.length === 0;
}

// 执行撤回操作（支持多人恢复）
function undoLastOperation() {
    if (operationHistory.length === 0) return;

    // 获取最后一次操作
    const lastOp = operationHistory.pop();
    
    // 1. 恢复单元格内容
    lastOp.cell.innerHTML = lastOp.oldValue;
    
    // 2. 完全重置排班记录（替换为操作前的快照）
    // 先清空当前所有排班记录
    Object.keys(scheduleRecords).forEach(key => delete scheduleRecords[key]);
    // 从历史快照中恢复排班记录
    const oldScheduleRecords = lastOp.scheduleRecords;
    for (const key in oldScheduleRecords) {
        scheduleRecords[key] = [...oldScheduleRecords[key]];
    }
    
    // 3. 恢复工时统计
    hourStats = JSON.parse(JSON.stringify(lastOp.hourStats));
    
    // 4. 更新工时展示
    updateWorkHourDisplay();
    
    // 5. 更新撤回按钮状态
    undoBtn.disabled = operationHistory.length === 0;
    
    // 6. 恢复单元格选中状态样式
    if (lastOp.cell === activeCell) {
        lastOp.cell.style.backgroundColor = '#bae7ff';
    }
    
    console.log(`已撤回${lastOp.type}操作：${lastOp.oldValue} <- ${lastOp.newValue}`);
    console.log('撤回后排班记录恢复为：', JSON.parse(JSON.stringify(scheduleRecords)));
}

// 监听单元格选中事件
document.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
    cell.addEventListener('click', () => {
        // 取消之前选中单元格的样式
        if (activeCell) {
            activeCell.style.backgroundColor = '';
        }
        // 标记当前选中单元格
        activeCell = cell;
        // 高亮选中单元格
        cell.style.backgroundColor = '#bae7ff';
    });

    // 拖拽相关事件
    cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        cell.style.backgroundColor = '#e6f7ff';
    });

    cell.addEventListener('dragleave', () => {
        if (cell !== activeCell) {
            cell.style.backgroundColor = '';
        }
    });

    cell.addEventListener('drop', (e) => {
        e.preventDefault();
        // 仅处理排班单元格（有data-shift-day属性）
        if (!cell.dataset.shiftDay) return;
        
        // 检查周次是否已填写
        if (!checkWeekFilled()) {
            // 恢复单元格样式
            cell.style.backgroundColor = activeCell === cell ? '#bae7ff' : '';
            return;
        }
        
        const oldHTML = cell.innerHTML;
        const { persons: oldPersons, hasAnnotation } = parseCellContent(cell.textContent);
        const row = cell.closest('tr');
        const shiftHour = row.dataset.hour ? parseFloat(row.dataset.hour) : 0;
        const shiftDayKey = cell.dataset.shiftDay;

        // 检查是否已达最大人数
        if (oldPersons.length >= MAX_PERSON_PER_CELL) {
            alert(`⚠️ 提示：每个单元格最多只能添加${MAX_PERSON_PER_CELL}人！`);
            // 恢复单元格样式
            cell.style.backgroundColor = activeCell === cell ? '#bae7ff' : '';
            return;
        }

        // 检查重复排班（跨区域的同一班次+日期）
        if (checkDuplicateSchedule(shiftDayKey, draggedName)) {
            // 恢复单元格样式
            cell.style.backgroundColor = activeCell === cell ? '#bae7ff' : '';
            return; // 阻止重复排班
        }

        // 保存操作前状态
        saveState('drop', cell, oldHTML, '', shiftHour);

        // 新增：拖拽是追加人员，不是替换
        const newPersons = [...oldPersons, draggedName];

        // 格式化新内容
        const newHTML = formatCellContent(newPersons, hasAnnotation);
        cell.innerHTML = newHTML;
        
        // 更新历史记录中的新值
        operationHistory[operationHistory.length - 1].newValue = newHTML;
        
        // 更新排班记录
        updateScheduleRecords(shiftDayKey, [], [draggedName]);

        // 恢复样式
        cell.style.backgroundColor = activeCell === cell ? '#bae7ff' : '';

        // 重新计算工时统计
        recalculateHourStats();
    });

    // 手动编辑事件（支持多人）
    cell.addEventListener('blur', () => {
        // 仅处理排班单元格（有data-shift-day属性）
        if (!cell.dataset.shiftDay) {
            cell.dataset.oldHTML = cell.innerHTML;
            return;
        }

        const newHTML = cell.innerHTML;
        const oldHTML = cell.dataset.oldHTML ? cell.dataset.oldHTML : '';

        // 直接从 span 元素提取人名
        let newPersonItems = cell.querySelectorAll('.person-item');
        let newPersons = Array.from(newPersonItems).map(span => span.textContent.trim()).filter(p => p);
        const newAnnotation = cell.querySelector('.annotation-text') !== null;

        // 如果没有 span，检查是否有纯文本（用户直接输入）
        if (newPersons.length === 0) {
            const textContent = cell.textContent.trim();
            if (textContent) {
                // 用户直接输入了文字，将其作为单个人处理
                newPersons = [textContent];
            }
        }

        // 解析旧的 HTML
        let oldPersons = [];
        let oldAnnotation = false;
        if (oldHTML) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = oldHTML;
            const oldItems = tempDiv.querySelectorAll('.person-item');
            oldPersons = Array.from(oldItems).map(span => span.textContent.trim()).filter(p => p);
            oldAnnotation = tempDiv.querySelector('.annotation-text') !== null;

            // 如果旧内容也没有 span，检查纯文本
            if (oldPersons.length === 0) {
                const oldText = oldHTML.replace(/<[^>]*>/g, '').trim();
                if (oldText) {
                    oldPersons = [oldText];
                }
            }
        }

        // 内容未变化则返回
        if (JSON.stringify(newPersons) === JSON.stringify(oldPersons) && newAnnotation === oldAnnotation) return;

        // 检查周次是否已填写
        if (!checkWeekFilled()) {
            cell.innerHTML = oldHTML; // 恢复原内容
            cell.dataset.oldHTML = oldHTML;
            return;
        }

        const row = cell.closest('tr');
        const shiftHour = row.dataset.hour ? parseFloat(row.dataset.hour) : 0;
        const shiftDayKey = cell.dataset.shiftDay;

        // 检查新人员是否重复排班
        let isDuplicate = false;
        newPersons.forEach(person => {
            // 排除原本就有的人员
            if (!oldPersons.includes(person) && checkDuplicateSchedule(shiftDayKey, person)) {
                isDuplicate = true;
            }
        });

        if (isDuplicate) {
            cell.innerHTML = oldHTML; // 恢复原内容
            cell.dataset.oldHTML = oldHTML;
            return; // 阻止重复排班
        }

        // 检查是否超过最大人数
        if (newPersons.length > MAX_PERSON_PER_CELL) {
            alert(`⚠️ 提示：每个单元格最多只能添加${MAX_PERSON_PER_CELL}人！`);
            cell.innerHTML = oldHTML; // 恢复原内容
            cell.dataset.oldHTML = oldHTML;
            return;
        }

        // 保存操作前状态
        saveState('edit', cell, oldHTML, newHTML, shiftHour);

        // 更新排班记录
        updateScheduleRecords(shiftDayKey, oldPersons, newPersons);

        // 格式化显示
        cell.innerHTML = formatCellContent(newPersons, newAnnotation);

        // 重新计算工时统计
        recalculateHourStats();

        cell.dataset.oldHTML = cell.innerHTML;
    });

    cell.addEventListener('focus', () => {
        cell.dataset.oldHTML = cell.innerHTML;
    });
    
    // 退格键删除最后一个人名
    cell.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && cell.dataset.shiftDay) {
            e.preventDefault();
            e.stopPropagation();

            // 检查周次是否已填写
            if (!checkWeekFilled()) {
                return;
            }

            const oldHTML = cell.innerHTML;

            // 获取所有 person-item span
            const personItems = cell.querySelectorAll('.person-item');
            const oldPersons = Array.from(personItems).map(span => span.textContent.trim()).filter(p => p);

            // 检查是否有批注
            const hasAnnotation = cell.querySelector('.annotation-text') !== null;

            // 如果没有 span，检查是否有纯文本
            if (oldPersons.length === 0) {
                const textContent = cell.textContent.trim();
                if (textContent) {
                    // 纯文本模式：直接清空
                    const row = cell.closest('tr');
                    const shiftHour = row && row.dataset.hour ? parseFloat(row.dataset.hour) : 0;
                    const shiftDayKey = cell.dataset.shiftDay;

                    saveState('backspace', cell, oldHTML, '', shiftHour);
                    updateScheduleRecords(shiftDayKey, [textContent], []);
                    cell.innerHTML = formatCellContent([], hasAnnotation);
                    recalculateHourStats();
                }
                return;
            }

            // 有 span 模式：移除最后一个 span
            const removedPerson = oldPersons[oldPersons.length - 1];
            const row = cell.closest('tr');
            const shiftHour = row && row.dataset.hour ? parseFloat(row.dataset.hour) : 0;
            const shiftDayKey = cell.dataset.shiftDay;

            saveState('backspace', cell, oldHTML, '', shiftHour);
            updateScheduleRecords(shiftDayKey, [removedPerson], []);

            // 只保留剩余的人，重新格式化
            const remainingPersons = oldPersons.slice(0, -1);
            cell.innerHTML = formatCellContent(remainingPersons, hasAnnotation);

            recalculateHourStats();

            if (operationHistory.length > 0) {
                operationHistory[operationHistory.length - 1].newValue = cell.innerHTML;
            }
        }
    });
});

// 监听拖拽标签事件
document.querySelectorAll('.draggable-tag').forEach(tag => {
    tag.addEventListener('dragstart', (e) => {
        draggedName = e.target.dataset.name;
        e.dataTransfer.setData('text/plain', draggedName);
        e.target.style.opacity = '0.6';
    });

    tag.addEventListener('dragend', (e) => {
        e.target.style.opacity = '1';
    });
});

// 添加「（有）」批注功能
document.getElementById('add-annotation').addEventListener('click', () => {
    if (activeCell) {
        // 检查周次是否已填写
        if (!checkWeekFilled()) {
            return;
        }
        
        const oldHTML = activeCell.innerHTML;
        const textContent = activeCell.textContent.trim();
        const { persons, hasAnnotation } = parseCellContent(textContent);
        
        if (!hasAnnotation) {
            // 保存操作前状态
            saveState('annotation', activeCell, oldHTML, '');
            
            // 格式化新内容
            const newHTML = formatCellContent(persons, true);
            activeCell.innerHTML = newHTML;
            
            // 更新历史记录中的新值
            operationHistory[operationHistory.length - 1].newValue = newHTML;
        }
    } else {
        showToast('请先点击需要添加批注的单元格！');
    }
});

// 移除批注功能
document.getElementById('remove-annotation').addEventListener('click', () => {
    if (activeCell) {
        // 检查周次是否已填写
        if (!checkWeekFilled()) {
            return;
        }
        
        const oldHTML = activeCell.innerHTML;
        const textContent = activeCell.textContent.trim();
        const { persons, hasAnnotation } = parseCellContent(textContent);
        
        if (hasAnnotation) {
            // 保存操作前状态
            saveState('annotation', activeCell, oldHTML, '');
            
            // 格式化新内容
            const newHTML = formatCellContent(persons, false);
            activeCell.innerHTML = newHTML;
            
            // 更新历史记录中的新值
            operationHistory[operationHistory.length - 1].newValue = newHTML;
        }
    } else {
        showToast('请先点击需要移除批注的单元格！');
    }
});

// 撤回按钮点击事件
document.getElementById('undo-btn').addEventListener('click', undoLastOperation);

// 一键清空表格
document.getElementById('clear-btn').addEventListener('click', () => {
    if (confirm('确定要清空整个排班表吗？此操作不可撤销！')) {
        // 保存当前状态到历史记录
        const cells = document.querySelectorAll('td[contenteditable="true"][data-shift-day]');
        cells.forEach(cell => {
            if (cell.innerHTML.trim()) {
                saveState('clear', cell, cell.innerHTML, '');
                cell.innerHTML = '';
            }
        });
        
        // 清空排班记录
        Object.keys(scheduleRecords).forEach(key => delete scheduleRecords[key]);
        
        // 重置工时统计
        allWorkers.forEach(worker => {
            hourStats[worker] = 0;
        });
        
        // 更新工时显示
        updateWorkHourDisplay();
        
        // 更新撤回按钮状态
        undoBtn.disabled = operationHistory.length === 0;
        
        showToast('排班表已清空！');
    }
});

// 保存到服务器
document.getElementById('save-btn').addEventListener('click', async () => {
    try {
        // 获取当前周数
        const weekValue = document.getElementById('weekCell').textContent.trim() || '第一周';

        // 收集排班数据
        const schedule_data = [];
        document.querySelectorAll('td[contenteditable="true"][data-shift-day]').forEach(cell => {
            const shift_day = cell.dataset.shiftDay;
            // 直接从 span 提取人名
            const personItems = cell.querySelectorAll('.person-item');
            const persons = Array.from(personItems).map(span => span.textContent.trim()).filter(p => p);
            const hasAnnotation = cell.querySelector('.annotation-text') !== null;

            if (persons.length > 0 || hasAnnotation) {
                schedule_data.push({
                    shift_day: shift_day,
                    persons: persons.join(','),
                    has_annotation: hasAnnotation,
                    area: ''
                });
            }
        });

        // 调用后端保存接口
        const res = await fetch(`/api/save-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schedule_data: schedule_data,
                hour_stats: hourStats,
                week: weekValue
            })
        });

        const data = await res.json();
        if (data.code === 200) {
            showToast('保存成功！');
        } else {
            showToast('保存失败：' + data.msg);
        }
    } catch (error) {
        console.error('保存失败：', error);
        showToast('保存失败，请检查网络连接！');
    }
});

// 从服务器加载（先展示周次选择）
document.getElementById('load-btn').addEventListener('click', async () => {
    try {
        const res = await fetch(`/api/list-weeks`);
        const data = await res.json();
        if (data.code === 200) {
            const weeks = data.data;
            if (weeks.length === 0) {
                showToast('服务器暂无保存的排班数据！');
                return;
            }
            const weekSelectList = document.getElementById('weekSelectList');
            weekSelectList.innerHTML = weeks.map(week =>
                `<div class="week-select-item">
                    <span class="week-text" onclick="loadWeekSchedule('${week}')">${week}</span>
                    <button class="delete-week-btn" onclick="deleteWeekSchedule('${week}')">删除</button>
                </div>`
            ).join('');
            showModal(document.getElementById('weekSelectModal'));
        } else {
            showToast('获取周次列表失败：' + data.msg);
        }
    } catch (error) {
        console.error('获取周次列表失败：', error);
        showToast('加载失败，请检查网络连接！');
    }
});

// 按周次加载排班数据
window.loadWeekSchedule = async function(week) {
    hideModal(document.getElementById('weekSelectModal'));
    try {
        const res = await fetch(`/api/load-schedule?week=${encodeURIComponent(week)}`);
        const data = await res.json();

        console.log('加载的数据:', data);

        if (data.code === 200) {
            if (!data.data) {
                showToast('该周次暂无数据');
                return;
            }

            const { schedule_data, hour_stats } = data.data;

            // 清空当前数据
            document.querySelectorAll('td[contenteditable="true"][data-shift-day]').forEach(cell => {
                cell.innerHTML = '';
            });

            // 清空排班记录
            Object.keys(scheduleRecords).forEach(key => delete scheduleRecords[key]);

            if (!Array.isArray(schedule_data)) {
                showToast('加载失败：排班数据格式错误');
                return;
            }

            // 加载新数据
            schedule_data.forEach(item => {
                let shiftDay = item.shift_day;
                const parts = shiftDay.split('-');
                if (parts.length === 2) {
                    shiftDay = `期刊-${shiftDay}`;
                }

                const cells = document.querySelectorAll(`td[data-shift-day="${shiftDay}"]`);
                cells.forEach(cell => {
                    const persons = item.persons ? item.persons.split(',') : [];
                    const hasAnnotation = item.has_annotation === 1 || item.has_annotation === true || item.has_annotation === "1";
                    cell.innerHTML = formatCellContent(persons, hasAnnotation);
                    updateScheduleRecords(shiftDay, [], persons);
                });
            });

            // 恢复周数显示
            if (data.data.week) {
                document.getElementById('weekCell').textContent = data.data.week;
            }

            // 重新计算工时统计
            if (hour_stats && Object.keys(hour_stats).length > 0) {
                allWorkers.forEach(worker => {
                    hourStats[worker] = hour_stats[worker] || 0;
                });
            } else {
                recalculateHourStats();
            }

            updateWorkHourDisplay();

            operationHistory = [];
            undoBtn.disabled = true;

            showToast(`已加载【${week}】排班数据！`);
        } else {
            showToast('加载失败：' + data.msg);
        }
    } catch (error) {
        console.error('加载失败：', error);
        showToast('加载失败，请检查网络连接！');
    }
};

// 删除周次排班数据
window.deleteWeekSchedule = async function(week) {
    if (!confirm(`确定要删除【${week}】的排班数据吗？此操作不可恢复！`)) {
        return;
    }
    
    try {
        const res = await fetch(`/api/delete-schedule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ week: week })
        });
        const data = await res.json();
        
        if (data.code === 200) {
            showToast(`已删除【${week}】的排班数据！`);
            // 重新加载周次列表
            const loadBtn = document.getElementById('load-btn');
            if (loadBtn) {
                loadBtn.click();
            }
        } else {
            showToast('删除失败：' + data.msg);
        }
    } catch (error) {
        console.error('删除周次数据失败：', error);
        showToast('删除失败，请检查网络连接！');
    }
};

// 重新计算工时统计（根据实际排班数据）
function recalculateHourStats() {
    allWorkers.forEach(worker => {
        hourStats[worker] = 0;
    });

    document.querySelectorAll('td[contenteditable="true"][data-shift-day]').forEach(cell => {
        const shiftDayKey = cell.dataset.shiftDay;
        if (!shiftDayKey) return;

        const row = cell.closest('tr');
        const shiftHour = row && row.dataset.hour ? parseFloat(row.dataset.hour) : 0;

        if (shiftHour > 0) {
            // 直接从 span 元素中提取人名，而不是从 textContent
            const personItems = cell.querySelectorAll('.person-item');
            const persons = Array.from(personItems).map(span => span.textContent.trim()).filter(p => p);

            persons.forEach(person => {
                if (hourStats[person] !== undefined) {
                    hourStats[person] += shiftHour;
                }
            });
        }
    });

    updateWorkHourDisplay();
}

// 更新工时显示
function updateWorkHourDisplay() {
    const workHourList = document.getElementById('work-hour-list');
    if (!workHourList) return;
    
    let html = '';
    
    const sortedWorkers = Object.entries(hourStats)
        .sort((a, b) => b[1] - a[1]);
    
    sortedWorkers.forEach(([name, hours]) => {
        const isOverLimit = hours >= HOUR_THRESHOLD;
        html += `<div class="work-hour-item ${isOverLimit ? 'over-limit' : ''}">
            ${name}：${hours.toFixed(1)}小时
        </div>`;
    });
    
    workHourList.innerHTML = html;
}

// 快捷键支持（Ctrl+Z 撤回）
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undoLastOperation();
    }
});

// 返回主页面
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '/book/index.html';
});

// 初始化工时显示
updateWorkHourDisplay();

// 显示弹窗
function showModal(modal) {
    modal.classList.add('show');
}

// 隐藏弹窗
function hideModal(modal) {
    modal.classList.remove('show');
}

// 渲染图片预览列表
function renderImagePreview(previewDiv, imageUrls, newFiles, type) {
    let html = '';
    
    // 显示已有的图片URL
    imageUrls.forEach((url, index) => {
        html += `
            <div class="image-preview-item" data-url="${url}" data-type="existing">
                <img src="${url}" alt="预览">
                <button class="remove-btn" onclick="removeImage('${type}', ${index}, 'existing')">×</button>
            </div>
        `;
    });
    
    previewDiv.innerHTML = html;
    
    // 异步加载新文件预览
    newFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const itemHtml = `
                <div class="image-preview-item" data-index="${index}" data-type="new">
                    <img src="${e.target.result}" alt="预览">
                    <button class="remove-btn" onclick="removeImage('${type}', ${index}, 'new')">×</button>
                </div>
            `;
            previewDiv.insertAdjacentHTML('beforeend', itemHtml);
        };
        reader.readAsDataURL(file);
    });
}

// 删除服务器上的图片文件
async function deleteServerImage(imageUrl) {
    try {
        const response = await fetch(`/api/delete-image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageUrl: imageUrl })
        });
        const result = await response.json();
        if (result.code === 200) {
            console.log('服务器图片删除成功:', imageUrl);
        } else {
            console.error('服务器图片删除失败:', result.msg);
        }
    } catch (error) {
        console.error('删除服务器图片请求失败:', error);
    }
}

// 删除图片
window.removeImage = async function(type, index, imageType) {
    if (type === 'notice') {
        if (imageType === 'existing') {
            // 删除服务器上的文件
            const imageUrl = noticeImageUrls[index];
            if (imageUrl) {
                await deleteServerImage(imageUrl);
            }
            noticeImageUrls.splice(index, 1);
        } else {
            noticeNewFiles.splice(index, 1);
        }
        renderImagePreview(noticeImagePreview, noticeImageUrls, noticeNewFiles, 'notice');
    } else {
        if (imageType === 'existing') {
            // 删除服务器上的文件
            const imageUrl = activityImageUrls[index];
            if (imageUrl) {
                await deleteServerImage(imageUrl);
            }
            activityImageUrls.splice(index, 1);
        } else {
            activityNewFiles.splice(index, 1);
        }
        renderImagePreview(activityImagePreview, activityImageUrls, activityNewFiles, 'activity');
    }
};

// 图片选择处理
function handleImageSelect(input, type) {
    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (type === 'notice') {
            noticeNewFiles = noticeNewFiles.concat(files);
            renderImagePreview(noticeImagePreview, noticeImageUrls, noticeNewFiles, 'notice');
        } else {
            activityNewFiles = activityNewFiles.concat(files);
            renderImagePreview(activityImagePreview, activityImageUrls, activityNewFiles, 'activity');
        }
        input.value = ''; // 清空input，允许重复选择同一文件
    });
}

// 加载公告数据
async function loadNoticeForEdit() {
    try {
        const response = await fetch(`/api/notice`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            noticeText.value = result.data.text || '';
            noticeImageUrls = result.data.images || (result.data.image ? [result.data.image] : []);
            noticeNewFiles = [];
            renderImagePreview(noticeImagePreview, noticeImageUrls, noticeNewFiles, 'notice');
        }
    } catch (error) {
        console.error('加载公告失败:', error);
    }
}

// 加载活动数据
async function loadActivityForEdit() {
    try {
        const response = await fetch(`/api/activity`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            activityText.value = result.data.text || '';
            activityImageUrls = result.data.images || (result.data.image ? [result.data.image] : []);
            activityNewFiles = [];
            renderImagePreview(activityImagePreview, activityImageUrls, activityNewFiles, 'activity');
        }
    } catch (error) {
        console.error('加载活动失败:', error);
    }
}

// 保存公告
async function saveNotice() {
    try {
        const formData = new FormData();
        formData.append('text', noticeText.value);
        
        // 添加已有的图片URL（JSON字符串）
        formData.append('existingImages', JSON.stringify(noticeImageUrls));
        
        // 添加新上传的图片文件
        noticeNewFiles.forEach((file, index) => {
            formData.append('images', file);
        });
        
        const response = await fetch('/api/notice', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.code === 200) {
            showToast('公告保存成功！');
            hideModal(noticeEditModal);
        } else {
            showToast('保存失败：' + result.msg);
        }
    } catch (error) {
        console.error('保存公告失败:', error);
        showToast('保存失败，请检查网络连接！');
    }
}

// 保存活动
async function saveActivity() {
    try {
        const formData = new FormData();
        formData.append('text', activityText.value);
        
        // 添加已有的图片URL（JSON字符串）
        formData.append('existingImages', JSON.stringify(activityImageUrls));
        
        // 添加新上传的图片文件
        activityNewFiles.forEach((file, index) => {
            formData.append('images', file);
        });
        
        const response = await fetch('/api/activity', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.code === 200) {
            showToast('活动保存成功！');
            hideModal(activityEditModal);
        } else {
            showToast('保存失败：' + result.msg);
        }
    } catch (error) {
        console.error('保存活动失败:', error);
        showToast('保存失败，请检查网络连接！');
    }
}

// 初始化负责书架和巡查表编辑功能
function initShelfInspectEditor(editShelfBtn, editInspectBtn) {
    // 负责书架编辑按钮事件
    if (editShelfBtn) {
        editShelfBtn.addEventListener('click', async () => {
            await loadShelfForEdit();
            showModal(shelfEditModal);
        });
    }

    if (saveShelfBtn) {
        saveShelfBtn.addEventListener('click', saveShelf);
    }

    if (cancelShelfBtn) {
        cancelShelfBtn.addEventListener('click', () => {
            hideModal(shelfEditModal);
            shelfText.value = '';
            shelfImage.value = '';
            shelfImagePreview.innerHTML = '';
        });
    }

    if (shelfImage) {
        shelfImage.addEventListener('change', (e) => {
            shelfNewFiles = Array.from(e.target.files);
            renderImagePreview(shelfImagePreview, shelfImageUrls, shelfNewFiles, 'shelf');
        });
    }

    // 巡查表编辑按钮事件
    if (editInspectBtn) {
        editInspectBtn.addEventListener('click', async () => {
            await loadInspectForEdit();
            showModal(inspectEditModal);
        });
    }

    if (saveInspectBtn) {
        saveInspectBtn.addEventListener('click', saveInspect);
    }

    if (cancelInspectBtn) {
        cancelInspectBtn.addEventListener('click', () => {
            hideModal(inspectEditModal);
            inspectText.value = '';
            inspectImage.value = '';
            inspectImagePreview.innerHTML = '';
        });
    }

    if (inspectImage) {
        inspectImage.addEventListener('change', (e) => {
            inspectNewFiles = Array.from(e.target.files);
            renderImagePreview(inspectImagePreview, inspectImageUrls, inspectNewFiles, 'inspect');
        });
    }
}

// 加载负责书架数据
async function loadShelfForEdit() {
    try {
        const response = await fetch(`/api/shelf`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            shelfText.value = result.data.text || '';
            shelfImageUrls = result.data.images || (result.data.image ? [result.data.image] : []);
            shelfNewFiles = [];
            renderImagePreview(shelfImagePreview, shelfImageUrls, shelfNewFiles, 'shelf');
        }
    } catch (error) {
        console.error('加载负责书架失败:', error);
    }
}

// 加载巡查表数据
async function loadInspectForEdit() {
    try {
        const response = await fetch(`/api/inspect`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            inspectText.value = result.data.text || '';
            inspectImageUrls = result.data.images || (result.data.image ? [result.data.image] : []);
            inspectNewFiles = [];
            renderImagePreview(inspectImagePreview, inspectImageUrls, inspectNewFiles, 'inspect');
        }
    } catch (error) {
        console.error('加载巡查表失败:', error);
    }
}

// 保存负责书架
async function saveShelf() {
    try {
        const formData = new FormData();
        formData.append('text', shelfText.value);
        
        // 添加已有的图片URL（JSON字符串）
        formData.append('existingImages', JSON.stringify(shelfImageUrls));
        
        // 添加新上传的图片文件
        shelfNewFiles.forEach((file, index) => {
            formData.append('images', file);
        });
        
        const response = await fetch('/api/shelf', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.code === 200) {
            showToast('负责书架保存成功！');
            hideModal(shelfEditModal);
        } else {
            showToast('保存失败：' + result.msg);
        }
    } catch (error) {
        console.error('保存负责书架失败:', error);
        showToast('保存失败，请检查网络连接！');
    }
}

// 保存巡查表
async function saveInspect() {
    try {
        const formData = new FormData();
        formData.append('text', inspectText.value);
        
        // 添加已有的图片URL（JSON字符串）
        formData.append('existingImages', JSON.stringify(inspectImageUrls));
        
        // 添加新上传的图片文件
        inspectNewFiles.forEach((file, index) => {
            formData.append('images', file);
        });
        
        const response = await fetch('/api/inspect', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.code === 200) {
            showToast('巡查表保存成功！');
            hideModal(inspectEditModal);
        } else {
            showToast('保存失败：' + result.msg);
        }
    } catch (error) {
        console.error('保存巡查表失败:', error);
        showToast('保存失败，请检查网络连接！');
    }
}

// 公告编辑变量
let noticeImageUrls = []; // 存储已有的图片URL
let noticeNewFiles = [];  // 存储新选择的文件

// 活动编辑变量
let activityImageUrls = []; // 存储已有的图片URL
let activityNewFiles = [];  // 存储新选择的文件

// 负责书架编辑变量
let shelfText;
let shelfImage;
let shelfImagePreview;
let shelfEditModal;
let saveShelfBtn;
let cancelShelfBtn;
let shelfImageUrls = []; // 存储已有的图片URL
let shelfNewFiles = [];  // 存储新选择的文件

// 巡查表编辑变量
let inspectText;
let inspectImage;
let inspectImagePreview;
let inspectEditModal;
let saveInspectBtn;
let cancelInspectBtn;
let inspectImageUrls = []; // 存储已有的图片URL
let inspectNewFiles = [];  // 存储新选择的文件

// 公告编辑DOM元素
let noticeEditModal;
let editNoticeBtn;
let saveNoticeBtn;
let cancelNoticeBtn;
let noticeText;
let noticeImage;
let noticeImagePreview;

// 活动编辑DOM元素
let activityEditModal;
let editActivityBtn;
let saveActivityBtn;
let cancelActivityBtn;
let activityText;
let activityImage;
let activityImagePreview;

// 链接管理DOM元素
let linkManageModal;
let linkManageBtn;
let saveLinkBtn;
let cancelLinkBtn;
let checkinUrlInput;
let activityCheckinUrlInput;
let activityCheckoutUrlInput;
let bookSearchUrlInput;

// ==================== 公告和活动编辑功能 ====================

// 等待DOM加载完成后再初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化DOM元素
    noticeEditModal = document.getElementById('noticeEditModal');
    editNoticeBtn = document.getElementById('edit-notice-btn');
    saveNoticeBtn = document.getElementById('saveNoticeBtn');
    cancelNoticeBtn = document.getElementById('cancelNoticeBtn');
    noticeText = document.getElementById('noticeText');
    noticeImage = document.getElementById('noticeImage');
    noticeImagePreview = document.getElementById('noticeImagePreview');

    activityEditModal = document.getElementById('activityEditModal');
    editActivityBtn = document.getElementById('edit-activity-btn');
    saveActivityBtn = document.getElementById('saveActivityBtn');
    cancelActivityBtn = document.getElementById('cancelActivityBtn');
    activityText = document.getElementById('activityText');
    activityImage = document.getElementById('activityImage');
    activityImagePreview = document.getElementById('activityImagePreview');

    // 初始化负责书架编辑DOM元素
    shelfEditModal = document.getElementById('shelfEditModal');
    const editShelfBtn = document.getElementById('edit-shelf-btn');
    saveShelfBtn = document.getElementById('saveShelfBtn');
    cancelShelfBtn = document.getElementById('cancelShelfBtn');
    shelfText = document.getElementById('shelfText');
    shelfImage = document.getElementById('shelfImage');
    shelfImagePreview = document.getElementById('shelfImagePreview');

    // 初始化巡查表编辑DOM元素
    inspectEditModal = document.getElementById('inspectEditModal');
    const editInspectBtn = document.getElementById('edit-inspect-btn');
    saveInspectBtn = document.getElementById('saveInspectBtn');
    cancelInspectBtn = document.getElementById('cancelInspectBtn');
    inspectText = document.getElementById('inspectText');
    inspectImage = document.getElementById('inspectImage');
    inspectImagePreview = document.getElementById('inspectImagePreview');

    initNoticeActivityEditor();
    initShelfInspectEditor(editShelfBtn, editInspectBtn);
    initUserManage();

    // 周次选择弹窗取消按钮
    document.getElementById('cancelWeekSelectBtn').addEventListener('click', () => {
        hideModal(document.getElementById('weekSelectModal'));
    });

    // 初始化链接管理功能
    initLinkManage();
});

function initNoticeActivityEditor() {
    // 公告编辑按钮事件
    if (editNoticeBtn) {
        editNoticeBtn.addEventListener('click', async () => {
            await loadNoticeForEdit();
            showModal(noticeEditModal);
        });
    }

    if (saveNoticeBtn) {
        saveNoticeBtn.addEventListener('click', saveNotice);
    }

    if (cancelNoticeBtn) {
        cancelNoticeBtn.addEventListener('click', () => {
            hideModal(noticeEditModal);
            noticeText.value = '';
            noticeImage.value = '';
            noticeImagePreview.innerHTML = '';
        });
    }

    // 活动编辑按钮事件
    if (editActivityBtn) {
        editActivityBtn.addEventListener('click', async () => {
            await loadActivityForEdit();
            showModal(activityEditModal);
        });
    }

    if (saveActivityBtn) {
        saveActivityBtn.addEventListener('click', saveActivity);
    }

    if (cancelActivityBtn) {
        cancelActivityBtn.addEventListener('click', () => {
            hideModal(activityEditModal);
            activityText.value = '';
            activityImage.value = '';
            activityImagePreview.innerHTML = '';
        });
    }

    if (noticeImage && noticeImagePreview) {
        handleImageSelect(noticeImage, 'notice');
    }

    if (activityImage && activityImagePreview) {
        handleImageSelect(activityImage, 'activity');
    }
} // initNoticeActivityEditor函数结束

// 人员管理功能
let currentEditingUserId = null;

function initUserManage() {
    const userManageBtn = document.getElementById('user-manage-btn');
    const userManageModal = document.getElementById('userManageModal');
    const closeUserManageBtn = document.getElementById('closeUserManageBtn');
    const addUserBtn = document.getElementById('addUserBtn');
    const userEditModal = document.getElementById('userEditModal');
    const saveUserEditBtn = document.getElementById('saveUserEditBtn');
    const cancelUserEditBtn = document.getElementById('cancelUserEditBtn');

    if (userManageBtn) {
        userManageBtn.addEventListener('click', () => {
            loadUserList();
            showModal(userManageModal);
        });
    }

    if (closeUserManageBtn) {
        closeUserManageBtn.addEventListener('click', () => {
            hideModal(userManageModal);
        });
    }

    if (addUserBtn) {
        addUserBtn.addEventListener('click', () => {
            currentEditingUserId = null;
            document.getElementById('userEditModalTitle').textContent = '添加用户';
            document.getElementById('userEditName').value = '';
            document.getElementById('userEditUsername').value = '';
            document.getElementById('userEditPassword').value = '';
            document.getElementById('userEditPasswordItem').style.display = 'block';
            document.getElementById('userEditRole').value = 'employee';
            showModal(userEditModal);
        });
    }

    if (saveUserEditBtn) {
        saveUserEditBtn.addEventListener('click', saveUser);
    }

    if (cancelUserEditBtn) {
        cancelUserEditBtn.addEventListener('click', () => {
            hideModal(userEditModal);
        });
    }
}

// 初始化链接管理功能
function initLinkManage() {
    // 初始化DOM元素
    linkManageModal = document.getElementById('linkManageModal');
    linkManageBtn = document.getElementById('link-manage-btn');
    saveLinkBtn = document.getElementById('saveLinkBtn');
    cancelLinkBtn = document.getElementById('cancelLinkBtn');
    checkinUrlInput = document.getElementById('checkinUrl');
    activityCheckinUrlInput = document.getElementById('activityCheckinUrl');
    activityCheckoutUrlInput = document.getElementById('activityCheckoutUrl');
    bookSearchUrlInput = document.getElementById('bookSearchUrl');

    if (linkManageBtn) {
        linkManageBtn.addEventListener('click', async () => {
            await loadLinkData();
            showModal(linkManageModal);
        });
    }

    if (saveLinkBtn) {
        saveLinkBtn.addEventListener('click', saveLinkData);
    }

    if (cancelLinkBtn) {
        cancelLinkBtn.addEventListener('click', () => {
            hideModal(linkManageModal);
        });
    }
}

// 加载链接数据
async function loadLinkData() {
    try {
        const response = await fetch(`/api/links`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            const links = result.data;
            checkinUrlInput.value = links.checkinUrl || '';
            activityCheckinUrlInput.value = links.activityCheckinUrl || '';
            activityCheckoutUrlInput.value = links.activityCheckoutUrl || '';
            bookSearchUrlInput.value = links.bookSearchUrl || '';
        }
    } catch (error) {
        console.error('加载链接数据失败:', error);
    }
}

// 保存链接数据
async function saveLinkData() {
    try {
        const links = {
            checkinUrl: checkinUrlInput.value.trim(),
            activityCheckinUrl: activityCheckinUrlInput.value.trim(),
            activityCheckoutUrl: activityCheckoutUrlInput.value.trim(),
            bookSearchUrl: bookSearchUrlInput.value.trim()
        };

        const response = await fetch('/api/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(links)
        });

        const result = await response.json();
        if (result.code === 200) {
            showToast('链接保存成功！');
            hideModal(linkManageModal);
        } else {
            showToast('保存失败：' + result.msg);
        }
    } catch (error) {
        console.error('保存链接失败:', error);
        showToast('保存失败，请检查网络连接！');
    }
}

async function loadUserList() {
    try {
        const response = await fetch(`/api/users`);
        const result = await response.json();
        
        if (result.code === 200) {
            renderUserList(result.data);
        } else {
            showToast('加载用户列表失败：' + result.msg);
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
        showToast('加载用户列表失败，请检查网络连接！');
    }
}

function renderUserList(users) {
    const userListBody = document.getElementById('userListBody');
    if (!userListBody) return;
    
    userListBody.innerHTML = users.map((user, index) => `
        <div class="user-list-row">
            <span>${index + 1}</span>
            <span>${user.name}</span>
            <span>${user.username}</span>
            <span>${user.role === 'admin' ? '管理员' : '员工'}</span>
            <div class="user-actions">
                <button class="user-action-btn edit" onclick="editUser(${user.id})">编辑</button>
                <button class="user-action-btn reset" onclick="resetUserPassword(${user.id})">重置密码</button>
                <button class="user-action-btn delete" onclick="deleteUser(${user.id})">删除</button>
            </div>
        </div>
    `).join('');
}

window.editUser = function(userId) {
    currentEditingUserId = userId;
    document.getElementById('userEditModalTitle').textContent = '编辑用户';
    document.getElementById('userEditPasswordItem').style.display = 'none';
    
    fetch(`/api/users/${userId}`)
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                document.getElementById('userEditName').value = result.data.name;
                document.getElementById('userEditUsername').value = result.data.username;
                document.getElementById('userEditRole').value = result.data.role;
                showModal(document.getElementById('userEditModal'));
            } else {
                showToast('获取用户信息失败：' + result.msg);
            }
        })
        .catch(error => {
            console.error('获取用户信息失败:', error);
            showToast('获取用户信息失败，请检查网络连接！');
        });
};

window.resetUserPassword = function(userId) {
    if (!confirm('确定要将密码重置为 123456 吗？')) return;
    
    fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                showToast('密码重置成功！');
            } else {
                showToast('重置密码失败：' + result.msg);
            }
        })
        .catch(error => {
            console.error('重置密码失败:', error);
            showToast('重置密码失败，请检查网络连接！');
        });
};

window.deleteUser = function(userId) {
    if (!confirm('确定要删除该用户吗？')) return;
    
    fetch(`/api/users/${userId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                showToast('删除成功！');
                loadUserList();
            } else {
                showToast('删除失败：' + result.msg);
            }
        })
        .catch(error => {
            console.error('删除用户失败:', error);
            showToast('删除用户失败，请检查网络连接！');
        });
};

async function saveUser() {
    const name = document.getElementById('userEditName').value.trim();
    const username = document.getElementById('userEditUsername').value.trim();
    const password = document.getElementById('userEditPassword').value;
    const role = document.getElementById('userEditRole').value;
    
    if (!name || !username) {
        showToast('请填写姓名和账号！');
        return;
    }
    
    if (!currentEditingUserId && !password) {
        showToast('添加用户时请填写密码！');
        return;
    }
    
    try {
        const url = currentEditingUserId 
            ? `/api/users/${currentEditingUserId}`
            : `/api/users`;
        
        const method = currentEditingUserId ? 'PUT' : 'POST';
        
        const data = { name, username, role };
        if (!currentEditingUserId) {
            data.password = password;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.code === 200) {
            showToast(currentEditingUserId ? '更新成功！' : '添加成功！');
            hideModal(document.getElementById('userEditModal'));
            loadUserList();
        } else {
            showToast('保存失败：' + result.msg);
        }
    } catch (error) {
        console.error('保存用户失败:', error);
        showToast('保存用户失败，请检查网络连接！');
    }
}
