<template>
  <main class="login-page">
    <section class="login-hero">
      <svg class="login-float-decor" viewBox="0 0 400 400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="decorGlow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
            <stop offset="58%" stop-color="#9fd3ff" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="decorPage" x1="138" y1="142" x2="262" y2="264" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.46"/>
            <stop offset="100%" stop-color="#bde4ff" stop-opacity="0.18"/>
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="168" fill="url(#decorGlow)"/>
        <circle cx="200" cy="200" r="150" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.16)" stroke-width="1.4"/>
        <circle cx="200" cy="200" r="96" fill="rgba(107,178,255,0.09)" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/>
        <path d="M200 44 L200 356 M44 200 L356 200" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        <path d="M91 91 L309 309 M309 91 L91 309" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
        <path d="M142 148 C164 138 184 142 200 156 C216 142 236 138 258 148 L258 260 C236 250 216 253 200 268 C184 253 164 250 142 260 Z" fill="url(#decorPage)" stroke="rgba(255,255,255,0.35)" stroke-width="1.5"/>
        <path d="M200 156 L200 268" stroke="rgba(255,255,255,0.28)" stroke-width="1.2"/>
        <path d="M158 173 C173 168 187 170 198 180 M158 197 C173 192 187 194 198 204 M242 173 C227 168 213 170 202 180 M242 197 C227 192 213 194 202 204" stroke="rgba(255,255,255,0.28)" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="116" cy="126" r="7" fill="rgba(255,255,255,0.24)"/>
        <circle cx="292" cy="112" r="5" fill="rgba(159,211,255,0.24)"/>
        <circle cx="290" cy="286" r="8" fill="rgba(255,255,255,0.18)"/>
      </svg>
      <div class="login-copy">
        <p class="eyebrow">Library Scheduling</p>
        <h1>图书馆排班系统</h1>
        <p>值班排班、代换班、公告活动和人员维护集中管理。</p>
      </div>
    </section>

    <section class="login-panel">
      <div class="login-panel-inner">
        <div class="login-panel-top">
          <div class="brand-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 7.5C9.5 6.2 12.7 6.6 16 9.2C19.3 6.6 22.5 6.2 26 7.5V25C22.5 23.7 19.3 24.1 16 26.7C12.7 24.1 9.5 23.7 6 25V7.5Z" fill="currentColor" opacity="0.16"/>
              <path d="M16 9.2V26.7M6 7.5C9.5 6.2 12.7 6.6 16 9.2C19.3 6.6 22.5 6.2 26 7.5V25C22.5 23.7 19.3 24.1 16 26.7C12.7 24.1 9.5 23.7 6 25V7.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 13H13M19 13H22M10 17H13M19 17H22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div>
            <p class="eyebrow">Secure Access</p>
            <h2>账号登录</h2>
          </div>
        </div>
        <svg class="login-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="32" height="36" rx="3" fill="#409eff" fill-opacity="0.1" stroke="#409eff" stroke-width="2"/>
          <line x1="16" y1="16" x2="32" y2="16" stroke="#409eff" stroke-width="2" stroke-linecap="round"/>
          <line x1="16" y1="24" x2="28" y2="24" stroke="#409eff" stroke-width="2" stroke-linecap="round"/>
          <line x1="16" y1="32" x2="24" y2="32" stroke="#409eff" stroke-width="2" stroke-linecap="round"/>
          <circle cx="36" cy="36" r="8" fill="#67c23a" stroke="#fff" stroke-width="2"/>
          <path d="M33 36 L35 38 L39 34" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <el-form :model="form" label-position="top" @submit.prevent="submit">
          <el-form-item label="账号">
            <el-input v-model.trim="form.username" size="large" autocomplete="username" :prefix-icon="User" @keyup.enter="submit" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" size="large" type="password" show-password autocomplete="current-password" :prefix-icon="Lock" @keyup.enter="submit" />
          </el-form-item>
          <el-button type="primary" size="large" class="full-btn login-submit" :loading="loading" @click="submit">登录</el-button>
        </el-form>
        <p class="login-foot">© 2026 图书馆值班系统</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Lock, User } from '@element-plus/icons-vue';

import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({
    username: '',
    password: ''
});

async function submit() {
    if (!form.username || !form.password) {
        ElMessage.warning('请输入账号和密码');
        return;
    }
    loading.value = true;
    try {
        const user = await api.login(form);
        auth.setUser(user);
        router.replace('/book');
    } catch (error) {
        ElMessage.error(error.message || '登录失败');
    } finally {
        loading.value = false;
    }
}
</script>
