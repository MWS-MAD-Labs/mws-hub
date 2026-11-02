import { useEffect, useState } from "react";
import { gptCodeApi } from "./gptCodeApi";

// GPT Code is a Hub feature, not an app Central publishes, so whether to
// offer it comes from Hub's own answer: an admin, or a unit with an active
// mapping, gets an assignment; anyone else gets a refusal and sees no entry.
// Until the answer arrives (or if it fails) the entry stays hidden.
export default function useGptCodeAccess(): boolean {
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    gptCodeApi
      .assignment()
      .then(() => {
        if (!cancelled) setHasAccess(true);
      })
      .catch(() => {
        if (!cancelled) setHasAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return hasAccess;
}
