import React from "react";
import { Composition } from "remotion";
import { SHORT_TOTAL_FRAMES, TOTAL_FRAMES, Tutorial, TutorialShort } from "./Tutorial";
import { FPS, H, W } from "./theme";

export const Root: React.FC = () => (
  <>
    <Composition id="Tutorial" component={Tutorial} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="TutorialShort" component={TutorialShort} durationInFrames={SHORT_TOTAL_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
