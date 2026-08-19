const GOOGLE_IDENTITY_SRC = "https://accounts.google.com/gsi/client";

let googleIdentityPromise: Promise<void> | null = null;

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            prompt: string;
            redirect_uri?: string;
            callback: (response: { code?: string; error?: string }) => void;
            error_callback: () => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

type RequestGoogleCodeOptions = {
  clientId: string;
  redirectUri?: string;
};

export async function requestGoogleCode({ clientId, redirectUri }: RequestGoogleCodeOptions): Promise<string> {
  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID");
  }

  await loadGoogleIdentity();

  return new Promise((resolve, reject) => {
    const codeClient = window.google!.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      prompt: "select_account",
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      callback: (response) => {
        if (response.code) {
          resolve(response.code);
          return;
        }
        reject(new Error(response.error || "Google did not return a code"));
      },
      error_callback: () => {
        reject(new Error("Google login was cancelled"));
      },
    });

    codeClient.requestCode();
  });
}

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (!googleIdentityPromise) {
    googleIdentityPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google login"));
      document.head.appendChild(script);
    });
  }

  return googleIdentityPromise;
}
