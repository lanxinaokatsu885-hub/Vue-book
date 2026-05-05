-- 为换班申请表添加周次字段
ALTER TABLE swap_requests ADD COLUMN week VARCHAR(20) COMMENT '周次' AFTER status;

-- 为代班申请表添加周次字段
ALTER TABLE substitute_requests ADD COLUMN week VARCHAR(20) COMMENT '周次' AFTER status;

-- 显示表结构确认
DESCRIBE swap_requests;
DESCRIBE substitute_requests;

SELECT '周次字段添加成功！' AS message;
