# 📚 Nav - Supabase Edition (现代化书签管理系统)

## 📝 归属与许可证声明

本项目是基于 [deerwan/nav](https://github.com/deerwan/nav) 项目进行二次开发和架构迁移的衍生作品。

* **原始项目许可证**：Apache License 2.0。
* **核心架构变更**：使用 ai 将原有的 Cloudflare Pages Functions + D1 架构完全替换为 **Supabase (PostgreSQL) + 纯前端** BaaS 架构，以适应国内和通用的 Docker 部署环境。

我们保留了原项目的版权和许可证信息，并在此感谢原作者的贡献。

基于 **Vue 3 + Supabase** 构建，部署在 **腾讯云 EdgeOne Pages** 上的现代化书签管理系统。

## ✨ 功能特性

- 📑 **分类管理**：多级嵌套分类，支持拖拽排序
- 🔖 **书签管理**：添加、编辑、删除书签，支持私密标记
- 🔍 **实时搜索**：按名称、URL 或描述快速搜索
- 📥 **导入导出**：支持 JSON/HTML 格式，导入浏览器书签
- 💾 **本地备份**：支持本地 JSON 导出与导入恢复（取代云存储）
- ⚡ **批量操作**：批量移动、编辑、删除
- 🤖 **AI 功能**：智能生成描述、分类推荐（支持 DeepSeek/OpenAI 兼容 API）
- 🎨 **主题定制**：亮色/暗色主题、自定义壁纸、标题、页脚
- 🌐 **浏览器扩展**：支持 Chrome、Edge、Brave、Firefox

## 🛠️ 技术栈

**Vue 3 + Vite + Supabase (PostgreSQL & Auth) + Tencent Cloud EdgeOne Pages**

## 🚀 快速部署 (EdgeOne Pages)

### 1. 准备 Supabase 数据库 (BaaS 后端)

您的所有数据将安全地存储在 Supabase PostgreSQL 数据库中。

- **创建项目**：在 Supabase Dashboard 创建一个新项目，并获取您的 **Project URL** 和 **Anon Public Key**。
- **创建表结构**：进入 Supabase **SQL Editor**，执行 `schema.sql` 文件的内容（已适配 PostgreSQL）。
- **开启认证**：在 Supabase **Authentication** 中开启 Email/Password 登录，并创建您的管理员账号。

### 2. 部署 Pages 项目 (EdgeOne)

- Fork [本仓库](https://github.com/yuzl1/nav) 到 GitHub (如果您还没有完成)。
- 登录 **腾讯云 EdgeOne Pages 控制台**，创建 Pages 项目，连接您的 GitHub 仓库。

### 3. 配置环境变量 (连接密钥)

由于本项目是前端直连数据库，您需要通过 EdgeOne 环境变量安全地注入密钥。

- Pages 项目 > **设置** -> **环境变量**。
- 添加以下两个 **Vite 兼容** 的环境变量（**密钥绝不提交到 Git**）：

| 变量名 | 说明 | 必需 |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase 后台提供的 Project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase 后台提供的 Anon Public Key | ✅ |
| `OPENAI_API_KEY` | DeepSeek/OpenAI API Key（AI 功能） | ❌ |
| `OPENAI_BASE_URL` | API 基础地址（例如：`https://api.deepseek.com/v1`） | ❌ |

**构建设置**：
* 构建命令：`npm run build`
* 输出目录：`dist`

---

## 🧩 浏览器扩展

**商店下载**：
- [Edge 扩展](https://microsoftedge.microsoft.com/addons/detail/hepnnmnggonihfpkgcpengcaghlmjpkl)
- [Firefox 扩展](https://addons.mozilla.org/en-US/firefox/addon/%E4%B9%A6%E7%AD%BE%E7%AE%A1%E7%90%86%E5%8A%A9%E6%89%8B-bookmark-manager/)

**手动安装**：
在 [Releases](https://github.com/deerwan/nav/releases) 下载扩展：
- Chrome/Edge/Brave: `bookmark-manager-chromium.zip`
- Firefox: `bookmark-manager-firefox.zip`

安装后配置您的项目地址和管理员账号即可使用。

---

## 📖 更多信息

- 📺 [视频教程](https://www.bilibili.com/video/BV1zR2MB6EnW/)
- 📦 [GitHub 仓库](https://github.com/yuzl1/nav)

## 💰 请喝咖啡

如果这个项目对你有帮助，欢迎赞助支持！

<table>
  <tr>
    <td align="center">
      <strong>微信</strong><br>
      <img src="images/zsm.JPG" alt="微信" width="200">
    </td>
    <td align="center">
      <strong>支付宝</strong><br>
      <img src="images/zfb.JPG" alt="支付宝" width="200">
    </td>
    <td align="center">
      <strong>红包码</strong><br>
      <img src="images/hbm.PNG" alt="红包码" width="200">
    </td>
  </tr>
</table>

## [试用地址](https://www.yu1998.com)

## 📝 许可证

Apache License 2.0

Made with ❤️ using Vue 3 and Supabase