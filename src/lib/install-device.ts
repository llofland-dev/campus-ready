// Works out what kind of device and browser is looking at the install page, so it can show only the steps that
// apply (and the right kind of button). Pure text matching on the browser's self-description — no browser APIs —
// so it can be tested with sample strings.

export type Platform = "ios" | "android" | "desktop";
export type Browser = "safari" | "chrome" | "edge" | "firefox" | "samsung" | "other";

export interface Device {
  platform: Platform;
  browser: Browser;
  // True inside another app's built-in browser (Facebook, Instagram, Gmail, Teams, a QR scanner's viewer...).
  // Those can't add anything to a home screen, so the person has to open the page in their real browser first.
  inApp: boolean;
}

// Apps whose built-in browser announces itself.
const IN_APP_APPS =
  /FBAN|FBAV|FB_IAB|FB4A|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|LinkedInApp|TikTok|musical_ly|Bytedance|Pinterest|MSTeams|Teams\/|Outlook|GSA\/|Slack|Discord|KAKAOTALK|NAVER|Zalo/i;

export function detectDevice(userAgent: string, navigatorPlatform = "", maxTouchPoints = 0): Device {
  // Newer iPads describe themselves as a Mac; they are told apart by having a touch screen.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (navigatorPlatform === "MacIntel" && maxTouchPoints > 1);
  const android = !ios && /Android/i.test(userAgent);
  const platform: Platform = ios ? "ios" : android ? "android" : "desktop";

  let browser: Browser = "other";
  if (ios) {
    if (/CriOS/.test(userAgent)) browser = "chrome";
    else if (/FxiOS/.test(userAgent)) browser = "firefox";
    else if (/EdgiOS/.test(userAgent)) browser = "edge";
    else if (/Safari\//.test(userAgent) || navigatorPlatform === "MacIntel") browser = "safari";
  } else if (/SamsungBrowser/.test(userAgent)) {
    browser = "samsung";
  } else if (/EdgA|Edg\//.test(userAgent)) {
    browser = "edge";
  } else if (/Firefox\//.test(userAgent)) {
    browser = "firefox";
  } else if (/Chrome\//.test(userAgent)) {
    browser = "chrome";
  } else if (/Safari\//.test(userAgent)) {
    browser = "safari";
  }

  const inApp =
    IN_APP_APPS.test(userAgent) ||
    // A web view on iPhone/iPad has no "Safari/" in its description; real Safari and Chrome both do.
    (ios && !/Safari\//.test(userAgent)) ||
    // Android web views carry "; wv)".
    (android && /; wv\)/.test(userAgent));

  return { platform, browser, inApp };
}
