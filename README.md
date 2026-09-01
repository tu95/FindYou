# FindYou

从网易云、小红书、抖音的分享链接里，找出这条链接是谁分享的。

在线用：https://findyou.uk ｜ 解析代码全在 `lib/platforms/`，服务端执行（`server-only`），客户端 bundle 不含密钥。

## 原理：三个平台三种玩法

1. **网易云音乐 —— AES 解密，纯本地，零网络请求**
   - 明文形态：`music.163.com/song?id={songId}&userid={uid}`，直接读 `userid`
   - `uct2`（移动端）：AES-ECB / PKCS7，密钥 `JwDUI7QfKebyIhZwcWAJu1172eV2CgCD`
   - `uct2`（PC 端）：密文以 `Salted__` 开头 → OpenSSL `EVP_BytesToKey`（盐 = 密文 8~16 字节，MD5 迭代派生）→ 再 AES-ECB
   - `uct`（老版）：AES-ECB，密钥 `y6oV5go8h5Vg31dSetYA3V1dZ2JGG3WF`
   - `163cn.tv` 短链：302 第一跳拿真实链接，回到上面的流程

2. **小红书 —— Base64 + 固定密钥移位，纯本地**
   - `appuid` 参数是明文，直接读
   - `shareRedId` 是加密的分享者 ID：
     ```
     编码: appuid → 转大写 → 逐字符 + 密钥数字 → Base64(URL_SAFE, NO_PADDING)
     解码: shareRedId → 补 padding → Base64 解码 → 逐字符 - 密钥数字 → 转小写
     ```
   - 密钥是 24 位数字串，与 24 位 hex 用户 ID 逐位对应：`262035496752980663974569`
   - 解码结果必须匹配 24 位 hex，否则视为不是本算法，不硬解
   - `xhslink.com` 短链：302 第一跳 Location 带 `shareRedId` / `appuid`
   - 网页版/PC 分享链接：平台设计上就不带分享者，只交付笔记 ID + 原因说明

3. **抖音 —— activity_info 里自带答案，短链拿参数 + 公开接口反查主页**
   - `v.douyin.com` 短链 → 302 第一跳 Location 的 `activity_info`（URL 编码的 JSON）：
     ```json
     { "social_share_user_id": "分享者 User ID", "social_share_time": "分享时间(Unix 秒)" }
     ```
   - 分享者 ID 纯本地解析，不需要请求抖音服务器
   - 主页链接需反查：`POST ttwid.bytedance.com/ttwid/union/register/` 拿回调 → 回调 Set-Cookie 里有 `ttwid` → `GET www.douyin.com/aweme/v1/web/user/profile/other/?user_id={uid}` 拿 `sec_uid`
   - 作品 ID 用路径 19 位纯数字段通用提取（视频 / 图文 / 未来新形态通吃，不按 `video`/`note` 白名单匹配）
   - 老版分享/私信转发没有 `activity_info`：返回"链接是干净的"，不硬报错

## 短链的统一套路

只请求第一跳、读 302 `Location`、**不自动跟随重定向**——`uct2` / `shareRedId` / `activity_info` 这些关键参数只在这一跳出现，跟到底反而拿不到。

## 本地开发

```bash
pnpm install && pnpm dev   # http://localhost:3000
```

## 特别鸣谢 🎉🎉🎉

没有这些前辈的逆向分析和无私分享，就没有这个项目！强烈推荐阅读！！

- 🔐 [Secret behind uct2](https://me.onlyra1n.top/posts/secret-behind-uct2) —— uct2 解密原理全靠这篇，跪谢！！
- 💬 [V2EX：通过网易云音乐分享链接找到分享用户主页](https://www.v2ex.com/t/876017) —— 最初的灵感来源，感谢分享精神！
- 🔍 [ahxxm.com：相关逆向分析](https://ahxxm.com/173.moew/) —— 关键思路出处，太强了！
- 🎨 [Design Vibes · 网页设计风格大全](https://design-vibes.v2ai.org/) —— 本站 UI 的灵感来源，孟菲斯超好看！！

仅供技术研究与个人学习，请勿把解析结果用于骚扰、跟踪或侵犯他人隐私。私有项目，未经授权禁止复制、分发或商用。
