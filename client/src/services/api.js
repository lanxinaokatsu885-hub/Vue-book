async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function request(url, options = {}) {
    const init = {
        method: options.method || 'GET',
        headers: options.headers || {}
    };

    if (options.body instanceof FormData) {
        init.body = options.body;
    } else if (options.body !== undefined) {
        init.headers = { 'Content-Type': 'application/json', ...init.headers };
        init.body = JSON.stringify(options.body);
    }

    let response;
    try {
        response = await fetch(url, init);
    } catch (error) {
        throw new Error('后端服务连接失败，请确认 3000 端口已启动');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = payload.msg || payload.message || (response.status >= 500 ? '后端服务连接失败，请确认 3000 端口已启动' : '请求失败');
        throw new Error(message);
    }
    return payload;
}

function dataOrThrow(payload) {
    if (payload.code && payload.code !== 200) {
        throw new Error(payload.msg || '请求失败');
    }
    if (payload.success === false) {
        throw new Error(payload.message || '请求失败');
    }
    return payload.data;
}

function okMessage(payload) {
    if (payload.code && payload.code !== 200) {
        throw new Error(payload.msg || '请求失败');
    }
    if (payload.success === false) {
        throw new Error(payload.message || '请求失败');
    }
    return payload.msg || payload.message || '操作成功';
}

export const api = {
    async login(credentials) {
        const hashed = { ...credentials, password: await sha256(credentials.password) };
        return dataOrThrow(await request('/api/login', { method: 'POST', body: hashed }));
    },
    async verifyAdminPassword(password) {
        const hashed = await sha256(password);
        return dataOrThrow(await request('/api/verify-admin-password', { method: 'POST', body: { password: hashed } }));
    },
    async changePassword(userId, oldPassword, newPassword) {
        const hashedOld = await sha256(oldPassword);
        const hashedNew = await sha256(newPassword);
        return okMessage(await request(`/api/users/${userId}/change-password`, { method: 'PUT', body: { oldPassword: hashedOld, newPassword: hashedNew } }));
    },
    async getSchedule(week) {
        const query = week ? `?week=${encodeURIComponent(week)}` : '';
        return dataOrThrow(await request(`/api/schedule-data${query}`));
    },
    async loadSchedule(week) {
        const query = week ? `?week=${encodeURIComponent(week)}` : '';
        return dataOrThrow(await request(`/api/load-schedule${query}`));
    },
    async saveSchedule(payload) {
        return okMessage(await request('/api/save-schedule', { method: 'POST', body: payload }));
    },
    async deleteSchedule(week) {
        return okMessage(await request('/api/delete-schedule', { method: 'POST', body: { week } }));
    },
    async listWeeks() {
        return dataOrThrow(await request('/api/list-weeks'));
    },
    async swapShift(payload) {
        return dataOrThrow(await request('/api/swap-shift', { method: 'POST', body: payload }));
    },
    async substitute(payload) {
        return dataOrThrow(await request('/api/substitute', { method: 'POST', body: payload }));
    },
    async getSwapNotices(week) {
        const query = week ? `?week=${encodeURIComponent(week)}` : '';
        return dataOrThrow(await request(`/api/swap-notices${query}`));
    },
    async getTodayShiftRecords() {
        return dataOrThrow(await request('/api/today-shift-records'));
    },
    async revokeShift(payload) {
        return okMessage(await request('/api/revoke-shift', { method: 'POST', body: payload }));
    },
    async getContent(type) {
        return dataOrThrow(await request(`/api/${type}`));
    },
    async saveContent(type, formData) {
        return dataOrThrow(await request(`/api/${type}`, { method: 'POST', body: formData }));
    },
    async deleteImage(imageUrl) {
        return okMessage(await request('/api/delete-image', { method: 'POST', body: { imageUrl } }));
    },
    async getUsers() {
        return dataOrThrow(await request('/api/users'));
    },
    async getUser(id) {
        return dataOrThrow(await request(`/api/users/${id}`));
    },
    async createUser(payload) {
        return dataOrThrow(await request('/api/users', { method: 'POST', body: payload }));
    },
    async updateUser(id, payload) {
        return okMessage(await request(`/api/users/${id}`, { method: 'PUT', body: payload }));
    },
    async deleteUser(id) {
        return okMessage(await request(`/api/users/${id}`, { method: 'DELETE' }));
    },
    async resetPassword(id) {
        return okMessage(await request(`/api/users/${id}/reset-password`, { method: 'POST' }));
    },
    async getLinks() {
        return dataOrThrow(await request('/api/links'));
    },
    async saveLinks(payload) {
        return okMessage(await request('/api/links', { method: 'POST', body: payload }));
    }
};
