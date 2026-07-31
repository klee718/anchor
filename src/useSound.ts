import { useCallback, useEffect, useRef, useState } from "react";
import { isSoundEnabled, playSound, setSoundEnabled, startAmbient, stopAmbient } from "./sound";

/**
 * Global sound-enabled state backed by localStorage — drives the mute toggle
 * in the nav bar, and owns the ambient drone's lifecycle so it starts as soon
 * as sound is on (including on reload, if it was already enabled) and stops
 * the moment it's muted.
 */
export function useSound() {
  const [enabled, setEnabledState] = useState(false);
  const isFirstEffect = useRef(true);

  useEffect(() => {
    setEnabledState(isSoundEnabled());
  }, []);

  // Side effects live here, keyed on the actual state value — never inside the
  // setState updater below, which React (StrictMode) may invoke more than
  // once purely to check that it's pure.
  useEffect(() => {
    if (isFirstEffect.current) {
      isFirstEffect.current = false;
      if (enabled) startAmbient();
      return;
    }
    setSoundEnabled(enabled);
    if (enabled) {
      startAmbient();
      playSound("chime"); // immediate, unmistakable confirmation that sound just turned on
    } else {
      stopAmbient();
    }
  }, [enabled]);

  useEffect(() => stopAmbient, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => !prev);
  }, []);

  return { enabled, toggle };
}
