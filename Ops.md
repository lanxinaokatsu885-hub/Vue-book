# 图书馆排班系统运维说明

本文档用于指导图书馆排班系统的本地运行、生产部署、数据库维护、备份恢复、日志排查和常见故障处理。

## 1. 系统概览

本项目是图书馆排班管理系统，主要功能包括：

- 排班查看与排班编辑
- 换班、代班申请与撤销
- 公告、活动、负责书架、巡查表发布
- 用户管理、登录认证、密码重置
- 图片上传与预览
- 图书查找、打卡、活动签到/签退链接管理

## 2. 技术栈

- 前端：HTML、CSS、JavaScript
- 后端：Node.js、Express
- 数据库：MySQL
- 文件上传：Multer
- 生产进程管理：PM2
- 生产反向代理：Nginx

## 3. 目录结构

```text
book/
├── book/                    # 用户端页面
│   ├── index.html           # 主页面
│   ├── login.html           # 登录页面
│   ├── script.js            # 主页面脚本
│   ├── style.css            # 主页面样式
│   ├── bgm.html             # 历史遗留音乐页面（当前页面未接入）
│   └── bgm/                 # 历史遗留音乐文件
├── paiban/                  # 排班后台页面
│   ├── index.html
│   ├── script.js
│   └── style.css
├── uploads/                 # 上传图片目录，生产环境必须保留
├── beifen/                  # 排班备份数据目录
├── server.js                # 后端入口
├── package.json             # Node 依赖与启动脚本
├── package-lock.json
├── init_database.sql        # 数据库初始化脚本
├── create_users_table.sql   # 用户表建表脚本
├── create_notices_table.sql # 公告/活动等内容表建表脚本
├── add_week_field.sql       # 代换班记录周次字段迁移脚本
├── server.out.log           # 本地运行 stdout 日志
└── server.err.log           # 本地运行 stderr 日志
```

## 4. 运行环境要求

### 4.1 Node.js

要求：

```text
Node.js >= 14.0.0
```

检查命令：

```powershell
node -v
npm -v
```

### 4.2 MySQL

推荐 MySQL 8.x。

项目默认数据库配置在 `server.js` 中：

```js
const dbConfig = {
    host: 'localhost',
    user: 'paiban_user',
    password: 'abc147258',
    database: 'paiban_system'
};
```

如果生产环境密码不同，必须同步修改 `server.js` 或改造为环境变量配置。

## 5. 本地启动

### 5.1 安装依赖

在项目根目录执行：

```powershell
cd F:\开发\book
npm install
```

### 5.2 初始化数据库

使用 root 或有权限的 MySQL 用户执行：

```powershell
mysql -u root -p < init_database.sql
mysql -u root -p paiban_system < create_users_table.sql
mysql -u root -p paiban_system < create_notices_table.sql
mysql -u root -p paiban_system < add_week_field.sql
```

如果本机 `mysql` 不在 PATH 中，可使用完整路径，例如：

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p paiban_system
```

### 5.3 启动服务

```powershell
npm start
```

等价于：

```powershell
node server.js
```

服务默认监听：

```text
http://localhost:3000
```

常用访问地址：

```text
用户端：http://localhost:3000/index.html
登录页：http://localhost:3000/login.html
排班后台：http://localhost:3000/paiban/index.html
健康检查：http://localhost:3000/api/health
```

### 5.4 Vue 3 本地开发启动

Vue 3 前端开发时需要同时启动后端和前端：

```powershell
node server.js
npm run client:dev
```

前端默认地址：

```text
http://localhost:5173
```

Vite 已将 `/api`、`/uploads`、`/static` 代理到后端 `http://127.0.0.1:3000`。如果登录页能打开但无法登录，先确认后端端口已监听：

```powershell
Get-NetTCPConnection -LocalPort 3000
```

再验证前端代理是否能访问后端：

```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:5173/api/list-weeks" -UseBasicParsing
```

如果返回 `code: 200`，说明代理和后端连接正常；如果无法连接到远程服务器，先启动或重启 `node server.js`。

### 5.5 本地后台运行

Windows 下可使用：

```powershell
Start-Process -FilePath "node" `
  -ArgumentList "server.js" `
  -WorkingDirectory "F:\开发\book" `
  -RedirectStandardOutput "F:\开发\book\server.out.log" `
  -RedirectStandardError "F:\开发\book\server.err.log" `
  -WindowStyle Hidden
```

查看进程：

```powershell
Get-Process node
```

查看端口：

```powershell
Get-NetTCPConnection -LocalPort 3000
```

停止本地 Node 服务：

```powershell
Stop-Process -Id <进程ID>
```

## 6. 生产部署

### 6.1 推荐部署路径

```text
/var/www/book
```

### 6.2 安装依赖

```bash
cd /var/www/book
npm install --production
```

### 6.3 使用 PM2 启动

```bash
pm2 start server.js --name paiban-server
pm2 save
pm2 startup
```

查看状态：

```bash
pm2 status
```

重启：

```bash
pm2 restart paiban-server
```

停止：

```bash
pm2 stop paiban-server
```

查看日志：

```bash
pm2 logs paiban-server
```

常见 PM2 日志路径：

```text
/root/.pm2/logs/paiban-server-out.log
/root/.pm2/logs/paiban-server-error.log
```

### 6.4 Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查配置：

```bash
nginx -t
```

重载：

```bash
systemctl reload nginx
```

## 7. 数据库说明

### 7.1 数据库

```text
数据库名：paiban_system
默认用户：paiban_user
默认密码：abc147258
```

### 7.2 核心表

```text
users                  用户表
schedule_data          排班数据表
swap_requests          换班申请表
substitute_requests    代班申请表
notices                公告、活动、负责书架、巡查表内容表
links                  打卡、活动签到、图书查找等链接表
```

### 7.3 快速检查

```sql
USE paiban_system;
SHOW TABLES;

SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM schedule_data;
SELECT COUNT(*) FROM swap_requests;
SELECT COUNT(*) FROM substitute_requests;
SELECT COUNT(*) FROM notices;
SELECT COUNT(*) FROM links;
```

### 7.4 健康检查接口

```text
GET /api/health
```

正常返回示例：

```json
{
  "code": 200,
  "msg": "服务正常运行",
  "data": {
    "timestamp": "2026-05-13T00:00:00.000Z"
  }
}
```

注意：`/api/health` 只表示 Node 服务运行中，不等价于所有数据库接口正常。数据库是否正常需要进一步访问 `/api/users`、`/api/schedule-data` 等接口确认。

## 8. 备份策略

### 8.1 必须备份的内容

至少备份：

```text
MySQL 数据库 paiban_system
uploads/ 上传图片目录
beifen/ 排班备份目录
server.js
book/
paiban/
```

其中 `uploads/` 非常重要。公告、活动、负责书架、巡查表中的图片通常只在数据库中保存路径，真实文件在 `uploads/` 目录。

### 8.2 数据库备份

Linux：

```bash
mysqldump -u root -p --default-character-set=utf8mb4 paiban_system > paiban_system_$(date +%F_%H%M%S).sql
```

Windows PowerShell：

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
  -u root -p `
  --default-character-set=utf8mb4 `
  paiban_system `
  > "F:\backup\paiban_system_$(Get-Date -Format yyyyMMdd_HHmmss).sql"
```

### 8.3 文件备份

Linux：

```bash
tar -czf uploads_$(date +%F_%H%M%S).tar.gz uploads
tar -czf beifen_$(date +%F_%H%M%S).tar.gz beifen
```

Windows 可直接压缩目录，或使用资源管理器复制到备份盘。

注意：本项目约束禁止批量删除文件或目录。清理旧备份时不要使用 `rm -rf`、`Remove-Item -Recurse`、`rmdir /s` 等批量删除命令。需要清理时应人工确认后逐个明确文件删除。

## 9. 恢复流程

### 9.1 恢复数据库

```bash
mysql -u root -p --default-character-set=utf8mb4 paiban_system < backup.sql
```

Windows 示例：

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" `
  -u root -p `
  --default-character-set=utf8mb4 `
  paiban_system `
  < "F:\backup\paiban_system.sql"
```

### 9.2 恢复上传文件

将备份的 `uploads/` 恢复到项目根目录：

```text
book/uploads/
```

恢复后确认图片可访问：

```text
http://localhost:3000/uploads/图片文件名
```

### 9.3 恢复后检查

```bash
pm2 restart paiban-server
pm2 logs paiban-server
```

检查：

```text
/api/health
/api/users
/api/schedule-data
/api/shelf
/api/inspect
```

## 10. 日常发布流程

### 10.1 发布前检查

```bash
node --check server.js
npm install
```

前端静态文件无构建步骤，但修改 JS/CSS 后建议更新 HTML 中的版本参数，例如：

```html
<script src="script.js?v=1.0.4"></script>
```

这样可避免浏览器继续缓存旧脚本。

### 10.2 发布步骤

1. 备份数据库。
2. 备份 `uploads/`。
3. 上传代码到服务器。
4. 执行 `npm install --production`。
5. 执行 `node --check server.js`。
6. 重启 PM2。
7. 检查日志和核心页面。

示例：

```bash
cd /var/www/book
npm install --production
node --check server.js
pm2 restart paiban-server
pm2 logs paiban-server --lines 50
```

## 11. 常用运维命令

### 11.1 查看服务状态

```bash
pm2 status
pm2 describe paiban-server
```

### 11.2 查看日志

```bash
pm2 logs paiban-server
tail -n 100 /root/.pm2/logs/paiban-server-out.log
tail -n 100 /root/.pm2/logs/paiban-server-error.log
```

### 11.3 查看端口占用

Linux：

```bash
ss -lntp | grep 3000
```

Windows：

```powershell
Get-NetTCPConnection -LocalPort 3000
```

### 11.4 检查数据库连接

```bash
mysql -u paiban_user -pabc147258 -e "SELECT DATABASE();" paiban_system
```

### 11.5 检查接口

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/users
curl http://127.0.0.1:3000/api/shelf
curl http://127.0.0.1:3000/api/inspect
```

## 12. 常见故障处理

### 12.1 页面打不开

检查顺序：

1. Node 服务是否运行。
2. 端口 3000 是否监听。
3. PM2 是否异常退出。
4. Nginx 是否正常代理。
5. 防火墙或安全组是否放行端口 80/443。

命令：

```bash
pm2 status
ss -lntp | grep 3000
nginx -t
systemctl status nginx
```

### 12.2 数据库连接失败

典型日志：

```text
Access denied for user 'paiban_user'@'localhost'
```

处理：

```sql
CREATE USER IF NOT EXISTS 'paiban_user'@'localhost' IDENTIFIED BY 'abc147258';
ALTER USER 'paiban_user'@'localhost' IDENTIFIED BY 'abc147258';
GRANT ALL PRIVILEGES ON paiban_system.* TO 'paiban_user'@'localhost';
FLUSH PRIVILEGES;
```

然后重启服务：

```bash
pm2 restart paiban-server
```

### 12.3 server.js 语法错误

典型日志：

```text
SyntaxError: missing ) after argument list
```

处理：

```bash
cd /var/www/book
node --check server.js
```

根据输出行号修复。修复后：

```bash
pm2 restart paiban-server
pm2 logs paiban-server --lines 50
```

### 12.4 图片 404

检查：

1. 图片文件是否存在于 `uploads/`。
2. 数据库中保存的路径是否以 `/uploads/` 开头。
3. `server.js` 是否包含：

```js
app.use('/uploads', express.static(uploadDir));
```

4. Nginx 是否正确转发到 Node 服务。

### 12.5 公告、活动、负责书架、巡查表不显示

检查接口：

```text
/api/notice
/api/activity
/api/shelf
/api/inspect
```

检查 `notices` 表：

```sql
SELECT id, type, content, images, image_url, updated_at
FROM notices
ORDER BY id DESC;
```

其中：

```text
type = notice   公告
type = activity 活动
type = shelf    负责书架
type = inspect  巡查表
```

### 12.6 前端按钮点击无反应

检查浏览器控制台是否有 JavaScript 报错。

重点检查：

- HTML 中按钮 ID 是否和 `script.js` 中一致。
- 弹窗容器 ID 是否存在。
- 修改 JS 后是否更新了版本号参数。
- 浏览器是否缓存旧脚本。

例如主页面脚本：

```html
<script src="script.js?v=1.0.3"></script>
```

### 12.7 上传失败

检查：

1. `uploads/` 目录是否存在。
2. Node 进程是否有写入权限。
3. 文件大小是否超过限制。
4. 文件格式是否为 `jpeg/jpg/png/gif/webp`。
5. Nginx `client_max_body_size` 是否足够。

项目当前上传限制在 `server.js` 中：

```js
limits: { fileSize: 10 * 1024 * 1024 }
```

即单文件最大 10MB。

## 13. 安全建议

当前项目仍有一些需要注意的安全点：

1. 数据库账号密码写在 `server.js` 中，生产环境建议改为环境变量。
2. 用户密码当前以明文形式存储，建议后续改为 bcrypt 哈希。
3. 后台管理入口应限制权限，避免未授权访问。
4. 生产环境必须使用 HTTPS。
5. 上传目录应限制文件类型，当前已限制常见图片格式，但仍建议定期检查异常文件。
6. 不要将数据库备份文件放在 Web 可访问目录下。

## 14. 数据库导入说明

如果需要导入单表 SQL，例如：

```text
links.sql
notices.sql
schedule_data.sql
substitute_requests.sql
swap_requests.sql
users.sql
```

建议先确认目标表是否为空：

```sql
SELECT COUNT(*) FROM links;
SELECT COUNT(*) FROM notices;
SELECT COUNT(*) FROM schedule_data;
SELECT COUNT(*) FROM substitute_requests;
SELECT COUNT(*) FROM swap_requests;
SELECT COUNT(*) FROM users;
```

如果表不为空，直接导入可能出现主键重复或数据重复。导入前必须明确是追加数据还是覆盖数据。

Windows 路径包含中文时，`mysql SOURCE` 可能无法识别路径。可使用 PowerShell 管道导入：

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Get-Content -Raw -Encoding UTF8 "D:\桌面\users.sql" |
  & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" `
    -h localhost `
    -u root `
    -p `
    --default-character-set=utf8mb4 `
    paiban_system
```

## 15. 运维检查清单

每日检查：

- 页面是否可访问
- `/api/health` 是否正常
- PM2 是否在线
- 错误日志是否有新增异常

每周检查：

- 数据库备份是否成功
- `uploads/` 是否已备份
- 磁盘空间是否充足
- 是否有大量 404 图片请求

每次发布前：

- 备份数据库
- 备份上传文件
- `node --check server.js`
- 更新前端静态资源版本号
- 发布后检查核心功能

## 16. 关键地址汇总

本地：

```text
http://localhost:3000/index.html
http://localhost:3000/login.html
http://localhost:3000/paiban/index.html
http://localhost:3000/api/health
```

生产：

```text
https://你的域名/index.html
https://你的域名/login.html
https://你的域名/paiban/index.html
https://你的域名/api/health
```

## 17. 注意事项

- 不要批量删除项目文件或目录。
- 不要删除 `uploads/`，否则公告、活动、负责书架、巡查表图片会丢失。
- 不要删除 `beifen/`，其中可能包含排班备份。
- 不要在未备份数据库的情况下执行结构调整或批量导入。
- 生产环境修改 `server.js` 后必须重启 PM2。
- 修改前端 JS/CSS 后建议修改 HTML 中的版本号参数，避免缓存问题。
## 2026-06-07 排班误删恢复操作

当管理员误删某个周次排班时，系统会先把 `schedule_data` 中被删除的记录归档到 `schedule_data_archive`，再执行删除。`beifen/*.json` 本地备份文件不会再随删除操作一起删除。

查看最近归档记录：

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/schedule-archives" -Method Get
```

查看指定周次归档记录：

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/schedule-archives?week=第一周" -Method Get
```

恢复指定周次最近一次归档：

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/restore-schedule" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"week":"第一周"}'
```

恢复后刷新排班编辑页面，确认该周次数据是否恢复。生产环境修改后需要重启 Node/PM2 服务，让新增接口生效。
