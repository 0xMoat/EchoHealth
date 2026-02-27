import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

import {
  INTRO_DURATION,
  SUMMARY_DURATION,
  INDICATOR_DURATION,
  SUGGESTIONS_DURATION,
  OUTRO_DURATION,
  TRANSITION_FRAMES,
} from "./constants";
import type { VideoTemplateProps } from "./types";
import { Intro } from "./components/slides/Intro";
import { Summary } from "./components/slides/Summary";
import { Indicator } from "./components/slides/Indicator";
import { Suggestions } from "./components/slides/Suggestions";
import { Outro } from "./components/slides/Outro";

type SlideEntry = {
  id: string;
  duration: number;
  component: React.ReactNode;
};

export const VideoTemplate: React.FC<VideoTemplateProps> = ({
  script,
  reportType,
  senderName,
  audioSrc,
}) => {
  const slides: SlideEntry[] = [
    {
      id: "intro",
      duration: INTRO_DURATION,
      component: <Intro reportType={reportType} senderName={senderName} />,
    },
    {
      id: "summary",
      duration: SUMMARY_DURATION,
      component: <Summary summary={script.summary} />,
    },
    ...script.details.map((detail, i) => ({
      id: `indicator-${i}`,
      duration: INDICATOR_DURATION,
      component: (
        <Indicator
          detail={detail}
          index={i}
          total={script.details.length}
        />
      ),
    })),
    {
      id: "suggestions",
      duration: SUGGESTIONS_DURATION,
      component: <Suggestions suggestions={script.suggestions} />,
    },
    {
      id: "outro",
      duration: OUTRO_DURATION,
      component: <Outro outro={script.outro} />,
    },
  ];

  const transitionTiming = linearTiming({ durationInFrames: TRANSITION_FRAMES });

  return (
    <AbsoluteFill>
      {/* TTS audio track */}
      {audioSrc && <Audio src={audioSrc} volume={1} />}

      {/* Slide sequence with fade transitions */}
      <TransitionSeries>
        {slides.flatMap((slide, i) => {
          const elements: React.ReactElement[] = [
            <TransitionSeries.Sequence
              key={`seq-${slide.id}`}
              durationInFrames={slide.duration}
              premountFor={TRANSITION_FRAMES}
            >
              {slide.component}
            </TransitionSeries.Sequence>,
          ];
          if (i < slides.length - 1) {
            elements.push(
              <TransitionSeries.Transition
                key={`trans-${slide.id}`}
                presentation={fade()}
                timing={transitionTiming}
              />
            );
          }
          return elements;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
