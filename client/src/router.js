import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from './stores/auth';
import AdminView from './views/AdminView.vue';
import HomeView from './views/HomeView.vue';
import LoginView from './views/LoginView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/book' },
        { path: '/login', component: LoginView, meta: { public: true } },
        { path: '/book/login.html', component: LoginView, meta: { public: true } },
        { path: '/book', component: HomeView },
        { path: '/book/index.html', component: HomeView },
        { path: '/paiban', component: AdminView, meta: { admin: true } },
        { path: '/paiban/index.html', component: AdminView, meta: { admin: true } },
        { path: '/:pathMatch(.*)*', redirect: '/book' }
    ]
});

router.beforeEach((to) => {
    const auth = useAuthStore();
    if (to.meta.public && auth.user) {
        return '/book';
    }
    if (!to.meta.public && !auth.user) {
        return '/login';
    }
    if (to.meta.admin && !auth.isAdmin && sessionStorage.getItem('adminVerified') !== 'true') {
        return '/book';
    }
    return true;
});

export default router;
