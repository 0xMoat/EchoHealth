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
  suggestions: string;
};

export const Suggestions: React.FC<Props> = ({ suggestions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = suggestions
    .split(/\n|，|。/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Header entrance
  const headerOpacity = interpolate(frame, [0, 0.8 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerY = interpolate(frame, [0, 0.8 * fps], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Staggered list item animations
  const getItemStyle = (i: number) => {
    const delay = 0.5 * fps + i * 0.4 * fps;
    const opacity = interpolate(frame, [delay, delay + 0.7 * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateY = interpolate(frame, [delay, delay + 0.7 * fps], [40, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const scale = spring({
      frame: frame - delay,
      fps,
      config: { damping: 200 },
    });
    const scaleValue = interpolate(scale, [0, 1], [0.92, 1]);
    return { opacity, translateY, scaleValue };
  };

  const BULLET_ICONS = ["🥗", "🏃", "😴", "💊", "🧘"];

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
        gap: 36,
      }}
    >
      {/* Header */}
      <div
        style={{
          transform: `translateY(${headerY}px)`,
          opacity: headerOpacity,
          alignSelf: "flex-start",
          marginBottom: 8,
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
          整体健康建议
        </div>
        <div
          style={{
            width: 80,
            height: 6,
            background: COLORS.normal,
            borderRadius: 3,
            marginTop: 12,
          }}
        />
      </div>

      {/* Suggestion Items */}
      {lines.map((line, i) => {
        const { opacity, translateY, scaleValue } = getItemStyle(i);
        return (
          <div
            key={i}
            style={{
              transform: `translateY(${translateY}px) scale(${scaleValue})`,
              opacity,
              background: COLORS.cardBg,
              borderRadius: 28,
              padding: 44,
              width: "100%",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.06)",
              border: `1px solid rgba(22, 163, 74, 0.15)`,
              display: "flex",
              alignItems: "center",
              gap: 28,
            }}
          >
            <div style={{ fontSize: 48, flexShrink: 0 }}>
              {BULLET_ICONS[i % BULLET_ICONS.length]}
            </div>
            <div
              style={{
                fontSize: 40,
                lineHeight: 1.65,
                color: COLORS.mid,
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
