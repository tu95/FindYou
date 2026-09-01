import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.shortName} 分享链接分享者解析工具（网易云音乐、小红书）`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  // 生成轻量 OG 图，避免依赖额外图片资产。
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#FFF8EC",
          color: "#000000",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "6px solid #000000",
            borderRadius: 40,
            boxShadow: "16px 16px 0 #FFD700",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            padding: 56,
            width: "100%",
          }}
        >
          <div
            style={{
              alignSelf: "flex-start",
              background: "#FF69B4",
              border: "5px solid #000000",
              boxShadow: "8px 8px 0 #000000",
              display: "flex",
              fontSize: 40,
              fontWeight: 800,
              padding: "8px 28px",
            }}
          >
            {siteConfig.shortName}
          </div>
          <div style={{ fontSize: 82, fontWeight: 900, lineHeight: 1.08 }}>
            分享链接，是谁发的？
          </div>
          <div style={{ color: "#333333", fontSize: 34, lineHeight: 1.45 }}>
            支持网易云、小红书，粘贴链接查出分享者，一键打开对方主页。
          </div>
        </div>
      </div>
    ),
    size,
  );
}
