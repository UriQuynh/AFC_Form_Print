import React from "react";
import { Composition } from "remotion";
import { Tutorial, TOTAL_FRAMES } from "./Tutorial";
import { FPS, H, W } from "./theme";

export const Root: React.FC = () => (
  <Composition id="Tutorial" component={Tutorial} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
);
