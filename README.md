# 安安记 🌱

> 记录宝宝成长的每一天

一个为新生儿父母打造的极简成长记录工具。**无登录、无后端服务器**，打开即用，所有数据存在你设备本地浏览器（IndexedDB），导出后是纯文本 Markdown 文件，可读、可备份、可永久保存。

## ✨ 特性

- 🍼 **极简记录**：喂养、睡眠、尿布、里程碑，一键搞定
- 📁 **数据即文件**：所有记录导出为 Markdown 文件，可用任意编辑器打开
- 🔒 **隐私优先**：无账号、无云端、无追踪，数据只在本机
- 🎨 **温暖设计**：克制、留白、有温度的移动端优先界面

## 🚀 运行方式（两种）

### 方式一：用 VS Code + 终端（推荐）

1. 把 `anan` 这个文件夹复制到任意位置
2. 用 VS Code 打开该文件夹
3. 打开终端（菜单 → 终端 → 新建终端），依次执行：

```bash
npm install      # 第一次需要，安装依赖（稍慢，约 1~3 分钟）
npm run dev      # 启动开发服务器
```

4. 终端会显示 `➜ Local: http://127.0.0.1:5173/`，按住 Ctrl 点击这个链接，或浏览器手动打开即可。

### 方式二：直接用命令行

```bash
cd anan
npm install
npm run dev
```

## 📦 构建生产版本（可选）

```bash
npm run build        # 生成 dist/ 静态文件
npm run preview      # 本地预览构建结果
```

`dist/` 是纯静态文件，可直接托管到任意静态服务器（如 Vercel / 腾讯云 COS / Nginx）。

## 📂 目录结构

```
anan/
├── index.html              # 入口 HTML
├── package.json            # 依赖与脚本
├── vite.config.ts          # Vite 配置（已开放局域网访问）
├── tailwind.config.js      # 设计系统
├── tsconfig*.json          # TypeScript 配置
├── public/                 # 静态资源（favicon）
└── src/
    ├── main.ts             # 应用入口
    ├── App.vue             # 根组件
    ├── style.css           # 全局样式
    ├── types/index.ts      # 数据类型定义
    ├── lib/                # 工具库（db / export / markdown / crypto / utils）
    ├── stores/             # Pinia 状态（user / baby / records）
    ├── router/index.ts     # 路由
    └── views/              # 页面（首页/时间线/记录/设置/档案）
```

## 🗺️ 当前功能

- [x] 宝宝档案（多孩、昵称、性别、生日）
- [x] 喂养 / 睡眠 / 换尿布 / 里程碑记录
- [x] 时间线视图（按日聚合）
- [x] 今日统计看板
- [x] 数据导出 / 导入（.zip，内部为 Markdown）
- [x] 「我是谁」身份（设置里填写称呼与角色）
- [x] 移动端适配 + 局域网访问（同 WiFi 手机可直接打开）

## 🔮 规划中

- [ ] 健康追踪 / 疫苗接种 / 成长曲线 / 照片日记 / PDF 成长册 / 深色主题

---

Made with 🌱 for every parent who wants to cherish every moment.
