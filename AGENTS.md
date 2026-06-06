# 图书馆排班系统项目上下文

## 项目概述

这是一个图书馆排班管理系统，用于管理图书馆工作人员的排班、代换班申请、公告和活动发布等功能。系统分为前端和后端两部分，前端负责用户界面和交互，后端负责数据存储和业务逻辑。

## 技术栈

### 前端
- **Vue 3**：渐进式 JavaScript 框架
- **Vite**：前端构建工具
- **Element Plus**：Vue 3 UI 组件库
- **Pinia**：状态管理库
- **Vue Router**：路由管理
- **@element-plus/icons-vue**：图标库
- **HTML5/CSS3/JavaScript**：基础技术（传统页面仍保留）

### 后端
- **Node.js**：运行环境
- **Express**：Web框架
- **MySQL**：数据库
- **Multer**：文件上传
- **mysql2**：数据库驱动

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
├── book/                   # 传统主页面（原始版）
│   ├── bgm/                # 历史遗留音乐资源（当前页面未接入）
│   ├── index.html          # 主页面
│   ├── login.html          # 登录页面
│   ├── script.js           # 主页面逻辑
│   └── style.css           # 主页面样式
├── client/                 # Vue 3 新版前端
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   ├── services/       # API 服务
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── utils/          # 工具函数
│   │   ├── views/          # 页面视图
│   │   ├── App.vue         # 根组件
│   │   ├── main.js         # 入口文件
│   │   ├── router.js       # 路由配置
│   │   └── styles.css      # 全局样式
│   └── index.html          # HTML 入口
├── paiban/                 # 排班编辑页面
│   ├── index.html          # 排班编辑页面
│   ├── script.js           # 排班编辑页面逻辑
│   └── style.css           # 排班编辑页面样式
├── public/                 # 构建产物目录（Vite 打包输出）
│   ├── assets/             # 静态资源
│   └── index.html          # 构建后的入口
├── src/                    # 新版后端源码
│   └── server/
│       ├── config/         # 配置文件
│       ├── constants/      # 常量定义
│       ├── middleware/     # 中间件
│       ├── repositories/   # 数据访问层
│       ├── routes/         # 路由定义
│       ├── services/       # 业务逻辑层
│       ├── utils/          # 工具函数
│       └── app.js          # Express 应用入口
├── speedfind/              # 快速查找功能
│   ├── challenge/          # 挑战模式
│   ├── migrations/         # 数据库迁移脚本
│   └── ...
├── .gitignore              # Git忽略文件
├── add_week_field.sql      # 数据库周次字段添加脚本
├── create_notices_table.sql # 公告表创建脚本
├── create_users_table.sql  # 用户表创建脚本
├── init_database.sql       # 数据库初始化脚本
├── package-lock.json       # NPM依赖锁定文件
├── package.json            # NPM依赖配置
├── server.js               # 主后端入口
├── vite.config.js          # Vite 配置文件
└── 操作文档-代换班记录周次修改.txt # 操作文档
```

## 核心功能

### 1. 排班管理
- **排班编辑**：拖拽式排班，支持多人同时排班
- **周次切换**：按周查看和编辑排班
- **人员管理**：添加、删除、修改用户，重置密码
- **排班冲突检查**：防止同一人在同一时间被排到不同区域
- **工时统计**：自动计算员工工作时数

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

### 4. 用户系统
- **登录认证**：用户身份验证
- **角色权限**：管理员/员工角色区分
- **密码重置**：密码修改与重置

### 5. 其他功能
- **图书查找**：跳转到图书查找链接
- **负责书架**：查看书架负责情况
- **巡查表**：查看巡查记录
- **打卡**：打卡功能
- **当前时间显示**：显示当前时间并高亮当前班次
- **操作历史**：撤销/重做功能、快捷键支持（Ctrl+Z）
- **数据备份**：自动备份至 beifen 目录

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

## 后端架构

### 分层设计
- **Routes 层**：路由定义与请求处理
- **Services 层**：业务逻辑实现
- **Repositories 层**：数据访问与持久化
- **Middleware 层**：请求中间件（如文件上传）
- **Config 层**：配置管理（数据库、路径等）
- **Utils 层**：工具函数（异步处理、排班工具）

## 部署说明

### 本地开发
#### 后端开发
1. **安装依赖**：`npm install`
2. **启动后端服务器**：`npm run dev` 或 `node server.js`
3. **后端地址**：`http://localhost:3000`

#### 前端开发（Vue 3 版）
1. **启动前端开发服务器**：`npm run client:dev`
2. **前端地址**：`http://localhost:5173`
3. **API 代理**：Vite 已配置 /api、/uploads、/static 代理到后端

#### 传统版本访问
- **访问地址**：`http://localhost:3000/book`

### 生产环境
1. **构建前端**：`npm run build`
2. **安装依赖**：`npm install`
3. **配置Nginx**：设置反向代理和静态文件服务
4. **启动PM2**：`pm2 start server.js`
5. **访问地址**：`https://jiling666.cn/book`

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
6. **Vite 代理失败**：确认后端服务器已正常启动在3000端口
7. **Vue 构建问题**：检查 vite.config.js 中的路径配置

## 注意事项

1. **备份数据**：定期备份`beifen`文件夹中的排班数据
2. **权限管理**：确保只有授权用户可以访问排班编辑页面
3. **图片管理**：上传的图片会保存在`uploads`目录，定期清理无用图片
4. **性能优化**：使用CDN缓存静态资源，优化数据库查询
5. **安全性**：使用HTTPS，对密码进行加密存储
6. **开发环境**：建议使用 `npm run dev` 启动后端，`npm run client:dev` 启动前端

## 文档维护规则

### mixed.md 更新规则

- **用途**：记录项目中遇到的所有问题、解决方案和修复历史
- **更新时机**：
  - 每次修复 bug 或问题后
  - 每次解决功能缺陷后
  - 每次排查完技术问题后
- **更新内容**：
  - 问题描述（现象、复现步骤）
  - 根本原因分析
  - 解决方案（具体做了什么）
  - 修改的文件列表
  - 所属分类（前端、排班、代换班、API等）
- **格式**：遵循现有 mixed.md 中的分类结构，添加到相应章节

### Ops.md 更新规则

- **用途**：记录系统运维相关的操作指南、部署流程、故障排查
- **更新时机**：
  - 有新的运维操作说明时
  - 部署流程变更时
  - 新增配置说明时
  - 发现新的运维问题及解决方案时
- **更新内容**：
  - 部署步骤说明
  - 运维命令参考
  - 故障排查指南
  - 备份恢复流程
  - 安全配置建议

### 文档更新流程

1. 完成代码修复或功能变更
2. 立即更新对应文档（mixed.md 或 Ops.md）
3. 如同时涉及问题修复和运维变更，两个文档都更新
4. 在文档中记录当前日期
5. 混合问题先记录到 mixed.md，运维相关再同步到 Ops.md

## 后续优化方向

1. **响应式设计**：进一步优化移动端体验
2. **数据可视化**：添加排班统计和分析功能
3. **通知系统**：添加代换班申请通知
4. **多语言支持**：添加英文界面
5. **API文档**：生成完整的API文档
6. **TypeScript迁移**：考虑将项目迁移到TypeScript以提高代码质量
7. **单元测试**：添加前后端的单元测试覆盖

---

**项目状态**：已完成核心功能开发，正在进行 Vue 3 重构。支持传统版本和 Vue 3 新版本并存。

**项目文档**：
- [mixed.md](file:///f:/开发/book%20-%20副本/mixed.md) - 问题总结与修复历史
- [Ops.md](file:///f:/开发/book%20-%20副本/Ops.md) - 运维说明文档

**最后更新时间**：2026-06-06
