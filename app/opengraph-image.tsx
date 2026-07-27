import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const alt = `${siteConfig.shortName} 网易云音乐分享链接 UID 解析工具`;
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
          background: "#faf3e8",
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
            boxShadow: "16px 16px 0 #F7C548",
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
              background: "#FF8FD4",
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
            网易云分享链接，是谁发的？
          </div>
          <div style={{ color: "#333333", fontSize: 34, lineHeight: 1.45 }}>
            粘贴分享链接，查出是谁分享的，一键打开对方主页。
          </div>
        </div>
      </div>
    ),
    size,
  );
}
