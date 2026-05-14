import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "找到分享者主页",
  description: "粘贴网易云音乐分享链接，找到分享者主页",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
