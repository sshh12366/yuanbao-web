# 小金库网页版（iPhone PWA）

这是一个不需要 Mac、Xcode 或 App Store 的网页版本。把静态文件部署到 HTTPS 网站后，用 iPhone 的 Safari 打开并添加到主屏幕，就能像独立 App 一样使用。

## 功能

- 记录每日支出、收入和存钱
- 按天查看账单，筛选支出、收入、存钱
- 最近 7 天支出图表
- 创建多个存钱目标、设置日期并记录每次存入
- CSV 导出、JSON 完整备份与恢复
- 首次打开后可离线使用
- iOS 分享面板可分享备份文件

## 发布到网上

最简单的免费方式之一是 GitHub Pages。GitHub Free 的 Pages 网站需要放在公开仓库中；网站本身也会对互联网公开访问。工程里没有账单数据，账目只存放在每台设备自己的浏览器中。

1. 在 GitHub 新建一个公开仓库，例如 `yuanbao-web`。
2. 解压本文件夹，把其中所有文件（包括 `index.html`、`app.js`、`styles.css`、`sw.js`、`manifest.webmanifest` 和 `icon.svg`）上传到仓库根目录。
3. 打开仓库 `Settings` → `Pages`，选择从 `main` 分支的根目录发布并保存。
4. 等待 GitHub Pages 发布完成，网址格式为 `https://你的用户名.github.io/yuanbao-web/`。
5. 在 GitHub Pages 设置中启用 HTTPS（如果尚未自动启用）。

GitHub Pages 的菜单名称可能随 GitHub 界面更新而变化；官方说明见 [创建 GitHub Pages 网站](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) 和 [配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 添加到 iPhone

1. 首次使用时，先在 Safari 打开 HTTPS 网站并等待页面加载。
2. 点 Safari 的“分享”按钮，选择“添加到主屏幕”。
3. 打开“作为 Web App 打开”，点“添加”。
4. 从新添加的“小金库”图标打开后开始记账。建议安装后再录入第一笔，Safari 网站和主屏幕 App 的浏览器数据在部分 iOS 版本上可能彼此独立。

Apple 的步骤见[在 iPhone 上把网站添加到主屏幕](https://support.apple.com/guide/iphone/iphea86e5236/ios)。可安装 PWA 需要通过 HTTPS 提供页面；本工程配置了 Web App manifest 和离线缓存 Service Worker。

## 数据与隐私

- App 不含服务器端，也不会向 GitHub Pages 上传账目；浏览器通过 HTTPS 下载页面代码后，账目保存在该浏览器的本地存储。
- 同一个网址的仓库代码可以公开，但每个访问者只会看到自己设备上的本地账目。
- 数据不会自动在 iPhone、iPad 或其他设备间同步。换机前请用“备份全部数据”导出 JSON，再在新设备恢复；也可以把备份保存到 iCloud Drive。
- 清除 Safari 网站数据、删除主屏幕网页 App 或换浏览器可能导致本地记录无法访问，请定期备份。
- 小金库不连接银行账户，记录需手动添加。

## 文件

- `index.html`：页面结构与中文界面
- `styles.css`：移动端样式
- `app.js`：本地记账、目标、导入导出
- `manifest.webmanifest`：主屏幕 App 名称和显示模式
- `sw.js`：离线资源缓存
- `icon.svg`：主屏幕图标素材

