import { absoluteUrl, siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  // 给 AI 搜索和摘要工具一个稳定、可抓取的项目说明。
  const body = [
    `# ${siteConfig.name}`,
    "",
    "> 分享链接分享者解析工具（网易云音乐、小红书）。",
    "",
    `Also known as: ${siteConfig.repoName}, 网易云音乐分享链接 UID 解析工具, 小红书分享链接分享者解析工具`,
    "",
    "## Summary",
    siteConfig.summary,
    "",
    "## Keywords",
    siteConfig.keywords.join(", "),
    "",
    "## Primary URL",
    absoluteUrl("/"),
    "",
    "## What It Does",
    "- Parses NetEase Cloud Music, Xiaohongshu or Douyin share links or copied share text.",
    "- Finds the sharer UID/ID when the public share parameters contain it.",
    "- Decodes Xiaohongshu shareRedId locally (Base64 + fixed key), no network needed.",
    "- Recognizes Xiaohongshu web/PC share links: returns the note ID and explains that web links carry no sharer info by design.",
    "- Resolves Douyin short links and reads the sharer User ID from activity_info (no video-detail request needed).",
    "- Returns the sharer's user profile URL.",
    "",
    "## Privacy Boundary",
    "The page only submits the pasted link or share text to the resolver endpoint and does not expose a user history feature.",
    "",
    "## FAQ",
    ...siteConfig.faqs.flatMap((item) => [`### ${item.question}`, item.answer, ""]),
    "## Useful Pages",
    `- Home: ${absoluteUrl("/")}`,
    `- Robots: ${absoluteUrl("/robots.txt")}`,
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
