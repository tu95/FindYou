# 校验摘要（Validation Summary）

小工具：分享解析小工具（小红书 / 网易云音乐 / 抖音）
Skill 依据：`.skill/SKILL.md`（minitool-zip-builder v1.4.0）及其 4 个 reference

## 产物

- 源码目录：`xhs_mini_app/`（index.html + assets/）
- 打包产物：`xhs_mini_tool.zip`

## 结果输出（核心）

每个平台解析后固定输出两样东西：

1. **分享者主页信息**：分享者 ID 大字展示 + 「分享者主页」小按钮（点击自动选中主页链接，长按复制）
2. **复制脱敏后的分享内容**：大按钮 + 脱敏内容预览框——点击后自动选中脱敏后的完整分享文案（原文中链接替换为脱敏链接），提示长按复制；容器无剪贴板 API，按规范用「展示可选中文本 + 引导手动复制」实现

## 与 Web 项目保持同步

解析逻辑与 Web 项目（`lib/platforms/`，findYourNetEaseCloudMusic）逐项对齐，算法逐字移植：

| 平台 | 同步的能力 | Web 项目对应文件 |
| --- | --- | --- |
| 小红书 | `shareRedId` 本地解码（Base64url + 固定密钥移位）、`appuid` 明文、`user_profile` 主页、`web_share` 网页版说明、脱敏（抹 `shareRedId`/`appuid`）、meta（xsec_token / apptime / xhsshare / share_id / app_version） | xiaohongshu/{decode,url,index,sanitize}.ts |
| 网易云 | `userid` 明文、`uct2`（移动端 AES-ECB / PC 端 Salted EVP_BytesToKey）、旧版 `uct`、`user/home` 主页、hash 形态链接（`#/song?id=..`）、脱敏（抹 `userid`/`uct2`/`uct`） | netease/{decode,url,index,sanitize}.ts |
| 抖音 | 输入识别（短链/视频/主页/裸 aweme_id/uid/sec_uid）、`activity_info` 本地解析（分享者 ID / 分享时间 / 分享事件）、脱敏（抹 `activity_info`/`u_code`） | douyin/{decode,url,index,sanitize}.ts |

**容器不联网的边界**（明确提示，不报错）：xhslink / 163cn.tv / v.douyin.com 短链需联网跳转、抖音用户主页反查需在线接口——小工具内给出说明并建议使用完整链接或网站版。

**说明**：网易云 uct2/uct 与小红书 shareRedId 的解码密钥随离线包内置（小工具纯本地解码所必需）；Web 项目密钥仍只在服务端，不受影响。

## 自检结果

### 包结构 — ✅ 全部通过
- [x] `index.html` 位于 zip 根目录，解压后顶层直接是文件
- [x] 仅含允许类型（.html / .css / .js），无 node_modules / *.map / 构建配置 / .DS_Store

### index.html 与资源 — ✅ 全部通过
- [x] `<!DOCTYPE html>` + `lang="zh-CN"` + `charset=UTF-8`；viewport 含 `viewport-fit=cover`
- [x] 全部资源为相对路径 `./assets/...`，无任何 `http(s)://` 外部引用
- [x] 脚本全部外置且为经典脚本：crypto-js 组件 9 个文件按依赖顺序加载（core → x64-core → cipher-core → enc-base64 → enc-base64url → md5 → aes → mode-ecb → pad-pkcs7），业务逻辑在 `app.js`；无内联 `<script>`、无 `onclick=`、无 `javascript:` / `eval` / `new Function`
- [x] 无 `<base href>`、无 `<iframe>` / `<object>`、无自建 CSP

### 端能力（device-capabilities.md §7 扫描）— ✅ 全部通过
- [x] grep 扫描无命中：fetch / XHR / WebSocket / clipboard / geolocation / Worker / WebAssembly / window.open / prompt / fullscreen / 外部资源引用等
- [x] 剪贴板替代：链接文本点击自动选中（Range + Selection），引导长按手动复制
- [x] localStorage 仅作本地历史

### JSBridge（jsbridge-api.md）— ✅ 符合
- [x] 仅调用 `writeTempFile / saveImageToPhotosAlbum / openRedPage`，参数符合 schema；均先检测 `window.xhs.miniTool` 存在性，非容器环境优雅降级

### 正确性 — ✅ 通过
- [x] `node --check` 语法零错误
- [x] 解析逻辑真实运行测试：**64 个用例全部通过**（shareRedId 解码、appuid、web_share、uct2 移动端/PC Salted 端、旧版 uct、hash 链接、userid 明文、activity_info、裸 ID 识别、短链/主页反查的联网提示、脱敏内容生成、负例）
- [x] 测试向量由 web 项目同款 crypto-js 算法生成，双向验证

### 跨端（cross-platform-h5.md）— ✅ 通过
- [x] 交互全部 click / pointer 兼容，无 hover 依赖；布局自适应；底部安全区用 `var(--safe-area-inset-bottom, env(...))` 组合

### 体积
- [x] zip 远低于 2MB 建议值（crypto-js 组件压缩后体积很小）

## 结论

所有规范项通过，产物可直接上传小红书小工具容器；三平台解析结果与 Web 项目一致（除需联网的短链/反查场景，按容器边界提示处理）。
