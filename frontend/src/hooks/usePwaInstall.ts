import { useSyncExternalStore } from "react";
import { canPromptInstall, promptInstall, subscribeInstallPrompt } from "@/lib/pwaInstall";

// True only while the browser has handed us an unused install prompt and the
// app is not already running as an installed PWA.
export default function usePwaInstall() {
  const canInstall = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall, () => false);
  return { canInstall, promptInstall };
}
