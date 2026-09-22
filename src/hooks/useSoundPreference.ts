"use client";

import { useEffect, useState } from "react";

const buttonSoundStorageKey = "expense-tracker-button-sounds";

function readStoredButtonSoundPreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(buttonSoundStorageKey) !== "off";
}

export default function useSoundPreference() {
  const [buttonSoundsEnabled, setButtonSoundsEnabledState] = useState(readStoredButtonSoundPreference);

  useEffect(() => {
    const sync = () => setButtonSoundsEnabledState(readStoredButtonSoundPreference());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  function setButtonSoundsEnabled(enabled: boolean) {
    setButtonSoundsEnabledState(enabled);
    window.localStorage.setItem(buttonSoundStorageKey, enabled ? "on" : "off");
  }

  return {
    buttonSoundsEnabled,
    setButtonSoundsEnabled,
  };
}
