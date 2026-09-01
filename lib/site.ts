// 站点信息集中放这里，避免页面和 sitemap 写散。
export const siteConfig = {
  name: "FindYou",
  shortName: "FindYou",
  englishName: "FindYou",
  repoName: "FindYou",
  repoUrl: "https://github.com/tu95/FindYou",
  description:
    "FindYou：把网易云音乐、小红书、抖音的分享链接粘贴进来，就能查出这条链接是谁分享的，一键打开对方主页。免费、不存记录。",
  summary:
    "FindYou 是一个免费的小工具：把网易云音乐、小红书、抖音的分享链接或整段分享文字粘贴进来，就能查出这条链接是谁分享的，并帮你打开对方主页。不用注册、不用下载，也不保存查询记录。",
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
  ],
  references: [
    "https://me.onlyra1n.top/posts/secret-behind-uct2",
    "https://www.v2ex.com/t/876017",
    "https://ahxxm.com/173.moew/",
  ],
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
