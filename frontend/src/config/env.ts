export const env = {
  hubApiBaseUrl: import.meta.env.VITE_HUB_API_BASE_URL || "http://localhost:4001",
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  googleRedirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || "",
};
