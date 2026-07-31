import { useCallback, useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "./sound";

/** Global sound-enabled state backed by localStorage — drives the mute toggle in the nav bar. */
export function useSound() {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    setEnabledState(isSoundEnabled());
  }, []);

  const toggle = useCallback(() => {
    setEnabledState((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  return { enabled, toggle };
}
