// Chrome/Edge fire `beforeinstallprompt` once, often before React mounts, so
// the event is captured here at startup and handed to whichever component
// asks for it later. Browsers without the event (Safari, Firefox) simply never
// make an install prompt available and the UI stays hidden.

type InstallOutcome = "accepted" | "dismissed";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

export const listenForInstallPrompt = (): void => {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (event) => {
    // Suppress the browser's mini-infobar; the app shows its own button.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
};

export const subscribeInstallPrompt = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const canPromptInstall = (): boolean => deferredPrompt !== null && !isStandalone();

export const promptInstall = async (): Promise<InstallOutcome | null> => {
  const event = deferredPrompt;
  if (!event) return null;

  // A prompt event can only be used once, whatever the user answers.
  deferredPrompt = null;
  notify();

  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
};
