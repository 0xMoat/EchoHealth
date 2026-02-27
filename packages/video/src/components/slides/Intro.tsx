import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_FAMILY, REPORT_TYPE_LABELS } from "../../constants";

type Props = {
  reportType: string;
  senderName: string;
};

export const Intro: React.FC<Props> = ({ reportType, senderName }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Icon entrance: spring scale + fade
  const iconScale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const iconOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Title slide up + fade
  const titleY = interpolate(frame, [0.3 * fps, 1.2 * fps], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [0.3 * fps, 1.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle slide up + fade (delayed)
  const subtitleY = interpolate(frame, [0.7 * fps, 1.6 * fps], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subtitleOpacity = interpolate(frame, [0.7 * fps, 1.6 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sender label fade (most delayed)
  const senderOpacity = interpolate(frame, [1.3 * fps, 2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Health Icon */}
      <div
        style={{
          transform: `scale(${iconScale})`,
          opacity: iconOpacity,
          width: 160,
          height: 160,
          borderRadius: 80,
          background: COLORS.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 24px 60px rgba(2, 132, 199, 0.35)`,
        }}
      >
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            fill="white"
          />
        </svg>
      </div>

      {/* Main Title */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.dark,
            letterSpacing: "0.05em",
            lineHeight: 1.2,
          }}
        >
          健康报告
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.primary,
            letterSpacing: "0.05em",
            lineHeight: 1.2,
          }}
        >
          解读
        </div>
      </div>

      {/* Report Type Badge */}
      <div
        style={{
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
          background: COLORS.primaryLight,
          borderRadius: 48,
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 40,
          paddingRight: 40,
          border: `2px solid ${COLORS.primary}`,
        }}
      >
        <div
          style={{
            fontSize: 40,
            color: COLORS.primary,
            fontWeight: 600,
            letterSpacing: "0.1em",
          }}
        >
          {REPORT_TYPE_LABELS[reportType] ?? reportType}
        </div>
      </div>

      {/* Sender Name */}
      <div
        style={{
          opacity: senderOpacity,
          fontSize: 32,
          color: COLORS.muted,
          letterSpacing: "0.05em",
        }}
      >
        由 {senderName} 为您特别解读
      </div>
    </AbsoluteFill>
  );
};
