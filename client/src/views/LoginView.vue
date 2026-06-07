<template>
  <main class="login-page">
    <section class="login-hero">
      <div class="login-copy">
        <p class="eyebrow">Library Scheduling</p>
        <h1>图书馆排班系统</h1>
        <p>值班排班、代换班、公告活动和人员维护集中管理。</p>
      </div>
    </section>

    <section class="login-panel">
      <div class="brand-mark">
        <img :src="logoSrc" alt="图书馆" />
      </div>
      <h2>账号登录</h2>
      <el-form :model="form" label-position="top" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input v-model.trim="form.username" size="large" autocomplete="username" @keyup.enter="submit" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" size="large" type="password" show-password autocomplete="current-password" @keyup.enter="submit" />
        </el-form-item>
        <el-button type="primary" size="large" class="full-btn" :loading="loading" @click="submit">登录</el-button>
      </el-form>
      <p class="login-foot">© 2026 图书馆值班系统</p>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({
    username: '',
    password: ''
});
const logoSrc = '/1.jpg';

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
