/** The passkey sign-in in a popup: the app page opens a named window, Center's launch form targets
 * it, and the callback lands on the app's own origin inside that window. The callback page hands
 * its URL back to the page by message, the page finishes the exchange, and the popup closes. Every
 * message is same-origin: the page and the callback page are both the app. */
export const popupName = "juicebox-center";
const callbackType = "juicebox-center:callback";
const receivedType = "juicebox-center:received";

/** Must run synchronously in the user's click, before any await, or browsers block it. Null when
 * blocked, so the caller falls back to the full-page redirect. */
export function openCenterPopup(win: Window | undefined): Window | null {
  if (!win) return null;
  const width = 460,
    height = 720;
  const left = Math.max(
    0,
    Math.round((win.outerWidth ?? width) / 2 - width / 2 + (win.screenX ?? 0)),
  );
  const top = Math.max(
    0,
    Math.round(
      (win.outerHeight ?? height) / 2 - height / 2 + (win.screenY ?? 0),
    ),
  );
  try {
    return win.open(
      "",
      popupName,
      `popup,width=${width},height=${height},left=${left},top=${top}`,
    );
  } catch {
    return null;
  }
}

const abort = () =>
  new DOMException("The sign-in window was closed.", "AbortError");

/** Resolves with the callback URL the popup delivers. Rejects with an AbortError when the popup
 * closes first or the signal aborts, which the controller shows as no error. */
export function awaitPopupCallback(
  win: Window,
  popup: Window,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const origin = win.location.origin;
    const done = () => {
      win.removeEventListener("message", onMessage);
      signal.removeEventListener("abort", onAbort);
      clearInterval(timer);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; url?: unknown } | null;
      if (
        event.source !== popup ||
        event.origin !== origin ||
        data?.type !== callbackType ||
        typeof data.url !== "string"
      )
        return;
      done();
      popup.postMessage({ type: receivedType }, origin);
      resolve(data.url);
    };
    const onAbort = () => {
      done();
      popup.close();
      reject(abort());
    };
    const timer = setInterval(() => {
      if (!popup.closed) return;
      done();
      reject(abort());
    }, 250);
    win.addEventListener("message", onMessage);
    signal.addEventListener("abort", onAbort);
  });
}

/** For the app's callback page. Hands the callback URL to the same-origin page that opened this
 * window and closes it once that page acknowledges. The page may be slow to answer (a backgrounded
 * tab on a phone), so the offer repeats until it is acknowledged or the opener closes. The cap
 * (default fifteen minutes, the life of a Center request) covers an opener that navigated away;
 * after it the callback page completes the exchange itself, as it does after a full-page
 * redirect, while still closing on a late acknowledgement. False when there is no same-origin
 * opener. */
export function deliverCenterCallback(
  url: string,
  options: { window?: Window; timeoutMs?: number; retryMs?: number } = {},
): Promise<boolean> {
  const win = options.window;
  const opener = win?.opener as Window | null | undefined;
  if (!win || !opener) return Promise.resolve(false);
  const origin = win.location.origin;
  // A cross-origin opener (the app tab was opened from elsewhere) throws here: not ours.
  try {
    if (opener.closed || opener.location.origin !== origin)
      return Promise.resolve(false);
  } catch {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (delivered: boolean) => {
      clearInterval(again);
      clearTimeout(cap);
      if (delivered) {
        win.removeEventListener("message", onMessage);
        win.close();
      }
      // After the cap the page goes on alone, but a late acknowledgement still closes this window.
      if (!settled) {
        settled = true;
        resolve(delivered);
      }
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown } | null;
      if (
        event.source !== opener ||
        event.origin !== origin ||
        data?.type !== receivedType
      )
        return;
      finish(true);
    };
    const offer = () => {
      if (opener.closed) return finish(false);
      opener.postMessage({ type: callbackType, url }, origin);
    };
    const again = setInterval(offer, options.retryMs ?? 1500);
    const cap = setTimeout(() => finish(false), options.timeoutMs ?? 900_000);
    win.addEventListener("message", onMessage);
    offer();
  });
}
