function toUtf8Bytes(message) {
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(message);
    }
    const encoded = unescape(encodeURIComponent(message));
    return Uint8Array.from(encoded, (char) => char.charCodeAt(0));
}

function rotateRight(value, shift) {
    return (value >>> shift) | (value << (32 - shift));
}

async function sha256(message) {
    const constants = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const hash = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    const bytes = toUtf8Bytes(String(message));
    const bitLength = bytes.length * 8;
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
    view.setUint32(paddedLength - 4, bitLength >>> 0);

    const words = new Uint32Array(64);
    for (let offset = 0; offset < paddedLength; offset += 64) {
        for (let i = 0; i < 16; i += 1) {
            words[i] = view.getUint32(offset + i * 4);
        }
        for (let i = 16; i < 64; i += 1) {
            const s0 = rotateRight(words[i - 15], 7) ^ rotateRight(words[i - 15], 18) ^ (words[i - 15] >>> 3);
            const s1 = rotateRight(words[i - 2], 17) ^ rotateRight(words[i - 2], 19) ^ (words[i - 2] >>> 10);
            words[i] = (words[i - 16] + s0 + words[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = hash;
        for (let i = 0; i < 64; i += 1) {
            const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
            const choice = (e & f) ^ (~e & g);
            const temp1 = (h + s1 + choice + constants[i] + words[i]) >>> 0;
            const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
            const majority = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (s0 + majority) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        hash[0] = (hash[0] + a) >>> 0;
        hash[1] = (hash[1] + b) >>> 0;
        hash[2] = (hash[2] + c) >>> 0;
        hash[3] = (hash[3] + d) >>> 0;
        hash[4] = (hash[4] + e) >>> 0;
        hash[5] = (hash[5] + f) >>> 0;
        hash[6] = (hash[6] + g) >>> 0;
        hash[7] = (hash[7] + h) >>> 0;
    }

    return hash.map((value) => value.toString(16).padStart(8, '0')).join('');
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
