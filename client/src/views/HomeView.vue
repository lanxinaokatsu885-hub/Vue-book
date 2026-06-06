<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Library Duty</p>
        <h1>图书馆值班系统</h1>
      </div>
      <div class="top-actions">
        <el-button circle :type="musicPlaying ? 'primary' : 'default'" @click="toggleMusic">
          <el-icon><Headset /></el-icon>
        </el-button>
        <div class="user-chip" @click="logout">
          <span>{{ auth.user?.name?.slice(0, 1) || 'U' }}</span>
          <strong>{{ auth.user?.name }}</strong>
        </div>
      </div>
    </header>

    <audio ref="audioRef" @ended="playRandomTrack"></audio>

    <section class="dashboard-grid">
      <article class="hero-panel">
        <div>
          <p class="eyebrow">当前状态</p>
          <h2>{{ currentTime }}</h2>
          <p>{{ shiftText }}</p>
        </div>
        <el-select v-model="selectedWeek" placeholder="选择周次" class="week-picker" @change="loadAll">
          <el-option v-for="week in weeks" :key="week" :label="week" :value="week" />
        </el-select>
      </article>

      <article class="quick-panel">
        <el-button type="primary" @click="openAdmin">排班编辑</el-button>
        <el-button @click="openSwap">和谁换班</el-button>
        <el-button @click="openSubstitute">请人代班</el-button>
        <el-button type="warning" plain @click="openRevoke">撤销代换班</el-button>
        <el-button @click="openContent('shelf')">负责书架</el-button>
        <el-button @click="openContent('inspect')">巡查表</el-button>
        <el-button @click="openContent('notice')">公告</el-button>
        <el-button @click="openContent('activity')">活动</el-button>
      </article>
    </section>

    <section class="link-strip">
      <el-button v-for="link in externalLinks" :key="link.key" @click="openExternal(link.url)" :disabled="!link.url">
        <el-icon><component :is="link.icon" /></el-icon>
        {{ link.label }}
      </el-button>
      <span>请记得线下签到，电蚊香不要 24 小时插着。</span>
    </section>

    <section class="work-area">
      <div class="section-head">
        <div>
          <p class="eyebrow">Schedule</p>
          <h2>排班表</h2>
        </div>
        <el-button text @click="loadAll">刷新</el-button>
      </div>
      <el-alert v-if="!schedule?.areas?.length" title="暂无排班数据" type="info" :closable="false" />
      <ScheduleBoard v-else :schedule="schedule" />
    </section>

    <section class="records-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Records</p>
          <h2>换班/代班记录</h2>
        </div>
      </div>
      <el-empty v-if="!records.length" description="暂无记录" />
      <el-timeline v-else>
        <el-timeline-item v-for="record in records" :key="`${record.type}-${record.created_at}`" :timestamp="formatDate(record.created_at)">
          {{ record.type === 'swap' ? '换班' : '代班' }}：
          {{ record.applicant }} → {{ record.target_user }}
          <span class="muted">({{ record.original_shift }}{{ record.target_shift ? ` / ${record.target_shift}` : '' }})</span>
        </el-timeline-item>
      </el-timeline>
    </section>

    <el-dialog v-model="adminDialog" title="排班编辑权限验证" width="420px">
      <el-input v-model="adminPassword" type="password" show-password placeholder="请输入排班员密码" @keyup.enter="verifyAdmin" />
      <template #footer>
        <el-button @click="adminDialog = false">取消</el-button>
        <el-button type="primary" @click="verifyAdmin">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="swapDialog" title="申请换班" width="520px">
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

    <el-dialog v-model="substituteDialog" title="申请代班" width="520px">
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

    <el-dialog v-model="revokeDialog" title="撤销当天代换班" width="560px">
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
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Headset, Link, Notebook, Search } from '@element-plus/icons-vue';

import ImagePreview from '../components/ImagePreview.vue';
import ScheduleBoard from '../components/ScheduleBoard.vue';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
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
const musicPlaying = ref(false);
const audioRef = ref(null);
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

const swapForm = reactive({ originalShift: '', swapUser: '', targetShift: '', reason: '' });
const substituteForm = reactive({ substituteUser: '', substituteShift: '', reason: '' });

const trackNames = [
    'Where Did U Go - G.E.M. 邓紫棋.mp3',
    '同进退 - 倪浩毅.mp3',
    '够爱 - 曾沛慈.mp3',
    '天问 - 刘宇宁.mp3',
    '富士山下 - 陈奕迅.mp3',
    '恶作剧 - 王蓝茵.mp3',
    '愿与愁 - 林俊杰.mp3',
    '晴天 - 周杰伦.mp3',
    '知我 - 国风堂、哦漏.mp3',
    '秘密基地 - 棒棒堂.mp3',
    '问情 - 陈亦洺、尚辰.mp3'
];

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
    { key: 'checkinUrl', label: '打卡', url: links.value.checkinUrl, icon: Link },
    { key: 'activityCheckinUrl', label: '活动签到', url: links.value.activityCheckinUrl, icon: Notebook },
    { key: 'activityCheckoutUrl', label: '活动签退', url: links.value.activityCheckoutUrl, icon: Notebook },
    { key: 'bookSearchUrl', label: '图书查找', url: links.value.bookSearchUrl, icon: Search }
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
        selectedWeek.value = weeks.value[0] || '第一周';
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

function toggleMusic() {
    if (!audioRef.value) {
        return;
    }
    if (musicPlaying.value) {
        audioRef.value.pause();
        musicPlaying.value = false;
        return;
    }
    playRandomTrack();
}

function playRandomTrack() {
    if (!audioRef.value) {
        return;
    }
    const track = trackNames[Math.floor(Math.random() * trackNames.length)];
    audioRef.value.src = `/static/book/bgm/${encodeURI(track)}`;
    audioRef.value.play().then(() => {
        musicPlaying.value = true;
    }).catch(() => {
        musicPlaying.value = false;
    });
}
</script>
