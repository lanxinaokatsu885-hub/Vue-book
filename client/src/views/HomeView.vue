<template>
  <main class="legacy-book-page">
    <header class="legacy-header">
      <div class="legacy-header-title">
        <h1>图书馆值班系统</h1>
        <p>{{ shiftText }}</p>
      </div>
      <div class="legacy-user">
        <span class="legacy-avatar">{{ auth.user?.name?.slice(0, 1) || 'U' }}</span>
        <strong>{{ auth.user?.name }}</strong>
        <button class="change-password-btn" @click.stop="showChangePasswordDialog = true" title="修改密码">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.5 14a4.5 4.5 0 1 0 3.85 2.18L21 7.53V4h-3.53l-1.54 1.54 2.5 2.5-1.42 1.42-2.5-2.5-3.58 3.58A4.5 4.5 0 0 0 8.5 14Zm0 2.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z"/>
            </svg>
        </button>
        <button class="logout-btn" @click.stop="logout" title="退出登录">
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H13v3H7v12h6v3H6.5A2.5 2.5 0 0 1 4 18.5Z"/>
                <path d="M15.5 7.5 20 12l-4.5 4.5v-3H10v-3h5.5Z"/>
            </svg>
        </button>
      </div>
    </header>

    <section class="legacy-notice-panel">
      <div
        class="legacy-panel-toggle"
        role="button"
        tabindex="0"
        :aria-expanded="!recordsCollapsed"
        @click="recordsCollapsed = !recordsCollapsed"
        @keyup.enter="recordsCollapsed = !recordsCollapsed"
      >
        <div>
          <p class="eyebrow">Records</p>
          <h2>换班/代班记录</h2>
        </div>
        <span>{{ recordsCollapsed ? '展开' : '收起' }}</span>
      </div>
      <div v-show="!recordsCollapsed" class="legacy-panel-body">
        <el-empty v-if="!records.length" description="暂无记录" />
        <div v-else class="legacy-record-list">
          <article
            v-for="record in records"
            :key="`${record.type}-${record.created_at}-${record.applicant}-${record.target_user}`"
            :class="['legacy-record-card', record.type]"
          >
            <span class="legacy-record-icon">{{ record.type === 'swap' ? '🔄' : '👥' }}</span>
            <div class="legacy-record-content">
              <time>{{ formatDate(record.created_at) }}</time>
              <strong>{{ recordTitle(record) }}</strong>
              <p>班次：{{ recordShiftText(record) }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="legacy-btn-group">
      <el-button class="legacy-btn legacy-btn-primary" type="primary" @click="openAdmin">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M6 7.5A2.5 2.5 0 0 1 8.5 5H15v2H8.5a.5.5 0 0 0-.5.5v8A.5.5 0 0 0 8.5 16h8a.5.5 0 0 0 .5-.5V12h2v3.5A2.5 2.5 0 0 1 16.5 18h-8A2.5 2.5 0 0 1 6 15.5Z"/><path class="icon-fill" d="M14.2 10.8 18.9 6.1a1.4 1.4 0 0 1 2 2l-4.7 4.7-2.8.8Z"/></svg>
          编辑管理
      </el-button>
      <el-button class="legacy-btn legacy-btn-swap" @click="openSwap">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M7 6h7.5a3.5 3.5 0 0 1 3.5 3.5V10h-2v-.5A1.5 1.5 0 0 0 14.5 8H7V5L3.8 9 7 13v-3h7.5A3.5 3.5 0 0 1 18 13.5v.5h-2v-.5a1.5 1.5 0 0 0-1.5-1.5H7Z"/></svg>
          和谁换班
      </el-button>
      <el-button class="legacy-btn legacy-btn-substitute" @click="openSubstitute">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4.5 19c.45-3.2 2.7-5 5.5-5 1.25 0 2.4.35 3.3 1l-1.1 1.5c-.55-.3-1.3-.5-2.2-.5-1.7 0-3 .9-3.45 3Z"/><path class="icon-fill" d="M17 9h2v3h3v2h-3v3h-2v-3h-3v-2h3Z"/></svg>
          请人代班
      </el-button>
      <el-button class="legacy-btn legacy-btn-warning" type="warning" plain @click="openRevoke">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M6 7h12a2 2 0 0 1 2 2v10H4V9a2 2 0 0 1 2-2Zm1 4v2h10v-2Zm0 4v2h7v-2Z"/><path class="icon-fill" d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9Z"/></svg>
          撤销代换班
      </el-button>
      <el-button class="legacy-btn legacy-btn-info" @click="openContent('shelf')">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M5 6.5A2.5 2.5 0 0 1 7.5 4H20v15H7.5A2.5 2.5 0 0 0 5 21.5ZM8 7v10h10V7Zm2 2h6v2h-6Zm0 4h5v2h-5Z"/></svg>
          负责书架
      </el-button>
      <el-button class="legacy-btn legacy-btn-info" @click="openContent('inspect')">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M10.5 5a6.5 6.5 0 0 1 5.15 10.45l3.2 3.2-1.4 1.4-3.2-3.2A6.5 6.5 0 1 1 10.5 5Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm-1 2h2v5h-2Z"/></svg>
          巡查表
      </el-button>
      <el-button class="legacy-btn legacy-btn-info" @click="openContent('notice')">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M12 4a5 5 0 0 1 5 5v3.5l2 3.5H5l2-3.5V9a5 5 0 0 1 5-5Zm-2.5 18h5a2.7 2.7 0 0 1-5 0Z"/></svg>
          公告
      </el-button>
      <el-button class="legacy-btn legacy-btn-info" @click="openContent('activity')">
          <svg class="btn-icon btn-icon-solid" viewBox="0 0 24 24" aria-hidden="true"><rect class="icon-plate" x="2" y="2" width="20" height="20" rx="7"/><path class="icon-fill" d="M6 6h2V4h2v2h4V4h2v2h2a2 2 0 0 1 2 2v11H4V8a2 2 0 0 1 2-2Zm-1 5v7h14v-7Zm3 2h3v3H8Z"/></svg>
          活动
      </el-button>
      <el-button
        v-for="link in externalLinks"
        :key="link.key"
        :class="['legacy-btn', 'legacy-btn-link', link.className]"
        @click="openExternal(link.url)"
        :disabled="!link.url"
      >
        <el-icon><component :is="link.icon" /></el-icon>
        {{ link.label }}
      </el-button>
    </section>

    <section class="legacy-schedule-panel">
      <div
        class="legacy-panel-toggle"
        role="button"
        tabindex="0"
        :aria-expanded="!scheduleCollapsed"
        @click="scheduleCollapsed = !scheduleCollapsed"
        @keyup.enter="scheduleCollapsed = !scheduleCollapsed"
      >
        <div>
          <p class="eyebrow">Schedule</p>
          <h2>排班表</h2>
        </div>
        <span>{{ scheduleCollapsed ? '展开' : '收起' }}</span>
      </div>
      <div v-show="!scheduleCollapsed" class="legacy-panel-body">
        <div class="legacy-schedule-tools">
          <el-select v-model="selectedWeek" placeholder="选择周次" class="week-picker" @change="loadAll">
            <el-option v-for="week in weeks" :key="week" :label="week" :value="week" />
          </el-select>
          <span class="legacy-current-time">{{ currentTime }}</span>
          <el-button class="legacy-refresh-btn" @click="loadAll">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6v5h-5" />
              <path d="M4 18v-5h5" />
              <path d="M18.2 9A7 7 0 0 0 6.8 6.2L4 9" />
              <path d="M5.8 15a7 7 0 0 0 11.4 2.8L20 15" />
            </svg>
            <span>刷新</span>
          </el-button>
        </div>
        <el-alert v-if="!schedule?.areas?.length" title="暂无排班数据" type="info" :closable="false" />
        <ScheduleBoard v-else :schedule="schedule" :current-user-name="auth.user?.name || ''" annotation-text="（有）" />
      </div>
    </section>

    <footer class="legacy-footer">
      <span>© 2026 图书馆值班系统</span>
    </footer>

    <el-dialog v-model="adminDialog" width="420px">
      <template #header>
          <div class="dialog-title-with-icon">
              <svg class="dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>编辑管理权限验证</span>
          </div>
      </template>
      <el-input v-model="adminPassword" type="password" show-password placeholder="请输入排班员密码" @keyup.enter="verifyAdmin" />
      <template #footer>
        <el-button @click="adminDialog = false">取消</el-button>
        <el-button type="primary" @click="verifyAdmin">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="swapDialog" width="520px">
      <template #header>
          <div class="dialog-title-with-icon">
              <svg class="dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 10v12m0 0l4-4m-4 4l-4-4"/></svg>
              <span>申请换班</span>
          </div>
      </template>
      <el-form label-position="top">
        <el-form-item label="原班次">
          <el-select v-model="swapForm.originalShift" filterable placeholder="选择自己的班次" class="full">
            <el-option v-for="item in userShifts" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="换班对象">
          <el-select v-model="swapForm.swapUser" filterable allow-create placeholder="选择或输入人员" class="full">
            <el-option v-for="person in workers" :key="person" :label="person" :value="person" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标班次">
          <el-select v-model="swapForm.targetShift" clearable filterable placeholder="可选：选择对方班次" class="full">
            <el-option v-for="item in targetShifts" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="swapForm.reason" placeholder="请输入换班原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="swapDialog = false">取消</el-button>
        <el-button type="primary" @click="submitSwap">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="substituteDialog" width="520px">
      <template #header>
          <div class="dialog-title-with-icon">
              <svg class="dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/></svg>
              <span>申请代班</span>
          </div>
      </template>
      <el-form label-position="top">
        <el-form-item label="代班人">
          <el-select v-model="substituteForm.substituteUser" filterable allow-create placeholder="选择或输入人员" class="full">
            <el-option v-for="person in workers" :key="person" :label="person" :value="person" />
          </el-select>
        </el-form-item>
        <el-form-item label="代班班次">
          <el-select v-model="substituteForm.substituteShift" filterable placeholder="选择自己的班次" class="full">
            <el-option v-for="item in userShifts" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="substituteForm.reason" placeholder="请输入代班原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="substituteDialog = false">取消</el-button>
        <el-button type="primary" @click="submitSubstitute">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="revokeDialog" width="560px">
      <template #header>
          <div class="dialog-title-with-icon">
              <svg class="dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h14M3 14h14M4 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>撤销当天代换班</span>
          </div>
      </template>
      <el-select v-model="revokeValue" placeholder="选择要撤销的记录" class="full">
        <el-option v-for="record in todayRecords" :key="`${record.type}:${record.id}`" :label="recordLabel(record)" :value="`${record.type}:${record.id}`" />
      </el-select>
      <template #footer>
        <el-button @click="revokeDialog = false">取消</el-button>
        <el-button type="warning" @click="submitRevoke">确认撤销</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="contentDialog" :title="contentTitle" width="720px">
      <p v-if="activeContent.text" class="content-text">{{ activeContent.text }}</p>
      <el-empty v-else description="暂无内容" />
      <div v-if="activeContent.images?.length" class="image-grid">
        <button v-for="image in activeContent.images" :key="image" class="image-thumb" @click="showImage(image)">
          <img :src="image" alt="内容图片" />
        </button>
      </div>
    </el-dialog>

    <ImagePreview v-model="previewVisible" :src="previewImage" />

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="showChangePasswordDialog" width="400px" :close-on-click-modal="false">
        <template #header>
            <div class="dialog-title-with-icon">
                <svg class="dialog-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>
                <span>修改密码</span>
            </div>
        </template>
        <el-form :model="passwordForm" label-width="80px">
            <el-form-item label="旧密码">
                <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入旧密码" show-password />
            </el-form-item>
            <el-form-item label="新密码">
                <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（至少6位）" show-password />
            </el-form-item>
            <el-form-item label="确认密码">
                <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="showChangePasswordDialog = false">取消</el-button>
            <el-button type="primary" :loading="changePasswordLoading" @click="handleChangePassword">确认修改</el-button>
        </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Link, Notebook, Search } from '@element-plus/icons-vue';

import ImagePreview from '../components/ImagePreview.vue';
import ScheduleBoard from '../components/ScheduleBoard.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { defaultAcademicWeekTitle } from '../utils/academicWeek';
import { currentDayIndex, currentShift, findUserShifts, getWorkerNames } from '../utils/schedule';

const router = useRouter();
const auth = useAuthStore();

const weeks = ref([]);
const selectedWeek = ref('');
const schedule = ref({ areas: [] });
const records = ref([]);
const todayRecords = ref([]);
const links = ref({});
const currentTime = ref('');
const adminDialog = ref(false);
const adminPassword = ref('');
const swapDialog = ref(false);
const substituteDialog = ref(false);
const revokeDialog = ref(false);
const revokeValue = ref('');
const contentDialog = ref(false);
const activeType = ref('notice');
const activeContent = ref({});
const previewVisible = ref(false);
const previewImage = ref('');
const recordsCollapsed = ref(true);
const scheduleCollapsed = ref(true);

const showChangePasswordDialog = ref(false);
const changePasswordLoading = ref(false);
const passwordForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
});

const swapForm = reactive({ originalShift: '', swapUser: '', targetShift: '', reason: '' });
const substituteForm = reactive({ substituteUser: '', substituteShift: '', reason: '' });

const workers = computed(() => getWorkerNames(schedule.value));
const userShifts = computed(() => findUserShifts(schedule.value, auth.user?.name));
const targetShifts = computed(() => findUserShifts(schedule.value, swapForm.swapUser));
const contentTitle = computed(() => ({ notice: '公告', activity: '活动', shelf: '负责书架', inspect: '巡查表' }[activeType.value]));
const shiftText = computed(() => {
    const shift = currentShift();
    const day = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][currentDayIndex()];
    return shift ? `${day} 当前班次：${shift}` : `${day} 当前非工作时间`;
});

const externalLinks = computed(() => [
    { key: 'activityCheckinUrl', label: '活动签到', url: links.value.activityCheckinUrl, icon: Notebook },
    { key: 'activityCheckoutUrl', label: '活动签退', url: links.value.activityCheckoutUrl, icon: Notebook },
    { key: 'bookSearchUrl', label: '图书查找', url: links.value.bookSearchUrl, icon: Search, className: 'legacy-btn-search' },
    { key: 'checkinUrl', label: '打卡', url: links.value.checkinUrl, icon: Link, className: 'legacy-btn-checkin' }
]);

onMounted(async () => {
    tick();
    setInterval(tick, 1000);
    await loadBootstrap();
});

function tick() {
    currentTime.value = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

async function loadBootstrap() {
    try {
        weeks.value = await api.listWeeks();
        selectedWeek.value = weeks.value[0] || defaultAcademicWeekTitle();
        links.value = await api.getLinks();
        await loadAll();
    } catch (error) {
        ElMessage.error(error.message || '加载失败');
    }
}

async function loadAll() {
    schedule.value = await api.getSchedule(selectedWeek.value);
    records.value = await api.getSwapNotices(selectedWeek.value);
}

function logout() {
    auth.logout();
    router.replace('/login');
}

async function openAdmin() {
    if (auth.isAdmin) {
        sessionStorage.setItem('adminVerified', 'true');
        router.push('/paiban');
        return;
    }
    adminDialog.value = true;
}

async function verifyAdmin() {
    try {
        await api.verifyAdminPassword(adminPassword.value);
        sessionStorage.setItem('adminVerified', 'true');
        adminDialog.value = false;
        router.push('/paiban');
    } catch (error) {
        ElMessage.error(error.message || '密码验证失败');
    }
}

function openSwap() {
    if (!userShifts.value.length) {
        ElMessage.warning('当前周次没有找到你的班次');
        return;
    }
    Object.assign(swapForm, { originalShift: '', swapUser: '', targetShift: '', reason: '' });
    swapDialog.value = true;
}

async function submitSwap() {
    try {
        await api.swapShift({
            applicant: auth.user.name,
            swapUser: swapForm.swapUser,
            originalShift: swapForm.originalShift,
            targetShift: swapForm.targetShift,
            reason: swapForm.reason,
            week: selectedWeek.value
        });
        ElMessage.success('换班已提交并生效');
        swapDialog.value = false;
        await loadAll();
    } catch (error) {
        ElMessage.error(error.message || '提交失败');
    }
}

function openSubstitute() {
    if (!userShifts.value.length) {
        ElMessage.warning('当前周次没有找到你的班次');
        return;
    }
    Object.assign(substituteForm, { substituteUser: '', substituteShift: '', reason: '' });
    substituteDialog.value = true;
}

async function submitSubstitute() {
    try {
        await api.substitute({
            applicant: auth.user.name,
            substituteUser: substituteForm.substituteUser,
            substituteShift: substituteForm.substituteShift,
            reason: substituteForm.reason,
            week: selectedWeek.value
        });
        ElMessage.success('代班已提交并生效');
        substituteDialog.value = false;
        await loadAll();
    } catch (error) {
        ElMessage.error(error.message || '提交失败');
    }
}

async function openRevoke() {
    todayRecords.value = await api.getTodayShiftRecords();
    revokeValue.value = '';
    revokeDialog.value = true;
}

async function submitRevoke() {
    if (!revokeValue.value) {
        ElMessage.warning('请选择记录');
        return;
    }
    const [type, recordId] = revokeValue.value.split(':');
    try {
        await api.revokeShift({ type, recordId });
        ElMessage.success('撤销成功');
        revokeDialog.value = false;
        await loadAll();
    } catch (error) {
        ElMessage.error(error.message || '撤销失败');
    }
}

async function openContent(type) {
    activeType.value = type;
    activeContent.value = await api.getContent(type) || {};
    contentDialog.value = true;
}

function showImage(image) {
    previewImage.value = image;
    previewVisible.value = true;
}

function openExternal(url) {
    if (url) {
        window.open(url, '_blank', 'noopener');
    }
}

function formatDate(value) {
    return value ? new Date(value).toLocaleString('zh-CN') : '';
}

function recordLabel(record) {
    return `${record.type === 'swap' ? '换班' : '代班'}：${record.applicant} → ${record.target_user} (${record.original_shift})`;
}

function recordTitle(record) {
    return `${record.applicant} 与 ${record.target_user} ${record.type === 'swap' ? '换班' : '代班'}`;
}

function recordShiftText(record) {
    if (record.type === 'swap' && record.target_shift) {
        return `${record.original_shift} ↔ ${record.target_shift}`;
    }
    return record.original_shift || '未记录';
}

async function handleChangePassword() {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        ElMessage.warning('请填写完整信息');
        return;
    }
    if (passwordForm.newPassword.length < 6) {
        ElMessage.warning('新密码长度不能少于6位');
        return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        ElMessage.warning('两次输入的新密码不一致');
        return;
    }
    changePasswordLoading.value = true;
    try {
        await api.changePassword(auth.user.id, passwordForm.oldPassword, passwordForm.newPassword);
        ElMessage.success('密码修改成功，请重新登录');
        showChangePasswordDialog.value = false;
        passwordForm.oldPassword = '';
        passwordForm.newPassword = '';
        passwordForm.confirmPassword = '';
        // 修改密码成功后退出登录
        setTimeout(() => {
            auth.logout();
            router.replace('/login');
        }, 1500);
    } catch (error) {
        ElMessage.error(error.message || '修改失败');
    } finally {
        changePasswordLoading.value = false;
    }
}
</script>

<style scoped>
.legacy-user {
    display: flex;
    align-items: center;
    gap: 6px;
}

.change-password-btn,
.logout-btn {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.12);
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.86);
    padding: 0;
    border-radius: 8px;
    transition: all 0.2s;
}

.change-password-btn svg,
.logout-btn svg {
    width: 17px;
    height: 17px;
    fill: currentColor;
}

.change-password-btn:hover,
.logout-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.22);
}
</style>
