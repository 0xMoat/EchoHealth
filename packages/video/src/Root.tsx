import React from "react";
import { Composition, CalculateMetadataFunction, registerRoot } from "remotion";

import {
  FPS,
  COMP_WIDTH,
  COMP_HEIGHT,
  INTRO_DURATION,
  SUMMARY_DURATION,
  INDICATOR_DURATION,
  SUGGESTIONS_DURATION,
  OUTRO_DURATION,
  TRANSITION_FRAMES,
} from "./constants";
import { VideoTemplate } from "./VideoTemplate";
import { VideoTemplateSchema, type VideoTemplateProps } from "./types";

// Calculate total duration based on number of indicator slides
// Formula: sum of all slide durations - (transitions × TRANSITION_FRAMES)
//   Slides   = 4 fixed + N indicators
//   Transitions = slides - 1
const calculateMetadata: CalculateMetadataFunction<VideoTemplateProps> = ({
  props,
}) => {
  const n = props.script.details.length;
  const totalSlides = 4 + n; // intro + summary + N indicators + suggestions + outro
  const transitions = totalSlides - 1;
  const durationInFrames =
    INTRO_DURATION +
    SUMMARY_DURATION +
    INDICATOR_DURATION * n +
    SUGGESTIONS_DURATION +
    OUTRO_DURATION -
    transitions * TRANSITION_FRAMES;

  return { durationInFrames };
};

const DEFAULT_PROPS: VideoTemplateProps = {
  reportType: "BLOOD_ROUTINE",
  senderName: "EchoHealth",
  audioSrc: undefined,
  script: {
    summary: "您的血常规检查结果总体良好，大部分指标处于正常范围。",
    details: [
      {
        indicatorName: "白细胞",
        status: "normal",
        explanation:
          "白细胞是身体的防御士兵，负责抵抗病菌。您的白细胞数量在正常范围，说明免疫功能良好。",
      },
      {
        indicatorName: "血红蛋白",
        status: "low",
        explanation:
          "血红蛋白是红细胞里负责运输氧气的蛋白质，有点像血液中的快递员。您的数值略偏低，可能有轻度贫血。",
        advice:
          "建议多吃含铁丰富的食物，如红肉、菠菜、豆腐。同时可以适当补充维生素C，帮助铁的吸收。",
      },
      {
        indicatorName: "血小板",
        status: "normal",
        explanation:
          "血小板是帮助止血的小卫士，在您受伤时快速聚集堵住伤口。您的血小板数量正常。",
      },
    ],
    suggestions:
      "适当增加富含铁质的食物摄入\n保持规律作息，保证充足睡眠\n定期复查血常规，关注血红蛋白变化",
    outro:
      "EchoHealth 特别为您解读了这份血常规报告，希望您身体健康、平安喜乐。本解读仅供参考，如有疑虑请及时咨询医生。",
  },
};

const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HealthReport"
      component={VideoTemplate}
      fps={FPS}
      width={COMP_WIDTH}
      height={COMP_HEIGHT}
      durationInFrames={300} // Placeholder; overridden by calculateMetadata
      schema={VideoTemplateSchema}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={calculateMetadata}
    />
  );
};

registerRoot(RemotionRoot);
