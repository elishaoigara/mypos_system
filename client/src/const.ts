export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const getLoginUrl = () => {
  // FIX: Change the fallback from 3005 to 3006 to match your current server
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "http://localhost:3007";
  const appId = import.meta.env.VITE_APP_ID || "default-app-id";
  
  // Using window.location.origin ensures it works on localhost OR when you host it later
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};