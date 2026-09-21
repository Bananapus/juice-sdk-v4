// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import {
  createConnectController,
  type ConnectOption,
} from "../core/controller";
import { JBConnectModal, themeOf } from "./JBConnectModal";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no top layer; model the open flag the way the browser does.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});
function mount(element: React.ReactElement) {
  host = document.body.appendChild(document.createElement("div"));
  root = createRoot(host);
  act(() => root!.render(element));
  return host;
}
const option = (
  id: string,
  name: string,
  connect: ConnectOption["connect"] = async () => {},
  extra: Partial<ConnectOption> = {},
): ConnectOption => ({ id, name, connect, ...extra });

describe("JBConnectModal", () => {
  test("offers the passkey first, wallets as tiles, and calls the option that is clicked", async () => {
    const passkey = vi.fn(async () => {});
    const controller = createConnectController([
      option("juicebox-center", "Juicebox account", passkey),
      option("rainbow", "Rainbow", undefined, { icon: "data:image/svg+xml,x" }),
      option("wc", "WalletConnect", undefined, { disabled: true }),
    ]);
    const onClose = vi.fn();
    const view = mount(
      <JBConnectModal open controller={controller} onClose={onClose} />,
    );
    const dialog = view.querySelector("dialog")!;
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(dialog.getAttribute("aria-label")).toBe("Sign in");
    expect(view.querySelector("h2")!.textContent).toBe("Sign in");
    expect(view.querySelector(".jb-connect-primary")!.textContent).toBe(
      "Continue with a passkey",
    );
    expect(view.querySelector(".jb-connect-powered")!.textContent).toBe(
      "Powered by Juicebox Center",
    );
    expect(view.querySelector(".jb-connect-divider")!.textContent).toBe(
      "or connect a wallet",
    );
    const tiles = view.querySelectorAll<HTMLButtonElement>(".jb-connect-tile");
    expect([...tiles].map((tile) => tile.getAttribute("aria-label"))).toEqual([
      "Rainbow",
      "WalletConnect",
    ]);
    expect(tiles[0]!.querySelector("img")!.getAttribute("src")).toBe(
      "data:image/svg+xml,x",
    );
    expect(tiles[1]!.disabled).toBe(true);
    expect(tiles[1]!.textContent).toBe("W");
    expect(view.querySelector(".jb-connect-text")!.textContent).toBe("Cancel");
    await act(async () =>
      view.querySelector<HTMLButtonElement>(".jb-connect-primary")!.click(),
    );
    expect(passkey).toHaveBeenCalledOnce();
    expect(view.querySelector('[role="status"]')!.textContent).toContain(
      "Continuing at Juicebox Center",
    );
    expect(view.querySelector(".jb-connect-primary")).toBeNull();
    expect(view.querySelector(".jb-connect-text")!.textContent).toBe("Cancel");
    await act(async () =>
      view.querySelector<HTMLButtonElement>(".jb-connect-text")!.click(),
    );
    expect(onClose).toHaveBeenCalledOnce();
    expect(controller.getState().pending).toBeNull();
    expect(view.querySelector(".jb-connect-primary")).not.toBeNull();
  });
  test("renders a handoff for a wallet's pairing URI, errors as alerts, custom marks, a title and a footer", async () => {
    let publish!: (uri: string) => void;
    const controller = createConnectController([
      option("wc", "WalletConnect", ({ handoff }) => {
        publish = handoff;
        return new Promise(() => {});
      }),
      option("bad", "Broken", async () => {
        throw new Error("Wallet closed.");
      }),
    ]);
    const view = mount(
      <JBConnectModal
        open
        controller={controller}
        onClose={() => {}}
        title={<em>Pay</em>}
        renderIcon={(o) => <svg data-mark={o.id} />}
        renderHandoff={(uri, o) => <a href={uri}>Open {o.name}</a>}
        footer={<button type="button">Help</button>}
        className="app"
      >
        <p id="mobile">Or open it in your wallet app.</p>
      </JBConnectModal>,
    );
    const dialog = view.querySelector("dialog")!;
    expect(dialog.className).toBe("jb-connect app");
    expect(view.querySelector("#mobile")).not.toBeNull();
    expect(dialog.getAttribute("aria-label")).toBe("Sign in");
    expect(view.querySelector("h2 em")!.textContent).toBe("Pay");
    expect(view.querySelector(".jb-connect-divider")!.textContent).toBe(
      "Connect a wallet",
    );
    expect(view.querySelector('[data-mark="wc"]')).not.toBeNull();
    expect(
      view.querySelector(".jb-connect-footer")!.firstElementChild!.textContent,
    ).toBe("Help");
    await act(async () =>
      view.querySelector<HTMLButtonElement>('[aria-label="Broken"]')!.click(),
    );
    expect(view.querySelector('[role="alert"]')!.textContent).toBe(
      "Wallet closed.",
    );
    await act(async () =>
      view
        .querySelector<HTMLButtonElement>('[aria-label="WalletConnect"]')!
        .click(),
    );
    expect(view.querySelector('[role="status"]')!.textContent).toBe(
      "Opening WalletConnect…",
    );
    await act(async () => publish("wc:pair"));
    expect(
      view.querySelector(".jb-connect-handoff a")!.getAttribute("href"),
    ).toBe("wc:pair");
  });
  test("shows the frame an option asks for, sized by the page inside it, and drops it on cancel", async () => {
    let ask!: (name: string, origin: string) => void;
    const controller = createConnectController([
      option("juicebox-center", "Juicebox account", ({ frame }) => {
        ask = frame;
        return new Promise(() => {});
      }),
    ]);
    const view = mount(
      <JBConnectModal open controller={controller} onClose={() => {}} />,
    );
    await act(async () =>
      view.querySelector<HTMLButtonElement>(".jb-connect-primary")!.click(),
    );
    expect(view.querySelector("iframe")).toBeNull();
    await act(async () =>
      ask("juicebox-center-frame", "https://center.example"),
    );
    const frame = view.querySelector("iframe")!;
    expect(frame.getAttribute("name")).toBe("juicebox-center-frame");
    // Center's origin by name: the frame has no src for the browser to take it from.
    expect(frame.getAttribute("allow")).toBe(
      "publickey-credentials-get https://center.example; publickey-credentials-create https://center.example",
    );
    expect(frame.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame.style.height).toBe("");
    // Only the frame's own window sizes it; anything else is ignored.
    const size = (source: unknown, height: unknown) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "juicebox-center:size", height },
          source: source as Window,
        }),
      );
    await act(async () => size(window, 500));
    expect(frame.style.height).toBe("");
    const dialogElement = view.querySelector("dialog")!;
    const posted = vi.spyOn(frame.contentWindow!, "postMessage");
    await act(async () => size(frame.contentWindow, 500));
    expect(frame.style.height).toBe("502px");
    // The size report is answered with the dialog's resolved theme (jsdom resolves the custom
    // properties from the dialog's own stylesheet but no inherited font).
    expect(posted).toHaveBeenCalledWith(
      { type: "juicebox-center:theme", theme: themeOf(dialogElement) },
      "*",
    );
    expect(themeOf(dialogElement)).toEqual(
      expect.objectContaining({
        background: "#fff",
        accent: "#1a1a1a",
        accentForeground: "#fff",
        radius: "16px",
        inset: "32px",
      }),
    );
    await act(async () => size(frame.contentWindow, "tall"));
    expect(frame.style.height).toBe("502px");
    await act(async () =>
      view.querySelector<HTMLButtonElement>(".jb-connect-text")!.click(),
    );
    expect(view.querySelector("iframe")).toBeNull();
    expect(controller.getState().frameName).toBeNull();
  });
  test("names the platform's prompt on the primary button, and a prop overrides it", async () => {
    const controller = createConnectController([
      option("juicebox-center", "Juicebox account"),
    ]);
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)",
      configurable: true,
    });
    try {
      const view = mount(
        <JBConnectModal open controller={controller} onClose={() => {}} />,
      );
      expect(view.querySelector(".jb-connect-primary")!.textContent).toBe(
        "Continue with Touch ID",
      );
      act(() =>
        root!.render(
          <JBConnectModal
            open
            controller={controller}
            onClose={() => {}}
            passkeyLabel="Use your passkey"
          />,
        ),
      );
      expect(view.querySelector(".jb-connect-primary")!.textContent).toBe(
        "Use your passkey",
      );
    } finally {
      Object.defineProperty(navigator, "userAgent", {
        value: original,
        configurable: true,
      });
    }
  });

  test("Escape and the backdrop cancel; closing resets the controller and reopening follows the open prop", async () => {
    const controller = createConnectController([
      option("juicebox-center", "Juicebox account"),
      option("rainbow", "Rainbow", async () => {}),
    ]);
    const onClose = vi.fn();
    const view = mount(
      <JBConnectModal open controller={controller} onClose={onClose} />,
    );
    const dialog = view.querySelector("dialog")!;
    act(() => {
      dialog.dispatchEvent(
        new Event("cancel", { bubbles: true, cancelable: true }),
      );
    });
    // jsdom reports a zero-sized box, so (0,0) is inside the dialog and (-10,-10) is the backdrop.
    act(() => {
      dialog.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, clientX: 0, clientY: 0 }),
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => {
      dialog.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          clientX: -10,
          clientY: -10,
        }),
      );
    });
    act(() => {
      view.querySelector("h2")!.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          clientX: -10,
          clientY: -10,
        }),
      );
    });
    expect(onClose).toHaveBeenCalledTimes(2);
    await act(async () =>
      view.querySelector<HTMLButtonElement>('[aria-label="Rainbow"]')!.click(),
    );
    expect(controller.getState().pending).toBe("rainbow");
    act(() =>
      root!.render(
        <JBConnectModal
          open={false}
          controller={controller}
          onClose={onClose}
        />,
      ),
    );
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(controller.getState().pending).toBeNull();
    act(() =>
      root!.render(
        <JBConnectModal open controller={controller} onClose={onClose} />,
      ),
    );
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(view.querySelector(".jb-connect-primary")).not.toBeNull();
  });
});
