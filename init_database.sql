-- 创建数据库
CREATE DATABASE IF NOT EXISTS paiban_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE paiban_system;

-- 创建数据库用户
CREATE USER IF NOT EXISTS 'paiban_user'@'localhost' IDENTIFIED BY 'abc147258';
GRANT ALL PRIVILEGES ON paiban_system.* TO 'paiban_user'@'localhost';
FLUSH PRIVILEGES;

-- 创建排班数据表
CREATE TABLE IF NOT EXISTS schedule_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data JSON NOT NULL COMMENT '排班数据JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排班数据表';

-- 创建换班申请表
CREATE TABLE IF NOT EXISTS swap_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    applicant VARCHAR(50) NOT NULL COMMENT '申请人',
    original_shift VARCHAR(50) NOT NULL COMMENT '原班次',
    swap_user VARCHAR(50) NOT NULL COMMENT '换班人',
    target_shift VARCHAR(50) COMMENT '目标班次',
    swap_reason TEXT COMMENT '换班原因',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '申请状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_applicant (applicant),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='换班申请表';

-- 创建代班申请表
CREATE TABLE IF NOT EXISTS substitute_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    applicant VARCHAR(50) NOT NULL COMMENT '申请人',
    substitute_user VARCHAR(50) NOT NULL COMMENT '代班人',
    substitute_shift VARCHAR(50) COMMENT '代班班次',
    substitute_reason TEXT COMMENT '代班原因',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '申请状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_applicant (applicant),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代班申请表';

-- 插入初始排班数据（可选）
INSERT INTO schedule_data (data) VALUES ('{
    "schedule_data": [],
    "hour_stats": {
        "罗俊毅": 0,
        "贾川": 0,
        "孙必发": 0,
        "王怿萌": 0,
        "贾庆": 0,
        "张艺涵": 0,
        "王宏睿": 0,
        "李豪": 0,
        "张意来": 0,
        "邓淏堃": 0,
        "向欢": 0,
        "李秉羲": 0,
        "李延溯": 0,
        "钟琴": 0,
        "刘娟": 0,
        "杨玉婷": 0,
        "刘盛友": 0,
        "汪鑫烨": 0,
        "唐礼豪": 0,
        "戴佳秀": 0,
        "范文": 0,
        "朱鋆翔": 0,
        "龚纱": 0,
        "黄路茜": 0,
        "王鑫源": 0,
        "刘一德": 0,
        "张先龙": 0,
        "甘胤呈": 0,
        "周俊杰": 0,
        "张巧莹": 0,
        "李盈盈": 0,
        "张鲁阳": 0,
        "廖航雪": 0
    }
}');

-- 显示数据库信息
SELECT '数据库初始化完成！' AS message;
SHOW TABLES;