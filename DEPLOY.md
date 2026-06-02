# 自托管 edgetunnel 管理页模板

本目录是从官方 [EDT-Pages/EDT-Pages.github.io](https://github.com/EDT-Pages/EDT-Pages.github.io) 克隆的**静态管理页**，供你的 VPN Worker 拉取 `/login`、`/admin` 等页面。

你的 Worker（`_worker.js`）默认已指向 `https://whoopsll.github.io/edt-pages`；也可在 VPN 项目环境变量 **`ADMIN_PAGES`** 覆盖（勿末尾 `/`）。

---

## 已替你改好的内容（相对官方）

| 位置 | 改动 |
|------|------|
| `admin/index.html` | 模式切换：`高级配置` / `基础配置` |
| `admin/index.html` | 移除底部 GitHub、Telegram、版本升级弹窗 |
| `admin/index.html` | `renderUI` 订阅链接改为可选 DOM（兼容 Worker 多订阅替换） |
| `admin/index.html` | 不再调用 `loadVersionByUUID` |

**多订阅列表 UI** 仍由 VPN 的 `_worker.js` 在运行时注入（替换 `<!-- 模块1: 订阅链接 -->`），不必写进本仓库。

**以后改管理页**：只改本仓库 → push → GitHub Pages 自动更新；**不必**再改 Worker 里的 HTML 字符串替换。

---

## 你还要改的话，看这些文件

| 文件 | 用途 |
|------|------|
| **`admin/index.html`** | 管理后台（单文件，体积大，含全部 CSS/JS）。改 UI 文案、样式都在这里搜。 |
| **`login/index.html`** | 登录页 |
| **`noADMIN/index.html`** | 未设置 ADMIN 时的提示 |
| **`noKV/index.html`** | 未绑定 KV 时的提示 |

`admin/config.json`、`log.json` 等只是占位/demo，**真实数据由你的 Worker + KV/D1 提供**，可忽略。

模块边界（Worker 注入多订阅时会替换）：

```html
<!-- 模块1: 订阅链接 -->
...
<!-- 模块2: 编辑订阅生成 -->
```

---

## 部署方式 A：GitHub Pages（推荐）

1. 在 GitHub **新建仓库**（例如 `my-edt-pages`），不要勾选 README（或随意）。
2. 在本机进入本目录，改远程并推送：

   ```bash
   cd edt-pages-mirror
   git remote remove origin
   git remote add origin https://github.com/你的用户名/my-edt-pages.git
   git push -u origin main
   ```

   也可在 GitHub 网页上对官方仓库点 **Fork**，再把本目录改动 `git push` 到你的 Fork。

3. 仓库 **Settings → Pages**：
   - Source: **GitHub Actions**（仓库已带 `.github/workflows/static.yml`）
   - 或 Source: Deploy from branch → `main` → `/ (root)`

4. 等 Actions 跑完，得到地址，形如：
   - `https://你的用户名.github.io/my-edt-pages/`
   - 或 Fork 默认：`https://你的用户名.github.io/EDT-Pages.github.io/`

5. **自测**（浏览器打开）：
   - `https://你的地址/admin` → 应能看到管理页 HTML（未登录也没关系，能出页面即可）
   - `https://你的地址/login` → 登录页

---

## 部署方式 B：Cloudflare Pages（纯静态）

1. CF 控制台 → **Workers & Pages → Create → Pages → Upload assets**（或连 GitHub 仓库）。
2. 上传/构建目录选**本仓库根目录**（含 `admin/`、`login/` 文件夹）。
3. 部署完成后得到 `https://xxx.pages.dev`。

---

## 部署完成后：接到你的 VPN Worker

1. 打开 **VPN 那个 Pages/Worker 项目**（跑 `_worker.js` 的），**Settings → Variables** 新增：

   | 变量名 | 示例值 |
   |--------|--------|
   | `ADMIN_PAGES` | `https://你的用户名.github.io/my-edt-pages` |

   **不要**末尾 `/`。也可用 `PAGES_STATIC`（二选一即可）。

2. **重新部署** `_worker.js`（上传或 git 触发均可）。

3. 访问你的站点 `/admin`，Worker 会从 **你的** 静态站拉模板，再注入多订阅模块。

4. 把最终可用的根地址发给维护者核对（可选）。

---

## 官方挂了会怎样

- 已配置 `ADMIN_PAGES`：只要**你的**静态站正常，`/admin`、`/login` 不受影响。
- 未配置：仍依赖 `edt-pages.github.io`，官方挂则管理页不可用。

---

## 目录结构简表

```
edt-pages-mirror/
├── admin/index.html    ← 管理后台主体
├── login/index.html    ← 登录
├── noADMIN/  noKV/     ← 错误提示页
├── index.html          ← 站点根（可忽略）
└── .github/workflows/static.yml  ← GitHub Pages 自动发布
```
