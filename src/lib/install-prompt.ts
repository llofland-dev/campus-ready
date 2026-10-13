// The browser's "install this app" offer. Chrome, Edge and Samsung Internet announce it once with a
// `beforeinstallprompt` event, and it can only be used if the page keeps hold of it, so a tiny script in the
// root layout (INSTALL_CAPTURE_SCRIPT) catches it on EVERY page load and stores it here. The install page and the
// home screen's install button then read it. (Safari on iPhone never sends one — Apple has no install button for
// web apps — so there the page can only show the steps.)

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __eopInstall?: InstallPromptEvent | null;
    __eopInstalled?: boolean;
  }
}

// Runs before the page's own code, in the <head>. preventDefault() stops the browser's small automatic banner so
// our own button is the single, clear way to install.
export const INSTALL_CAPTURE_SCRIPT = `(function(){
  window.addEventListener("beforeinstallprompt", function(e){
    e.preventDefault();
    window.__eopInstall = e;
    window.dispatchEvent(new Event("eop-install-change"));
  });
  window.addEventListener("appinstalled", function(){
    window.__eopInstalled = true;
    window.__eopInstall = null;
    window.dispatchEvent(new Event("eop-install-change"));
  });
})();`;

export function subscribeInstallState(onChange: () => void): () => void {
  const display = window.matchMedia("(display-mode: standalone)");
  window.addEventListener("eop-install-change", onChange);
  display.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("eop-install-change", onChange);
    display.removeEventListener("change", onChange);
  };
}

// The stored offer, or null. The same object every time until it changes (React needs that to stay calm).
export function getInstallEvent(): InstallPromptEvent | null {
  return window.__eopInstall ?? null;
}

// True when Campus Ready is already running as an installed app (or has just been installed).
export function getInstalled(): boolean {
  return (
    window.__eopInstalled === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// A stored offer can be used only once.
export function clearInstallEvent(): void {
  window.__eopInstall = null;
  window.dispatchEvent(new Event("eop-install-change"));
}

// Asks the browser to show its install dialog. Returns what the person chose.
export async function runInstallPrompt(event: InstallPromptEvent): Promise<"accepted" | "dismissed"> {
  await event.prompt();
  const choice = await event.userChoice;
  clearInstallEvent();
  return choice.outcome;
}
