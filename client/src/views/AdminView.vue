<template>
  <main class="app-shell admin-shell legacy-admin-page">
    <header class="topbar legacy-admin-header">
      <div>
        <p class="eyebrow">Management</p>
        <h1>管理端</h1>
      </div>
      <div class="top-actions legacy-admin-actions">
        <el-button @click="router.push('/book')">
          <el-icon><Back /></el-icon>
          返回主页
        </el-button>
        <el-button type="danger" plain @click="logout">退出</el-button>
      </div>
    </header>

    <section class="admin-toolbar legacy-admin-toolbar">
      <span class="legacy-admin-toolbar-label">快速批注：</span>
      <el-button class="legacy-admin-annotation-add" :disabled="!selectedCell" @click="selectedAnnotation = true">（有）</el-button>
      <el-button class="legacy-admin-annotation-remove" :disabled="!selectedCell" @click="selectedAnnotation = false">移除批注</el-button>
      <span class="legacy-admin-toolbar-hint">点击单元格后，可添加/移除「（有）」批注 | 支持撤回 | 每个单元格最多添加2人</span>
      <el-button type="warning" :disabled="!undoStack.length" @click="undo">撤回上一步操作</el-button>
      <el-button @click="clearSchedule">一键清空表格</el-button>
      <el-button type="primary" @click="saveSchedule">保存到服务器</el-button>
      <el-button @click="loadSchedule">从服务器加载</el-button>
      <el-button class="legacy-admin-btn-notice" @click="openContentEditor('notice')">公告编辑</el-button>
      <el-button class="legacy-admin-btn-activity" @click="openContentEditor('activity')">活动编辑</el-button>
      <el-button class="legacy-admin-btn-shelf" @click="openContentEditor('shelf')">负责书架编辑</el-button>
      <el-button class="legacy-admin-btn-inspect" @click="openContentEditor('inspect')">巡查表编辑</el-button>
      <el-button class="legacy-admin-btn-user" @click="openUsers">人员管理</el-button>
      <el-button class="legacy-admin-btn-link" @click="openLinks">链接管理</el-button>
      <el-input v-model.trim="weekTitle" placeholder="周次，如 第一周" class="week-input" />
      <el-select v-model="selectedWeek" placeholder="加载已有周次" class="week-picker" @change="loadSchedule">
        <el-option v-for="week in weeks" :key="week" :label="week" :value="week" />
      </el-select>
      <el-button type="danger" plain @click="deleteCurrentWeek">删除周次</el-button>
    </section>

    <section class="admin-layout legacy-admin-layout">
      <aside class="side-panel legacy-admin-sidebar">
        <div class="section-head compact legacy-admin-section-head legacy-admin-people-head">
          <div>
            <p class="eyebrow">People</p>
            <h2>人员标签</h2>
          </div>
          <el-button text @click="openUsers">管理</el-button>
        </div>
        <div class="tag-cloud legacy-admin-worker-list">
          <button
            v-for="person in workers"
            :key="person"
            class="worker-tag legacy-admin-worker-tag"
            draggable="true"
            @dragstart="draggedPerson = person"
          >
            {{ person }}
          </button>
        </div>

        <div class="cell-editor legacy-admin-cell-editor" v-if="selectedCell">
          <p class="eyebrow">Selected Cell</p>
          <h3>{{ selectedCell.area }} / {{ selectedCell.shift }} / {{ selectedCell.day }}</h3>
          <el-select v-model="selectedPersons" multiple filterable allow-create default-first-option class="full" placeholder="编辑人员">
            <el-option v-for="person in workers" :key="person" :label="person" :value="person" />
          </el-select>
          <el-checkbox v-model="selectedAnnotation">有批注</el-checkbox>
        </div>

        <div class="hours-panel legacy-admin-hours">
          <p class="eyebrow">Hours</p>
          <h2>人员工时统计</h2>
          <div v-for="item in hourStats" :key="item.name" class="hour-row">
            <span>{{ item.name }}</span>
            <strong>{{ item.hours }}h</strong>
          </div>
        </div>
      </aside>

      <section class="main-panel legacy-admin-main">
        <div class="section-head legacy-admin-section-head legacy-admin-board-head">
          <div>
            <p class="eyebrow">Drag & Drop</p>
            <h2>排班表</h2>
          </div>
        </div>
        <ScheduleBoard
          :schedule="schedule"
          editable
          empty-text=""
          annotation-text="（有）"
          :show-shift-hours="false"
          @cell-click="selectCell"
          @cell-drop="dropPerson"
          @remove-person="removePerson"
        />
      </section>
    </section>

    <ContentEditorDialog
      v-model="contentEditor.visible"
      :type="contentEditor.type"
      :title="contentEditor.title"
    />

    <el-dialog v-model="usersDialog" title="人员管理" width="920px">
      <div class="dialog-actions">
        <el-button type="primary" @click="editUser()">新增人员</el-button>
        <el-button @click="loadUsers">刷新</el-button>
      </div>
      <el-table :data="users" height="420">
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column prop="username" label="账号" min-width="140" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">{{ row.role === 'admin' ? '管理员' : '员工' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300">
          <template #default="{ row }">
            <el-button size="small" @click="editUser(row)">编辑</el-button>
            <el-button size="small" @click="resetUserPassword(row)">重置密码</el-button>
            <el-button size="small" type="danger" @click="deleteUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="userEditDialog" :title="userForm.id ? '编辑人员' : '新增人员'" width="480px">
      <el-form label-position="top">
        <el-form-item label="姓名">
          <el-input v-model.trim="userForm.name" />
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model.trim="userForm.username" />
        </el-form-item>
        <el-form-item v-if="!userForm.id" label="初始密码">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" class="full">
            <el-option label="员工" value="employee" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="linksDialog" title="链接管理" width="680px">
      <el-form label-position="top">
        <el-form-item label="打卡链接">
          <el-input v-model="linkForm.checkinUrl" />
        </el-form-item>
        <el-form-item label="活动签到链接">
          <el-input v-model="linkForm.activityCheckinUrl" />
        </el-form-item>
        <el-form-item label="活动签退链接">
          <el-input v-model="linkForm.activityCheckoutUrl" />
        </el-form-item>
        <el-form-item label="图书查找链接">
          <el-input v-model="linkForm.bookSearchUrl" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linksDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLinks">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Back } from '@element-plus/icons-vue';

import ContentEditorDialog from '../components/ContentEditorDialog.vue';
import ScheduleBoard from '../components/ScheduleBoard.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { DAYS, calculateHours, cloneSchedule, getWorkerNames, joinPersons, splitPersons, toScheduleRows } from '../utils/schedule';

const router = useRouter();
const auth = useAuthStore();

const weeks = ref([]);
const selectedWeek = ref('');
const weekTitle = ref('第一周');
const schedule = ref({ areas: [] });
const users = ref([]);
const draggedPerson = ref('');
const selectedCell = ref(null);
const undoStack = ref([]);
const usersDialog = ref(false);
const userEditDialog = ref(false);
const linksDialog = ref(false);
const linkForm = reactive({
    checkinUrl: '',
    activityCheckinUrl: '',
    activityCheckoutUrl: '',
    bookSearchUrl: ''
});
const userForm = reactive({
    id: null,
    name: '',
    username: '',
    password: '123456',
    role: 'employee'
});
const contentEditor = reactive({
    visible: false,
    type: 'notice',
    title: '公告编辑'
});

const workers = computed(() => getWorkerNames(schedule.value, users.value));
const hourStats = computed(() => calculateHours(schedule.value));

const selectedPersons = computed({
    get() {
        const cell = getSelectedCell();
        return cell ? splitPersons(cell.shift.days[cell.dayIndex]) : [];
    },
    set(persons) {
        const cell = getSelectedCell();
        if (!cell) {
            return;
        }
        remember();
        cell.shift.days[cell.dayIndex] = joinPersons(persons).slice(0) || null;
    }
});

const selectedAnnotation = computed({
    get() {
        const cell = getSelectedCell();
        return Boolean(cell?.shift.annotations?.[cell.dayIndex]);
    },
    set(value) {
        const cell = getSelectedCell();
        if (!cell) {
            return;
        }
        remember();
        cell.shift.annotations[cell.dayIndex] = value ? true : null;
    }
});

onMounted(async () => {
    await loadUsers();
    weeks.value = await api.listWeeks();
    selectedWeek.value = weeks.value[0] || '第一周';
    weekTitle.value = selectedWeek.value;
    await loadSchedule();
});

function logout() {
    auth.logout();
    router.replace('/login');
}

async function loadSchedule() {
    try {
        schedule.value = await api.getSchedule(selectedWeek.value || weekTitle.value);
        weekTitle.value = selectedWeek.value || schedule.value.week || weekTitle.value || '第一周';
        undoStack.value = [];
        selectedCell.value = null;
    } catch (error) {
        ElMessage.error(error.message || '加载失败');
    }
}

async function saveSchedule() {
    if (!weekTitle.value) {
        ElMessage.warning('请填写周次');
        return;
    }
    try {
        await api.saveSchedule({
            schedule_data: toScheduleRows(schedule.value),
            hour_stats: Object.fromEntries(hourStats.value.map((item) => [item.name, item.hours])),
            week: weekTitle.value
        });
        ElMessage.success('保存成功');
        weeks.value = await api.listWeeks();
        selectedWeek.value = weekTitle.value;
    } catch (error) {
        ElMessage.error(error.message || '保存失败');
    }
}

async function deleteCurrentWeek() {
    if (!weekTitle.value) {
        return;
    }
    try {
        await ElMessageBox.confirm(`确认删除 ${weekTitle.value} 的排班数据？`, '删除确认', { type: 'warning' });
        await api.deleteSchedule(weekTitle.value);
        ElMessage.success('删除成功');
        weeks.value = await api.listWeeks();
        selectedWeek.value = weeks.value[0] || '第一周';
        weekTitle.value = selectedWeek.value;
        await loadSchedule();
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error(error.message || '删除失败');
        }
    }
}

function remember() {
    undoStack.value.push(cloneSchedule(schedule.value));
    if (undoStack.value.length > 30) {
        undoStack.value.shift();
    }
}

function undo() {
    const previous = undoStack.value.pop();
    if (previous) {
        schedule.value = previous;
    }
}

async function clearSchedule() {
    try {
        await ElMessageBox.confirm('确认清空当前表格？保存后才会影响服务器数据。', '清空确认', { type: 'warning' });
        remember();
        schedule.value.areas.forEach((area) => {
            area.shifts.forEach((shift) => {
                shift.days = [null, null, null, null, null, null, null];
                shift.annotations = [null, null, null, null, null, null, null];
            });
        });
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error(error.message || '清空失败');
        }
    }
}

function selectCell({ area, shift, dayIndex }) {
    selectedCell.value = {
        area: area.name,
        shift: shift.name,
        dayIndex,
        day: DAYS[dayIndex].short
    };
}

function getSelectedCell() {
    if (!selectedCell.value) {
        return null;
    }
    return findCell(selectedCell.value.area, selectedCell.value.shift, selectedCell.value.dayIndex);
}

function findCell(areaName, shiftName, dayIndex) {
    const area = schedule.value.areas.find((entry) => entry.name === areaName);
    const shift = area?.shifts.find((entry) => entry.name === shiftName);
    return shift ? { area, shift, dayIndex } : null;
}

function dropPerson({ area, shift, dayIndex }) {
    if (!draggedPerson.value) {
        return;
    }
    const cell = findCell(area.name, shift.name, dayIndex);
    if (!cell) {
        return;
    }
    const persons = splitPersons(cell.shift.days[dayIndex]);
    if (persons.includes(draggedPerson.value)) {
        return;
    }
    if (persons.length >= 2) {
        ElMessage.warning('每个单元格最多安排 2 人');
        return;
    }
    if (hasConflict(draggedPerson.value, area.name, shift.name, dayIndex)) {
        ElMessage.warning(`${draggedPerson.value} 在该时间段已有其他排班`);
        return;
    }
    remember();
    cell.shift.days[dayIndex] = joinPersons([...persons, draggedPerson.value]);
}

function removePerson({ area, shift, dayIndex, person }) {
    const cell = findCell(area.name, shift.name, dayIndex);
    if (!cell) {
        return;
    }
    remember();
    cell.shift.days[dayIndex] = joinPersons(splitPersons(cell.shift.days[dayIndex]).filter((item) => item !== person)) || null;
}

function hasConflict(person, areaName, shiftName, dayIndex) {
    return schedule.value.areas.some((area) => {
        if (area.name === areaName) {
            return false;
        }
        const shift = area.shifts.find((entry) => entry.name === shiftName);
        return splitPersons(shift?.days?.[dayIndex]).includes(person);
    });
}

function openContentEditor(type) {
    contentEditor.type = type;
    contentEditor.title = {
        notice: '公告编辑',
        activity: '活动编辑',
        shelf: '负责书架编辑',
        inspect: '巡查表编辑'
    }[type];
    contentEditor.visible = true;
}

async function loadUsers() {
    try {
        users.value = await api.getUsers();
    } catch (error) {
        users.value = [];
    }
}

async function openUsers() {
    await loadUsers();
    usersDialog.value = true;
}

function editUser(row) {
    Object.assign(userForm, row ? {
        id: row.id,
        name: row.name,
        username: row.username,
        password: '',
        role: row.role || 'employee'
    } : {
        id: null,
        name: '',
        username: '',
        password: '123456',
        role: 'employee'
    });
    userEditDialog.value = true;
}

async function saveUser() {
    try {
        if (userForm.id) {
            await api.updateUser(userForm.id, {
                name: userForm.name,
                username: userForm.username,
                role: userForm.role
            });
        } else {
            await api.createUser({
                name: userForm.name,
                username: userForm.username,
                password: userForm.password,
                role: userForm.role
            });
        }
        ElMessage.success('保存成功');
        userEditDialog.value = false;
        await loadUsers();
    } catch (error) {
        ElMessage.error(error.message || '保存失败');
    }
}

async function resetUserPassword(row) {
    try {
        await api.resetPassword(row.id);
        ElMessage.success('密码已重置为 123456');
    } catch (error) {
        ElMessage.error(error.message || '重置失败');
    }
}

async function deleteUser(row) {
    try {
        await ElMessageBox.confirm(`确认删除用户 ${row.name}？`, '删除确认', { type: 'warning' });
        await api.deleteUser(row.id);
        ElMessage.success('删除成功');
        await loadUsers();
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error(error.message || '删除失败');
        }
    }
}

async function openLinks() {
    try {
        Object.assign(linkForm, await api.getLinks());
        linksDialog.value = true;
    } catch (error) {
        ElMessage.error(error.message || '加载失败');
    }
}

async function saveLinks() {
    try {
        await api.saveLinks({ ...linkForm });
        ElMessage.success('保存成功');
        linksDialog.value = false;
    } catch (error) {
        ElMessage.error(error.message || '保存失败');
    }
}
</script>
