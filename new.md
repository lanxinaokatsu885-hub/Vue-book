# 图书馆排班系统 - 功能更新记录

---

## 2026-06-07

### 用户端背景和按钮图标视觉升级
- **更新类型**：用户体验优化
- **更新内容**：
  - 将用户端主功能按钮的线框 SVG 替换为带半透明底板的实心图标
  - 顶部修改密码、退出登录图标改为实心样式，减少“未渲染线框”的观感
  - 重新设计用户端背景，改为浅色纸张网格、书架纹理和半透明面板组合
  - 优化记录面板、排班面板和功能按钮区的边框、阴影与背景层次
- **修改文件**：
  - [client/src/views/HomeView.vue](file:///f:/开发/book%20-%20副本/client/src/views/HomeView.vue) - 替换用户端按钮 SVG 图标和顶部操作图标
  - [client/src/styles.css](file:///f:/开发/book%20-%20副本/client/src/styles.css) - 优化用户端背景、面板质感和按钮图标样式
- **影响范围**：用户端首页视觉展示、功能按钮区

### 移除旧版图片背景资源
- **更新类型**：功能精简
- **更新内容**：
  - 删除原有 `public/1.jpg`、`public/3.jpg` 图片资源
  - 登录窗口品牌图改为内联书本 SVG，避免本地开发环境出现破图
  - 登录页主视觉背景和用户端背景改为 CSS 渐变装饰，不再依赖旧图片文件
- **修改文件**：
  - [client/src/views/LoginView.vue](file:///f:/开发/book%20-%20副本/client/src/views/LoginView.vue) - 移除 `logoSrc` 图片引用并改用内联 SVG
  - [client/src/styles.css](file:///f:/开发/book%20-%20副本/client/src/styles.css) - 移除 `/1.jpg`、`/3.jpg` 背景引用
  - [public/1.jpg](file:///f:/开发/book%20-%20副本/public/1.jpg) - 删除旧登录图片资源
  - [public/3.jpg](file:///f:/开发/book%20-%20副本/public/3.jpg) - 删除旧背景图片资源
- **影响范围**：登录页视觉展示、用户端背景展示、静态资源

### 登录窗口 UI 优化
- **更新类型**：用户体验优化
- **更新内容**：
  - 重构右侧登录窗口结构，增加顶部品牌区和分割线，减少空旷感
  - 优化登录卡片背景、边框、阴影、输入框聚焦态和登录按钮层次
  - 为账号和密码输入框添加前缀图标，提升表单识别度
  - 补充小屏适配，避免移动端登录卡片贴边或占用过高
  - 优化后端未启动时的 API 错误提示，便于快速定位本地登录失败原因
- **修改文件**：
  - [client/src/views/LoginView.vue](file:///f:/开发/book%20-%20副本/client/src/views/LoginView.vue) - 调整登录窗口模板结构和输入框图标
  - [client/src/styles.css](file:///f:/开发/book%20-%20副本/client/src/styles.css) - 优化登录窗口视觉样式和响应式规则
  - [client/src/services/api.js](file:///f:/开发/book%20-%20副本/client/src/services/api.js) - 补充后端服务连接失败提示
- **影响范围**：登录页视觉展示、登录表单交互

### 登录页 SVG 装饰渲染修复
- **更新类型**：修复BUG
- **更新内容**：
  - 修复登录页浮动 SVG 装饰只有低透明描边、主体图案不明显的问题
  - 改为径向光晕、渐变书页填充和辅助光点组合，增强图案可辨识度
  - 为装饰 SVG 补充层级控制，避免影响登录页文案可读性
- **修改文件**：
  - [client/src/views/LoginView.vue](file:///f:/开发/book%20-%20副本/client/src/views/LoginView.vue) - 调整登录页浮动装饰 SVG 结构
  - [client/src/styles.css](file:///f:/开发/book%20-%20副本/client/src/styles.css) - 调整装饰透明度、层级和混合显示效果
- **影响范围**：登录页视觉展示

### 0. 新增用户自行修改密码功能
- **更新类型**：新功能
- **更新内容**：
  - **前端实现**：
    - 在 HomeView 首页 header 用户区域添加"修改密码"和"退出登录"两个独立图标按钮
    - 新增修改密码弹窗，包含旧密码、新密码、确认密码三个输入框
    - 新密码校验：长度不少于6位、两次输入一致
    - 修改密码成功后自动退出登录并跳转到登录页
    - 前端 API 层新增 `changePassword` 方法，使用 SHA-256 哈希后发送请求
  - **后端实现**：
    - 新增 `PUT /api/users/:id/change-password` 接口，验证旧密码后更新为新密码
    - userRepository 新增 `changePassword` 方法，验证旧密码 bcrypt 哈希匹配
    - userService 新增 `changePassword` 方法，添加业务校验（密码非空、长度验证）
    - 使用 SHA-256 + bcrypt 双层加密存储新密码
- **修改文件**：
  - [client/src/services/api.js](file:///f:/开发/book%20-%20副本/client/src/services/api.js) - 新增 changePassword 方法
  - [client/src/views/HomeView.vue](file:///f:/开发/book%20-%20副本/client/src/views/HomeView.vue) - 添加按钮、弹窗、响应式变量、方法和样式
  - [src/server/routes/userRoutes.js](file:///f:/开发/book%20-%20副本/src/server/routes/userRoutes.js) - 新增 change-password 路由
  - [src/server/repositories/userRepository.js](file:///f:/开发/book%20-%20副本/src/server/repositories/userRepository.js) - 新增 changePassword 数据访问方法
  - [src/server/services/userService.js](file:///f:/开发/book%20-%20副本/src/server/services/userService.js) - 新增 changePassword 业务逻辑方法
- **影响范围**：用户系统（前后端）

### 1. 密码安全升级（双层加密）
- **更新类型**：安全增强
- **更新内容**：
  - 实现 SHA-256 + bcrypt 双层密码加密
  - 前端使用 Web Crypto API 对密码进行 SHA-256 哈希
  - 后端使用 bcrypt 对 SHA-256 哈希值进行二次加密存储
  - DevTools Network 面板不再显示明文密码
- **修改文件**：
  - [client/src/services/api.js](file:///f:/开发/book - 副本/client/src/services/api.js)
  - [book/login.html](file:///f:/开发/book - 副本/book/login.html)
  - [src/server/repositories/userRepository.js](file:///f:/开发/book - 副本/src/server/repositories/userRepository.js)
  - [src/server/services/userService.js](file:///f:/开发/book - 副本/src/server/services/userService.js)
  - [migrate_passwords.js](file:///f:/开发/book - 副本/migrate_passwords.js)
- **影响范围**：用户登录、密码重置、用户管理

### 2. 管理端人员标签和排班冲突校验补强
- **更新类型**：功能优化
- **更新内容**：
  - 人员标签和单元格候选人员过滤管理员角色
  - 人员管理弹窗新增姓名、账号、角色搜索功能
  - 单元格人员写入统一校验：
    - 最多 2 人
    - 禁止管理员参与排班
    - 禁止同一人同一天同一班次跨区域重复排班
- **修改文件**：
  - [client/src/views/AdminView.vue](file:///f:/开发/book - 副本/client/src/views/AdminView.vue)
  - [client/src/styles.css](file:///f:/开发/book - 副本/client/src/styles.css)
- **影响范围**：排班编辑、人员管理

### 3. Vue 管理端还原旧版编辑台操作习惯
- **更新类型**：用户体验优化
- **更新内容**：
  - 将 `/paiban` 正式命名为"管理端"
  - 首页入口文案改为"编辑管理"
  - 管理端顶部工具条恢复旧版顺序：快速批注、撤回、清空、保存、加载、内容编辑、人员管理、链接管理
  - 人员标签池、排班表、星期列底色、批注文案和工时统计按旧版样式还原
- **修改文件**：
  - [client/src/views/AdminView.vue](file:///f:/开发/book - 副本/client/src/views/AdminView.vue)
  - [client/src/views/HomeView.vue](file:///f:/开发/book - 副本/client/src/views/HomeView.vue)
  - [client/src/components/ScheduleBoard.vue](file:///f:/开发/book - 副本/client/src/components/ScheduleBoard.vue)
  - [client/src/styles.css](file:///f:/开发/book - 副本/client/src/styles.css)
- **影响范围**：管理端界面、首页导航

---

## 2026-06-06

### 4. Vue 用户端首页还原旧版操作习惯
- **更新类型**：用户体验优化
- **更新内容**：
  - 将 Vue 首页调整为旧版顺序：蓝色顶栏、换班/代班记录折叠面板、功能按钮区、排班表折叠面板、底部备案
  - 新增限定在 `.legacy-book-page` 下的样式
  - 恢复旧版背景图、按钮渐变、面板颜色和排班表观感
- **修改文件**：
  - [client/src/views/HomeView.vue](file:///f:/开发/book - 副本/client/src/views/HomeView.vue)
  - [client/src/styles.css](file:///f:/开发/book - 副本/client/src/styles.css)
- **影响范围**：用户端首页

## 说明

本文档用于记录项目的功能更新、安全增强、体验优化等重要变更。每次更新请按以下格式记录：

```markdown
## YYYY-MM-DD

### X. 更新标题
- **更新类型**：安全增强 | 功能优化 | 功能精简 | 新功能 | 修复BUG
- **更新内容**：简要描述更新内容
- **修改文件**：列出相关文件（使用相对路径）
- **影响范围**：说明影响的功能模块
```

---

**文档版本**：v1.0\
**创建日期**：2026年6月7日
