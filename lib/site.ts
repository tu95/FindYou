// 站点信息集中放这里，避免页面和 sitemap 写散。
export const siteConfig = {
  name: "FindYou",
  shortName: "FindYou",
  englishName: "FindYou",
  // 仓库名保留全称，站点品牌统一叫 FindYou
  repoName: "findYourNetEaseCloudMusic",
  description:
    "FindYou：把网易云音乐、小红书、抖音的分享链接粘贴进来，就能查出这条链接是谁分享的，一键打开对方主页。免费、不存记录。",
  summary:
    "FindYou（项目名 findYourNetEaseCloudMusic）是一个免费的小工具：把网易云音乐、小红书、抖音的分享链接或整段分享文字粘贴进来，它就能查出这条链接是谁分享的，并帮你打开对方主页。不用注册、不用下载，也不保存你的查询记录。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://findyou.uk",
  updatedAt: "2026-08-28",
  author: {
    name: "tu95",
  },
  keywords: [
    "FindYou",
    "findyou.uk",
    "网易云音乐分享链接",
    "网易云分享链接查 UID",
    "网易云 UID",
    "网易云分享者",
    "网易云用户主页",
    "网易云分享链接解析",
    "小红书分享链接",
    "小红书分享者",
    "小红书 shareRedId",
    "小红书分享链接解析",
    "小红书 appuid",
    "抖音分享链接",
    "抖音分享者",
    "抖音 activity_info",
    "抖音 u_code",
    "uct2",
    "shareRedId",
    "NetEase Cloud Music",
    "Xiaohongshu share link",
    "Douyin share link",
    "XHS share link resolver",
    "share link to uid",
    "Find NetEase CloudMusic User",
    "findYourNetEaseCloudMusic",
  ],
  references: [
    "https://me.onlyra1n.top/posts/secret-behind-uct2",
    "https://www.v2ex.com/t/876017",
    "https://ahxxm.com/173.moew/",
  ],
  faqs: [
    {
      question: "这个工具能做什么？",
      answer: "粘贴网易云音乐或小红书的分享链接，就能查出是谁分享的，并打开对方的主页。",
    },
    {
      question: "怎么用？",
      answer: "在 App 里点分享、复制链接，把复制到的内容整段粘贴进来，点查找就行。",
    },
    {
      question: "小红书链接也能查吗？",
      answer: "能。小红书分享链接里的分享者信息可以在本地直接解开，不需要额外请求任何服务器。",
    },
    {
      question: "抖音链接也能查吗？",
      answer: "能。抖音新版分享链接的 activity_info 里直接携带分享者 User ID，本地解析即可拿到分享者。",
    },
    {
      question: "会保存我的链接吗？",
      answer: "不会。查完就完了，没有历史记录，也不用登录。",
    },
    {
      question: "查出来的结果准吗？",
      answer: "只要链接里带了分享者信息就能查到；查不到时换一条完整的分享内容再试试。",
    },
  ],
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
