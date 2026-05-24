import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// 开放抓取首页和站点地图，API 保持不收录。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
