import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_FAMILY, STATUS_LABELS } from "../../constants";
import type { ScriptDetail } from "../../types";

type Props = {
  detail: ScriptDetail;
  index: number;
  total: number;
};

const STATUS_CONFIG = {
  normal: { color: COLORS.normal, bg: COLORS.normalBg, icon: "✓" },
  high: { color: COLORS.high, bg: COLORS.highBg, icon: "↑" },
  low: { color: COLORS.low, bg: COLORS.lowBg, icon: "↓" },
};

export const Indicator: React.FC<Props> = ({ detail, index, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cfg = STATUS_CONFIG[detail.status];

  // Header badge: scale spring entrance
  const badgeScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });

  // Name text: slide from left
  const nameX = interpolate(frame, [0.2 * fps, 1 * fps], [-80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const nameOpacity = interpolate(frame, [0.2 * fps, 1 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Explanation card: spring scale
  const cardScale = spring({
    frame: frame - 0.6 * fps,
    fps,
    config: { damping: 200 },
  });
  const cardScaleValue = interpolate(cardScale, [0, 1], [0.88, 1]);
  const cardOpacity = interpolate(frame, [0.6 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Advice card: fade in after explanation
  const adviceOpacity = interpolate(frame, [1.4 * fps, 2.2 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const adviceY = interpolate(frame, [1.4 * fps, 2.2 * fps], [30, 0], {
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
        padding: 80,
        fontFamily: FONT_FAMILY,
        gap: 40,
      }}
    >
      {/* Progress indicator */}
      <div
        style={{
          alignSelf: "flex-end",
          fontSize: 28,
          color: COLORS.muted,
          opacity: nameOpacity,
        }}
      >
        {index + 1} / {total}
      </div>

      {/* Status Badge + Name row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          alignSelf: "flex-start",
          transform: `translateX(${nameX}px)`,
          opacity: nameOpacity,
        }}
      >
        {/* Status Badge */}
        <div
          style={{
            transform: `scale(${badgeScale})`,
            background: cfg.bg,
            border: `3px solid ${cfg.color}`,
            borderRadius: 24,
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 28,
            paddingRight: 28,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 36, color: cfg.color, fontWeight: 700 }}>
            {cfg.icon}
          </span>
          <span style={{ fontSize: 36, color: cfg.color, fontWeight: 700 }}>
            {STATUS_LABELS[detail.status]}
          </span>
        </div>

        {/* Indicator Name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.dark,
          }}
        >
          {detail.indicatorName}
        </div>
      </div>

      {/* Explanation Card */}
      <div
        style={{
          transform: `scale(${cardScaleValue})`,
          opacity: cardOpacity,
          background: COLORS.cardBg,
          borderRadius: 32,
          padding: 56,
          width: "100%",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.07)",
          border: `1px solid rgba(0,0,0,0.06)`,
        }}
      >
        <div style={{ fontSize: 30, color: COLORS.muted, marginBottom: 20 }}>
          这是什么？
        </div>
        <div
          style={{
            fontSize: 42,
            lineHeight: 1.75,
            color: COLORS.mid,
          }}
        >
          {detail.explanation}
        </div>
      </div>

      {/* Advice Card (only for abnormal indicators) */}
      {detail.advice && (
        <div
          style={{
            transform: `translateY(${adviceY}px)`,
            opacity: adviceOpacity,
            background: cfg.bg,
            borderRadius: 32,
            padding: 48,
            width: "100%",
            border: `2px solid ${cfg.color}`,
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {/* Lightbulb icon */}
          <div
            style={{
              fontSize: 48,
              flexShrink: 0,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            💡
          </div>
          <div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: cfg.color,
                marginBottom: 16,
              }}
            >
              健康建议
            </div>
            <div
              style={{
                fontSize: 40,
                lineHeight: 1.75,
                color: COLORS.mid,
              }}
            >
              {detail.advice}
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
