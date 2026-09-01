# FindYou

从网易云音乐、小红书、抖音的分享链接中识别分享者 UID / 用户 ID，并打开对应的用户主页。

English: FindYou helps find the sharer UID from a NetEase Cloud Music share link, a Xiaohongshu (RED) share link, or a Douyin share link.

## 一句话介绍

FindYou 是一个分享链接分享者解析工具。它可以从**网易云音乐**、**小红书**和**抖音**的分享链接、复制的分享文本中识别分享者 UID / 用户 ID，并生成对应的用户主页链接。

- 网易云：从 share link、复制的分享文本或包含 `uct2` / `uct` 等分享参数的链接中识别分享者 UID
- 小红书：从完整分享链接或 `xhslink.com` 短链中提取 `shareRedId`，纯本地解码（Base64 + 固定密钥移位）得到分享者用户 ID；旧版链接直接读取明文 `appuid` 参数
- 抖音：短链在线解析第一跳 Location 拿到 `activity_info`（分享者 User ID）与 `u_code`；分享者 ID 本地解析，主页通过公开接口反查；支持口令文本 / 短链 / 视频链接 / 裸 aweme_id / 裸 uid / 裸 sec_uid 输入

Keywords: 网易云音乐分享链接、网易云 UID、分享者 UID、网易云用户主页、NetEase Cloud Music share link、share link to uid、uct2、music share resolver、link resolver、小红书分享链接、小红书 shareRedId、小红书分享者、Xiaohongshu share link、抖音分享链接、抖音分享者、抖音 activity_info、Douyin share link、privacy-friendly tool。

## 项目定位

FindYou 是一个小工具，目标是把分享链接里的分享者信息解析过程做得更透明。你可以直接使用网页。

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

## 实现原理（解析与解密流程）

所有平台的解析都遵循同一骨架，且**全部逻辑在服务端**（`lib/platforms/`，带 `server-only` 构建期护栏）：前端只把粘贴内容 POST 到 `/api/resolve`，拿到的是已解码结果，客户端 bundle 不含任何算法与密钥。

```
输入（链接/口令文本/裸 ID）
  → ① 识别平台 + 提取 URL（本地）
  → ② 短链在线解析：请求短链、不自动跟随，读第一跳 302 Location（关键参数在这一跳）
  → ③ 解析参数，解密/读取分享者身份（本地）
  → ④ 输出分享者 ID + 主页链接
```

### 网易云音乐（纯本地，零网络请求）

- 链接形态：`music.163.com/#/song?id={songId}&userid={uid}`（明文）、`uct`、`uct2`、`163cn.tv` 短链
- `userid` 参数：明文直接读取
- `uct2`（移动端）：**AES-ECB / PKCS7** 解密，密钥 `JwDUI7QfKebyIhZwcWAJu1172eV2CgCD`
- `uct2`（PC 端）：密文以 `Salted__` 开头 → OpenSSL `EVP_BytesToKey` 派生（盐 = 密文第 8~16 字节，MD5 迭代），再 AES-ECB 解密
- `uct`（老版）：**AES-ECB / PKCS7** 解密，密钥 `y6oV5go8h5Vg31dSetYA3V1dZ2JGG3WF`
- `163cn.tv` 短链：在线 302 解析后按上述流程继续

### 小红书（核心解码纯本地，仅短链需在线）

- **链接类型识别**（先判类型，再决定交付字段）：

  | 判定条件 | 类型 | 分享者 |
  |---|---|---|
  | 含 `xhslink.com` / `xhslink.cn` | 短链 | 在线解析后才有 |
  | 路径匹配 `/user/profile/{id}` | 用户主页 | 路径段即 ID |
  | query 含 `shareRedId` | App 加密分享 | ✅ 本地解码 |
  | query 含 `appuid` | App 明文分享 | ✅ 直读 |
  | 其他笔记链接（`xhsshare=pc_web` / `xsec_source=pc_share` / explore） | 网页/PC 分享 | ❌ 平台设计不含，只交付笔记 ID + 原因，不报错 |

- **shareRedId 编解码算法**（纯本地）：

  ```
  编码: appuid → 逐字符转大写 → 逐字符 + 密钥数字 → Base64(URL_SAFE, NO_PADDING)
  解码: shareRedId → 补 padding(len%4) → Base64(URL_SAFE) 解码 → 逐字符 - 密钥数字 → 转小写 → appuid
  ```

  密钥（24 位数字串，与 24 位 hex 用户 ID 逐位对应）：`262035496752980663974569`
  校验：解码长度必须为 24、结果必须匹配 24 位 hex，否则视为非本算法编码，置空并提示。
- 混排文本（标题 😆 中间段 😆 链接）：完整链接优先于短链，去重保序取第一个；`😆` 之间的 base64 串不是分享者 ID，忽略。
- 短链：在线 302 解析（第一跳 Location 带 `shareRedId` 或 `appuid`）；解析后落到裸域名兜底页视为短链失效。

### 抖音（必须联网，全部为公开接口，无"破解"）

- 输入形态：口令文本 / `v.douyin.com` 短链 / `douyin.com/video/{id}` / `iesdouyin.com/share/video/{id}` / `douyin.com/user/{sec_uid}` / 裸 `aweme_id`（19 位数字）/ 裸 `uid`（9~12 位数字）/ 裸 `sec_uid`（`MS4wLjAB...`）
- **流程**：

  ```
  ① 文本抽 URL（中文标点处截断，优先 v.douyin.com 短链）
  ② 短链 → 浏览器 UA 请求，不自动跟随重定向，读第一跳 302 Location
       （activity_info / u_code / mid / tt_from 等关键参数都在这一跳，后续跳转不带）
  ③ 本地解析 activity_info（URL 编码的 JSON）：
       social_share_user_id = ★ 分享者 User ID
       social_share_time    = 分享时间（Unix 秒）
  ④ 分享者主页反查（公开接口）：
       POST ttwid.bytedance.com/ttwid/union/register/ → 拿到回调地址
       GET 回调地址 → Set-Cookie 拿到 ttwid
       GET www.douyin.com/aweme/v1/web/user/profile/other/?{完整浏览器参数}&user_id={uid}
       → sec_uid → 主页 = https://www.douyin.com/user/{sec_uid}
  ⑤ 裸 uid / 裸 sec_uid / 用户主页链接 → 直接走第 ④ 步的主页接口
  ```

- 老版分享/私信转发（无 `activity_info`）→ 链接里没有分享者信息，交付原因说明（绿色"链接是干净的"卡片），不报错。
- 踩坑要点：接口 URL 拼接必须带 `?`（否则 404 Unsupported path）；请求只发一个 `ttwid` Cookie；接口需携带完整浏览器环境参数防风控；`403`/`404`/空响应为网关拦截特征。

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:3000` 即可使用。

常用命令：

```bash
pnpm lint
pnpm build
```

## 技术栈

- Next.js
- React
- TypeScript
- Tailwind CSS
- crypto-js

## 隐私说明

本项目只用于解析你主动粘贴的网易云音乐、小红书、抖音分享链接。当前页面不会展示历史记录，也不提供用户数据存储功能。

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
