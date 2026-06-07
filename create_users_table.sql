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

-- 插入员工数据（密码已使用 SHA-256 + bcrypt 双层加密）
-- 员工初始密码：123456（先 SHA-256 哈希，再 bcrypt 加密）
-- 管理员初始密码：654321（先 SHA-256 哈希，再 bcrypt 加密）

INSERT INTO users (name, username, password, role) VALUES
('戴佳秀', 'DJX123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('邓淏堃', 'DHK123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('范文', 'FW123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('龚纱', 'GS123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('甘胤呈', 'GYC123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('黄路茜', 'HLX123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('贾川', 'JC123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('贾庆', 'JQ123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('李秉羲', 'LBX123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('李豪', 'LH123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('李延溯', 'LYS123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('李盈盈', 'LYY123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('廖航雪', 'LHX123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('刘娟', 'LJ123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('刘一德', 'LYD123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('刘盛友', 'LSY123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('罗俊毅', 'LJY123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('孙必发', 'SBF123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('唐礼豪', 'TLH123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('汪鑫烨', 'WXY1234', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('王宏睿', 'WHR123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('王怿萌', 'WYM123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('王鑫源', 'WXY123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('向欢', 'XH123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('杨玉婷', 'YYT123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('张艺涵', 'ZYH123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('张先龙', 'ZXL123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('张意来', 'ZYL123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('张鲁阳', 'ZLY123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('张巧莹', 'ZQY123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('钟琴', 'ZQ123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('周俊杰', 'ZJJ123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('朱鋆翔', 'ZJX123', '$2b$10$rvu8CdZ7s8Yv.bK6GCWu3e8NShggWIcMZ3KaZV2WN2PLqDCMnObAy', 'employee'),
('管理员', 'jiling666', '$2b$10$9V9St2IgOi48Wm77jlAaNepT5KrriY5iTXrAhYVY0cGVnx6OK1zbG', 'admin');

-- 查询所有用户
SELECT id, name, username, role, created_at FROM users ORDER BY role DESC, id;
