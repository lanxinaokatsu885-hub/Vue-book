# 图书馆排班系统项目上下文

## 项目概述

这是一个图书馆排班管理系统，用于管理图书馆工作人员的排班、代换班申请、公告和活动发布等功能。系统分为前端和后端两部分，前端负责用户界面和交互，后端负责数据存储和业务逻辑。

## 技术栈

### 前端
- **HTML5**：页面结构
- **CSS3**：样式设计
- **JavaScript**：交互逻辑
- **Tailwind CSS**：响应式布局（部分使用）

### 后端
- **Node.js**：运行环境
- **Express**：Web框架
- **MySQL**：数据库
- **Multer**：文件上传

### 其他
- **Nginx**：反向代理（生产环境）
- **PM2**：进程管理（生产环境）

## 项目结构

```
book/
├── .claude/                # Claude IDE 配置
├── beifen/                 # 备份文件夹
│   ├── 第一周.json         # 第一周排班备份
│   ├── 第二周.json         # 第二周排班备份
│   ├── 第三周.json         # 第三周排班备份
│   └── 第四周.json         # 第四周排班备份
├── book/                   # 主页面相关文件
│   ├── bgm/                # 背景音乐文件夹
│   │   ├── Where Did U Go - G.E.M. 邓紫棋.mp3
│   │   ├── 同进退 - 倪浩毅.mp3
│   │   ├── 够爱 - 曾沛慈.mp3
│   │   ├── 天问 - 刘宇宁.mp3
│   │   ├── 富士山下 - 陈奕迅.mp3
│   │   ├── 恶作剧 - 王蓝茵.mp3
│   │   ├── 愿与愁 - 林俊杰.mp3
│   │   ├── 晴天 - 周杰伦.mp3
│   │   ├── 知我 - 国风堂、哦漏.mp3
│   │   ├── 秘密基地 - 棒棒堂.mp3
│   │   └── 问情 - 陈亦洺、尚辰.mp3
│   ├── 1.jpg               # 图片资源
│   ├── 2.jpg
│   ├── 3.jpg
│   ├── 4.jpg
│   ├── bgm.html            # BGM播放页面
│   ├── index.html          # 主页面
│   ├── login.html          # 登录页面
│   ├── script.js           # 主页面逻辑
│   └── style.css           # 主页面样式
├── paiban/                 # 排班编辑页面
│   ├── index.html          # 排班编辑页面
│   ├── script.js           # 排班编辑页面逻辑
│   └── style.css           # 排班编辑页面样式
├── speedfind/              # 快速查找功能（可能是图书查找）
│   ├── challenge/          # 挑战模式
│   ├── migrations/         # 数据库迁移脚本
│   ├── index.html          # 快速查找页面
│   ├── package.json        # 依赖配置
│   ├── script.js           # 快速查找逻辑
│   ├── server.js           # 快速查找后端
│   └── style.css           # 快速查找样式
├── .gitignore              # Git忽略文件
├── add_week_field.sql      # 数据库周次字段添加脚本
├── create_notices_table.sql # 公告表创建脚本
├── create_users_table.sql  # 用户表创建脚本
├── init_database.sql       # 数据库初始化脚本
├── package-lock.json       # NPM依赖锁定文件
├── package.json            # NPM依赖配置
├── server.js               # 主后端API
└── 操作文档-代换班记录周次修改.txt # 操作文档
```

## 核心功能

### 1. 排班管理
- **排班编辑**：拖拽式排班，支持多人同时排班
- **周次切换**：按周查看和编辑排班
- **人员管理**：添加、删除、修改用户，重置密码
- **排班冲突检查**：防止同一人在同一时间被排到不同区域

### 2. 代换班系统
- **换班申请**：与他人换班
- **代班申请**：请他人代班
- **撤销代换班**：撤销已提交的申请
- **代换班记录**：按周查看代换班记录

### 3. 公告和活动
- **公告发布**：发布带有图片的公告
- **活动发布**：发布带有图片的活动
- **图片预览**：点击图片可预览大图
- **活动签到/签退**：跳转到签到/签退链接

### 4. 其他功能
- **图书查找**：跳转到图书查找链接
- **负责书架**：查看书架负责情况
- **巡查表**：查看巡查记录
- **打卡**：打卡功能
- **BGM播放**：随机播放背景音乐
- **当前时间显示**：显示当前时间并高亮当前班次
- **备案号**：底部显示备案号信息

## 数据库结构

### 1. users表
- **id**：用户ID
- **username**：用户名
- **password**：密码（加密存储）
- **role**：角色（normal:普通管理员, scheduler:排班员）

### 2. schedule表
- **id**：记录ID
- **week**：周次
- **data**：排班数据（JSON格式）

### 3. swap_requests表（换班申请）
- **id**：申请ID
- **requester**：申请人
- **receiver**：接收人
- **date**：日期
- **shift**：班次
- **status**：状态（pending:待处理, approved:已批准, rejected:已拒绝）
- **week**：周次

### 4. substitute_requests表（代班申请）
- **id**：申请ID
- **requester**：申请人
- **receiver**：接收人
- **date**：日期
- **shift**：班次
- **status**：状态（pending:待处理, approved:已批准, rejected:已拒绝）
- **week**：周次

### 5. notices表（公告和活动）
- **id**：记录ID
- **text**：文本内容
- **image**：图片（单图）
- **images**：图片数组（多图）
- **type**：类型（notice:公告, activity:活动）
- **created_at**：创建时间

## 部署说明

### 本地开发
1. **安装依赖**：`npm install`
2. **启动服务器**：`node server.js`
3. **访问地址**：`http://localhost:3000/book`

### 生产环境
1. **安装依赖**：`npm install`
2. **配置Nginx**：设置反向代理和静态文件服务
3. **启动PM2**：`pm2 start server.js`
4. **访问地址**：`https://jiling666.cn/book`

## 关键API

### 1. 排班相关
- **GET /api/schedule**：获取排班数据
- **POST /api/schedule**：保存排班数据
- **GET /api/list-weeks**：获取周次列表

### 2. 代换班相关
- **POST /api/swap-shift**：提交换班申请
- **POST /api/substitute**：提交代班申请
- **POST /api/approve-request**：批准代换班申请
- **POST /api/reject-request**：拒绝代换班申请
- **POST /api/revoke-request**：撤销代换班申请
- **GET /api/swap-requests**：获取换班申请
- **GET /api/substitute-requests**：获取代班申请

### 3. 用户相关
- **POST /api/login**：登录
- **POST /api/logout**：登出
- **GET /api/users**：获取用户列表
- **POST /api/users**：添加用户
- **PUT /api/users**：更新用户
- **DELETE /api/users**：删除用户
- **POST /api/reset-password**：重置密码

### 4. 公告和活动相关
- **GET /api/notice**：获取公告
- **POST /api/notice**：保存公告
- **GET /api/activity**：获取活动
- **POST /api/activity**：保存活动

### 5. 其他
- **POST /api/upload**：上传文件
- **DELETE /api/delete-image**：删除图片

## 常见问题

1. **图片404错误**：检查Nginx配置是否正确处理`/uploads`路径
2. **排班表未更新**：检查数据格式是否正确，确保使用`areas`结构
3. **代换班记录周次不同步**：确保数据库表中有`week`字段
4. **浏览器缓存问题**：为静态资源添加版本号
5. **数据库连接错误**：使用连接池替代单个连接

## 注意事项

1. **备份数据**：定期备份`beifen`文件夹中的排班数据
2. **权限管理**：确保只有授权用户可以访问排班编辑页面
3. **图片管理**：上传的图片会保存在`uploads`目录，定期清理无用图片
4. **性能优化**：使用CDN缓存静态资源，优化数据库查询
5. **安全性**：使用HTTPS，对密码进行加密存储

## 后续优化方向

1. **响应式设计**：进一步优化移动端体验
2. **数据可视化**：添加排班统计和分析功能
3. **通知系统**：添加代换班申请通知
4. **多语言支持**：添加英文界面
5. **API文档**：生成完整的API文档

---

**项目状态**：已完成核心功能开发，正在维护和优化中。

**最后更新时间**：2026-04-15