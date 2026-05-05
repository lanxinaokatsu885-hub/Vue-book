-- 创建公告和活动表
CREATE TABLE IF NOT EXISTS notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL COMMENT '类型：notice(公告) 或 activity(活动)',
    content TEXT COMMENT '文本内容',
    images TEXT COMMENT '图片URL数组(JSON格式)',
    image_url TEXT COMMENT '图片URL(兼容旧格式)',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告和活动表';
