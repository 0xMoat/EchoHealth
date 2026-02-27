import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../../constants";

type Props = {
  outro: string;
};

export const Outro: React.FC<Props> = ({ outro }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Logo spring entrance
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });

  // Text fade in
  const textOpacity = interpolate(frame, [0.5 * fps, 1.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [0.5 * fps, 1.5 * fps], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Disclaimer fade in
  const disclaimerOpacity = interpolate(frame, [1.2 * fps, 2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out entire slide near the end (last 0.5s)
  const finalFadeOut = interpolate(
    frame,
    [durationInFrames - 0.5 * fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.primary} 0%, #0369A1 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        fontFamily: FONT_FAMILY,
        gap: 48,
        opacity: finalFadeOut,
      }}
    >
      {/* EchoHealth Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            background: "rgba(255, 255, 255, 0.2)",
            border: "3px solid rgba(255, 255, 255, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill="white"
            />
          </svg>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "0.15em",
          }}
        >
          EchoHealth
        </div>
      </div>

      {/* Outro Message */}
      <div
        style={{
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
          background: "rgba(255, 255, 255, 0.15)",
          borderRadius: 32,
          padding: 56,
          width: "100%",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            fontSize: 40,
            lineHeight: 1.85,
            color: COLORS.white,
            textAlign: "center",
          }}
        >
          {outro}
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          opacity: disclaimerOpacity,
          fontSize: 28,
          color: "rgba(255, 255, 255, 0.65)",
          textAlign: "center",
          lineHeight: 1.75,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        本解读内容仅供参考，不构成医疗诊断或治疗建议。
        {"\n"}如有疑虑，请及时咨询专业医生。
      </div>
    </AbsoluteFill>
  );
};
