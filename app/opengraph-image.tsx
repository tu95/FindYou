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
          background: "#fff8f5",
          color: "#171717",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%",
        }}
      >
        <div
          style={{
            border: "6px solid #ef4444",
            borderRadius: 40,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            padding: 56,
            width: "100%",
          }}
        >
          <div style={{ color: "#ef4444", fontSize: 40, fontWeight: 800 }}>
            {siteConfig.shortName}
          </div>
          <div style={{ fontSize: 82, fontWeight: 900, lineHeight: 1.08 }}>
            网易云分享链接查 UID
          </div>
          <div style={{ color: "#525252", fontSize: 34, lineHeight: 1.45 }}>
            粘贴分享链接，解析分享者 UID，并打开对应用户主页。
          </div>
        </div>
      </div>
    ),
    size,
  );
}
