import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

// 目前只有首页，后续有文档页再继续追加。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(siteConfig.updatedAt),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
