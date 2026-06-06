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
    const adminPassword = await userRepository.findAdminPassword();
    if (!adminPassword) {
        const error = new Error('未找到管理员账户');
        error.status = 404;
        throw error;
    }
    return password === adminPassword;
}

async function saveUser(id, data) {
    if (!data.name || !data.username || (!id && !data.password)) {
        const error = new Error(id ? '姓名和账号不能为空' : '姓名、账号和密码不能为空');
        error.status = 400;
        throw error;
    }
    return id ? userRepository.updateUser(id, data) : userRepository.createUser(data);
}

module.exports = {
    deleteUser: userRepository.deleteUser,
    getUser: userRepository.getUser,
    listUsers: userRepository.listUsers,
    login,
    resetPassword: userRepository.resetPassword,
    saveUser,
    verifyAdminPassword
};
