const { defineConfig } = require('vite');
const vue = require('@vitejs/plugin-vue');

module.exports = defineConfig({
    root: 'client',
    plugins: [vue()],
    publicDir: false,
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': 'http://127.0.0.1:3000',
            '/uploads': 'http://127.0.0.1:3000',
            '/static': 'http://127.0.0.1:3000'
        }
    },
    build: {
        outDir: '../public',
        emptyOutDir: false
    }
});
