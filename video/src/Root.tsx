import React from "react";
import { Composition } from "remotion";
import { MANAGER_TOTAL, TutorialManager, TutorialUser, USER_TOTAL } from "./Roles";
import { SHORT_TOTAL_FRAMES, TOTAL_FRAMES, Tutorial, TutorialShort } from "./Tutorial";
import { FPS, H, W } from "./theme";

export const Root: React.FC = () => (
  <>
    <Composition id="Tutorial" component={Tutorial} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="TutorialShort" component={TutorialShort} durationInFrames={SHORT_TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="TutorialUser" component={TutorialUser} durationInFrames={USER_TOTAL} fps={FPS} width={W} height={H} />
    <Composition id="TutorialManager" component={TutorialManager} durationInFrames={MANAGER_TOTAL} fps={FPS} width={W} height={H} />
  </>
);
