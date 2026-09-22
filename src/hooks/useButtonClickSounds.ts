"use client";

import { useEffect } from "react";

type ButtonSoundTone = "normal" | "positive" | "danger" | "navigation";

let buttonAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  buttonAudioContext ||= new AudioContextClass();
  return buttonAudioContext;
}

function playTone(tone: ButtonSoundTone) {
  const context = getAudioContext();
  if (!context) return;

  void context.resume();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  const settings: Record<ButtonSoundTone, { from: number; to: number; peak: number; duration: number; type: OscillatorType }> = {
    normal: { from: 760, to: 520, peak: 0.055, duration: 0.06, type: "sine" },
    positive: { from: 620, to: 880, peak: 0.06, duration: 0.075, type: "triangle" },
    danger: { from: 220, to: 150, peak: 0.07, duration: 0.09, type: "sawtooth" },
    navigation: { from: 520, to: 660, peak: 0.045, duration: 0.055, type: "sine" },
  };

  const config = settings[tone];
  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.from, now);
  oscillator.frequency.exponentialRampToValueAtTime(config.to, now + config.duration * 0.72);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(config.peak, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + config.duration + 0.01);
}

function classifyTarget(element: HTMLElement): ButtonSoundTone {
  const text = [
    element.textContent,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.className,
  ].join(" ").toLowerCase();

  if (/(delete|remove|discard|cancel|danger|trash|red-|red\/)/.test(text)) return "danger";
  if (/(save|complete|finish|add|create|start|continue|success|green-|emerald-|cyan-300)/.test(text)) return "positive";
  if (element instanceof HTMLAnchorElement || element.closest("a[href]")) return "navigation";
  return "normal";
}

function isClickableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null;
  const element = target.closest<HTMLElement>("button, a[href], [role='button']");
  if (!element) return null;
  if (element instanceof HTMLButtonElement && element.disabled) return null;
  if (element.getAttribute("aria-disabled") === "true") return null;
  return element;
}

export default function useButtonClickSounds(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      const element = isClickableTarget(event.target);
      if (!element) return;
      playTone(classifyTarget(element));
    }

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [enabled]);
}
