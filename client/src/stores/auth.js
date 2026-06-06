import { defineStore } from 'pinia';

const STORAGE_KEY = 'userInfo';

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: readUser()
    }),
    getters: {
        isAdmin: (state) => state.user && state.user.role === 'admin'
    },
    actions: {
        setUser(user) {
            this.user = user;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        },
        logout() {
            this.user = null;
            localStorage.removeItem(STORAGE_KEY);
            sessionStorage.removeItem('adminVerified');
        }
    }
});

function readUser() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (error) {
        return null;
    }
}
