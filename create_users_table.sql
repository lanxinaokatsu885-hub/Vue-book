-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '姓名',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '账号',
    password VARCHAR(255) NOT NULL COMMENT '密码',
    role ENUM('employee', 'admin') DEFAULT 'employee' COMMENT '角色：员工或管理员',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_username (username),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户登录表';

-- 插入员工数据（密码使用bcrypt加密）
-- 注意：这里使用明文密码，实际应用中应该使用bcrypt加密
-- 初始密码都是123456

INSERT INTO users (name, username, password, role) VALUES
('戴佳秀', 'DJX123', '123456', 'employee'),
('邓淏堃', 'DHK123', '123456', 'employee'),
('范文', 'FW123', '123456', 'employee'),
('龚纱', 'GS123', '123456', 'employee'),
('甘胤呈', 'GYC123', '123456', 'employee'),
('黄路茜', 'HLX123', '123456', 'employee'),
('贾川', 'JC123', '123456', 'employee'),
('贾庆', 'JQ123', '123456', 'employee'),
('李秉羲', 'LBX123', '123456', 'employee'),
('李豪', 'LH123', '123456', 'employee'),
('李延溯', 'LYS123', '123456', 'employee'),
('李盈盈', 'LYY123', '123456', 'employee'),
('廖航雪', 'LHX123', '123456', 'employee'),
('刘娟', 'LJ123', '123456', 'employee'),
('刘一德', 'LYD123', '123456', 'employee'),
('刘盛友', 'LSY123', '123456', 'employee'),
('罗俊毅', 'LJY123', '123456', 'employee'),
('孙必发', 'SBF123', '123456', 'employee'),
('唐礼豪', 'TLH123', '123456', 'employee'),
('汪鑫烨', 'WXY1234', '123456', 'employee'),
('王宏睿', 'WHR123', '123456', 'employee'),
('王怿萌', 'WYM123', '123456', 'employee'),
('王鑫源', 'WXY123', '123456', 'employee'),
('向欢', 'XH123', '123456', 'employee'),
('杨玉婷', 'YYT123', '123456', 'employee'),
('张艺涵', 'ZYH123', '123456', 'employee'),
('张先龙', 'ZXL123', '123456', 'employee'),
('张意来', 'ZYL123', '123456', 'employee'),
('张鲁阳', 'ZLY123', '123456', 'employee'),
('张巧莹', 'ZQY123', '123456', 'employee'),
('钟琴', 'ZQ123', '123456', 'employee'),
('周俊杰', 'ZJJ123', '123456', 'employee'),
('朱鋆翔', 'ZJX123', '123456', 'employee'),
('管理员', 'jiling666', '654321', 'admin');

-- 查询所有用户
SELECT id, name, username, role, created_at FROM users ORDER BY role DESC, id;
