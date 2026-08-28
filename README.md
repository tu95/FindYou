# findYourNetEaseCloudMusic

从网易云音乐、小红书的分享链接中识别分享者 UID / 用户 ID，并打开对应的用户主页。

English: findYourNetEaseCloudMusic helps find the sharer UID from a NetEase Cloud Music share link or the sharer ID from a Xiaohongshu (RED) share link.

## 一句话介绍

findYourNetEaseCloudMusic 是一个分享链接分享者解析工具。它可以从**网易云音乐**、**小红书**和**抖音**的分享链接、复制的分享文本中识别分享者 UID / 用户 ID，并生成对应的用户主页链接。

- 网易云：从 share link、复制的分享文本或包含 `uct2` / `uct` 等分享参数的链接中识别分享者 UID
- 小红书：从完整分享链接或 `xhslink.com` 短链中提取 `shareRedId`，纯本地解码（Base64 + 固定密钥移位）得到分享者用户 ID；旧版链接直接读取明文 `appuid` 参数
- 抖音：短链在线解析第一跳 Location 拿到 `activity_info`（分享者 User ID）与 `u_code`；分享者 ID 本地解析，主页通过公开接口反查；支持口令文本 / 短链 / 视频链接 / 裸 aweme_id / 裸 uid / 裸 sec_uid 输入

Keywords: 网易云音乐分享链接、网易云 UID、分享者 UID、网易云用户主页、NetEase Cloud Music share link、share link to uid、uct2、music share resolver、link resolver、小红书分享链接、小红书 shareRedId、小红书分享者、Xiaohongshu share link、抖音分享链接、抖音分享者、抖音 activity_info、Douyin share link、privacy-friendly tool。

## 项目定位

findYourNetEaseCloudMusic 是一个小工具，目标是把分享链接里的分享者信息解析过程做得更透明。你可以直接使用网页。

适合这些场景：

- 想从网易云音乐分享链接中找到分享者主页
- 想从小红书分享链接中找到分享者主页（`shareRedId` 本地解码，不请求服务器）
- 想了解 `uct2`、`shareRedId` 等分享参数背后的解析方式
- 想基于现有实现继续补充平台兼容或逆向分析

## 功能

- 解析网易云音乐分享链接中的分享者信息
- 解析小红书分享链接中的分享者信息（完整链接 / 短链 / 分享文本）
- 小红书网页版 / PC 分享链接也能识别：返回笔记信息，并说明链接本身不携带分享者信息（平台设计）
- 解析抖音分享链接：新版链接 activity_info 携带分享者 User ID；支持口令文本 / 短链 / 视频链接 / 裸 aweme_id / 裸 uid / 裸 sec_uid
- 输出分享者用户主页链接
- 支持粘贴完整分享文本
- 提供 Next.js Web 页面和 API 路由

## 本地开发

```bash
npm install
npm run dev
```

打开 `http://localhost:3000` 即可使用。

常用命令：

```bash
npm run lint
npm run build
```

## 技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
- crypto-js

## 隐私说明

本项目只用于解析你主动粘贴的网易云音乐、小红书分享链接。当前页面不会展示历史记录，也不提供用户数据存储功能。

**解密逻辑全部在服务端执行**：`shareRedId`、`uct2` 等所有解码算法只存在于后端代码（`lib/platforms/`，均带 `server-only` 构建期护栏），前端页面只负责把粘贴内容 POST 到 `/api/resolve`，拿到的是已解码的结果，不包含任何算法与密钥。客户端 bundle 中不存在密钥或加解密代码。

## 致谢与参考

感谢这些文章和讨论提供思路与资料：

- [Secret behind uct2](https://me.onlyra1n.top/posts/secret-behind-uct2)
- [V2EX：通过网易云音乐分享链接找到分享用户主页](https://www.v2ex.com/t/876017)
- [ahxxm.com：相关逆向分析文章](https://ahxxm.com/173.moew/)

## 免责声明

本项目仅用于技术研究与个人学习。请勿把解析结果用于骚扰、跟踪、侵犯隐私或任何违反平台规则和法律法规的行为。

## 版权声明

本项目为私有项目，**不开源**。未经作者书面授权，禁止复制、分发、修改或用于商业用途；保留所有权利。
