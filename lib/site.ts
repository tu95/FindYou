// 站点信息集中放这里，避免页面和 sitemap 写散。
export const siteConfig = {
  name: "findYourNetEaseCloudMusic",
  shortName: "findYourNetEaseCloudMusic",
  englishName: "findYourNetEaseCloudMusic",
  description:
    "开源的网易云音乐分享链接解析工具，用于从分享链接中识别分享者 UID，并跳转到分享者主页。",
  summary:
    "findYourNetEaseCloudMusic 是一个开源网页工具，用于解析网易云音乐分享文本或分享链接中的分享者 UID，并生成对应的网易云音乐用户主页链接。它适合在你已经拿到公开分享链接、想确认分享来源时使用；项目强调透明实现、少收集信息和可审计源码。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://findyourneteasecloudmusic.vercel.app",
  updatedAt: "2026-05-24",
  author: {
    name: "tu95",
    url: "https://github.com/tu95",
  },
  keywords: [
    "网易云音乐分享链接",
    "网易云 UID",
    "网易云分享者",
    "网易云用户主页",
    "uct2",
    "NetEase Cloud Music",
    "share link to uid",
    "Find NetEase CloudMusic User",
  ],
  github: "https://github.com/tu95/findYourNetEaseCloudMusic",
  references: [
    "https://github.com/cwzsquare/netease_music_sharelink2uid",
    "https://me.onlyra1n.top/posts/secret-behind-uct2",
    "https://www.v2ex.com/t/876017",
    "https://ahxxm.com/173.moew/",
  ],
  faqs: [
    {
      question: "这个工具能做什么？",
      answer: "从网易云音乐分享链接中解析分享者 UID，并生成对应的用户主页链接。",
    },
    {
      question: "支持哪些输入？",
      answer: "支持包含网易云音乐分享参数的链接或分享文本，复制整段分享内容也可以尝试。",
    },
    {
      question: "会保存我的链接吗？",
      answer: "当前页面只把链接提交给解析接口返回结果，不展示历史记录，也不提供用户数据存储功能。",
    },
    {
      question: "为什么要开源？",
      answer: "这类工具涉及链接解析和隐私边界，开源能让实现过程更容易被检查和改进。",
    },
  ],
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
