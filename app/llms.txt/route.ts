import { absoluteUrl, siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  // 给 AI 搜索和摘要工具一个稳定、可抓取的项目说明。
  const body = [
    `# ${siteConfig.name}`,
    "",
    "> 开源的网易云音乐分享链接 UID 解析工具。",
    "",
    `Also known as: ${siteConfig.repoName}, 网易云音乐分享链接 UID 解析工具`,
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
    "## Source Code",
    siteConfig.github,
    "",
    "## What It Does",
    "- Parses NetEase Cloud Music share links or copied share text.",
    "- Finds the sharer UID when the public share parameters contain it.",
    "- Returns the NetEase Cloud Music user profile URL.",
    "- Keeps the implementation open for review and compatibility fixes.",
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
