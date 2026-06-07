const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

async function login(username, password) {
    if (!username || !password) {
        const error = new Error('账号和密码不能为空');
        error.status = 400;
        throw error;
    }
    const user = await userRepository.findByCredentials(username, password);
    if (!user) {
        const error = new Error('账号或密码错误');
        error.status = 401;
        throw error;
    }
    return user;
}

async function verifyAdminPassword(password) {
    if (!password) {
        const error = new Error('密码不能为空');
        error.status = 400;
        throw error;
    }
    const adminUser = await userRepository.findAdminPassword();
    if (!adminUser) {
        const error = new Error('未找到管理员账户');
        error.status = 404;
        throw error;
    }
    return bcrypt.compare(password, adminUser.password);
}

async function saveUser(id, data) {
    if (!data.name || !data.username || (!id && !data.password)) {
        const error = new Error(id ? '姓名和账号不能为空' : '姓名、账号和密码不能为空');
        error.status = 400;
        throw error;
    }
    return id ? userRepository.updateUser(id, data) : userRepository.createUser(data);
}

async function changePassword(id, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
        const error = new Error('旧密码和新密码不能为空');
        error.status = 400;
        throw error;
    }
    if (newPassword.length < 6) {
        const error = new Error('新密码长度不能少于6位');
        error.status = 400;
        throw error;
    }
    const result = await userRepository.changePassword(id, oldPassword, newPassword);
    if (result === -1) {
        const error = new Error('旧密码不正确');
        error.status = 401;
        throw error;
    }
    if (result === 0) {
        const error = new Error('用户不存在');
        error.status = 404;
        throw error;
    }
}

module.exports = {
    changePassword,
    deleteUser: userRepository.deleteUser,
    getUser: userRepository.getUser,
    listUsers: userRepository.listUsers,
    login,
    resetPassword: userRepository.resetPassword,
    saveUser,
    verifyAdminPassword
};
