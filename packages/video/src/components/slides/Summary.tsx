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
  summary: string;
};

export const Summary: React.FC<Props> = ({ summary }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section header entrance
  const headerY = interpolate(frame, [0, 0.8 * fps], [50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerOpacity = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Card entrance: spring scale from 0.9 to 1
  const cardScale = spring({
    frame: frame - 0.4 * fps,
    fps,
    config: { damping: 200 },
  });
  const cardScaleValue = interpolate(cardScale, [0, 1], [0.9, 1]);
  const cardOpacity = interpolate(frame, [0.4 * fps, 1.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent line width expand
  const lineWidth = spring({
    frame: frame - 0.6 * fps,
    fps,
    config: { damping: 200 },
    durationInFrames: 30,
  });
  const lineWidthPx = interpolate(lineWidth, [0, 1], [0, 80]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Section Header */}
      <div
        style={{
          transform: `translateY(${headerY}px)`,
          opacity: headerOpacity,
          alignSelf: "flex-start",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.dark,
            letterSpacing: "0.05em",
          }}
        >
          总体概述
        </div>
        <div
          style={{
            width: lineWidthPx,
            height: 6,
            background: COLORS.primary,
            borderRadius: 3,
            marginTop: 12,
          }}
        />
      </div>

      {/* Summary Card */}
      <div
        style={{
          transform: `scale(${cardScaleValue})`,
          opacity: cardOpacity,
          background: COLORS.cardBg,
          borderRadius: 32,
          padding: 64,
          width: "100%",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.08)",
          border: `1px solid rgba(2, 132, 199, 0.12)`,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Decorative left border */}
        <div
          style={{
            display: "flex",
            gap: 32,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 6,
              minHeight: 100,
              borderRadius: 3,
              background: COLORS.primary,
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          />
          <div
            style={{
              fontSize: 44,
              lineHeight: 1.8,
              color: COLORS.mid,
              fontWeight: 400,
            }}
          >
            {summary}
          </div>
        </div>
      </div>

      {/* Bottom icon */}
      <div
        style={{
          opacity: cardOpacity,
          marginTop: 48,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: COLORS.primary,
          }}
        />
        <div
          style={{
            fontSize: 32,
            color: COLORS.muted,
          }}
        >
          以下为详细指标解读
        </div>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: COLORS.primary,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
