# findYourNetEaseCloudMusic

从网易云音乐分享链接中识别分享者 UID，并打开对应的网易云音乐用户主页。

English: findYourNetEaseCloudMusic helps find the sharer UID from a NetEase Cloud Music share link.

GitHub: [tu95/findYourNetEaseCloudMusic](https://github.com/tu95/findYourNetEaseCloudMusic)

## 项目定位

findYourNetEaseCloudMusic 是一个开源小工具，目标是把网易云音乐分享链接里的分享者信息解析过程做得更透明。你可以直接使用网页，也可以阅读源码确认解析逻辑。

适合这些场景：

- 想从网易云音乐分享链接中找到分享者主页
- 想了解 `uct2` 等分享参数背后的解析方式
- 想基于现有实现继续补充平台兼容或逆向分析

## 功能

- 解析网易云音乐分享链接中的分享者信息
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

本项目只用于解析你主动粘贴的网易云音乐分享链接。当前页面不会展示历史记录，也不提供用户数据存储功能。

如果你部署自己的版本，请根据实际日志、统计和托管平台行为补充隐私说明。

## 致谢与参考

感谢这些项目、文章和讨论提供思路与资料：

- [cwzsquare/netease_music_sharelink2uid](https://github.com/cwzsquare/netease_music_sharelink2uid)
- [Secret behind uct2](https://me.onlyra1n.top/posts/secret-behind-uct2)
- [V2EX：通过网易云音乐分享链接找到分享用户主页](https://www.v2ex.com/t/876017)
- [ahxxm.com：相关逆向分析文章](https://ahxxm.com/173.moew/)

也欢迎继续提交 issue 或 pull request，补充不同版本、不同平台上的分析结果。

## 免责声明

本项目仅用于技术研究与个人学习。请勿把解析结果用于骚扰、跟踪、侵犯隐私或任何违反平台规则和法律法规的行为。

## 开源协议

MIT License
