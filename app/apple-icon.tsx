import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

// iOS 主屏图标：与 favicon 同款孟菲斯小雷达（金黄底 / 黑描边 / 绿松石扫描扇面 / 番茄红目标点）
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FFD700",
          border: "8px solid #000",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 108,
            height: 108,
            borderRadius: "50%",
            background: "#FFF8EC",
            border: "5px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 54,
              top: 0,
              width: 54,
              height: 54,
              background: "#00CED1",
              borderTopRightRadius: "100%",
              borderLeft: "5px solid #000",
              borderBottom: "5px solid #000",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 108,
              height: 108,
              borderRadius: "50%",
              border: "5px solid #000",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 17,
              top: 17,
              width: 74,
              height: 74,
              borderRadius: "50%",
              border: "4px solid #000",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 73,
              top: 25,
              width: 15,
              height: 15,
              borderRadius: "50%",
              background: "#FF6347",
              border: "4px solid #000",
            }}
          />
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#000",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
