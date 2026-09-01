import { DecoderShell } from "@/components/decoder-shell";
import { absoluteUrl, siteConfig } from "@/lib/site";

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": absoluteUrl("/#author"),
        name: siteConfig.author.name,
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: siteConfig.name,
        alternateName: [siteConfig.repoName, "网易云音乐分享链接 UID 解析工具", "小红书分享链接分享者解析工具"],
        url: absoluteUrl("/"),
        description: siteConfig.description,
        inLanguage: "zh-CN",
        publisher: {
          "@id": absoluteUrl("/#author"),
        },
      },
      {
        "@type": ["SoftwareApplication", "WebApplication"],
        "@id": absoluteUrl("/#app"),
        name: siteConfig.name,
        alternateName: [siteConfig.repoName, "网易云音乐分享链接 UID 解析工具", "小红书分享链接分享者解析工具"],
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        url: absoluteUrl("/"),
        description: siteConfig.description,
        abstract: siteConfig.summary,
        isAccessibleForFree: true,
        inLanguage: ["zh-CN", "en"],
        keywords: siteConfig.keywords.join(", "),
        author: {
          "@id": absoluteUrl("/#author"),
        },
        dateModified: siteConfig.updatedAt,
        sameAs: [...siteConfig.references],
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <>
      {/* 结构化数据给搜索引擎和 AI 搜索读取。 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DecoderShell />
    </>
  );
}
