// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import {
  createConnectController,
  type ConnectOption,
} from "../core/controller";
import { JBConnectModal } from "./JBConnectModal";

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
    expect(view.querySelector(".jb-connect-text")!.textContent).toBe(
      "Cancel connection",
    );
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
