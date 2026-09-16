import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { ConnectController, ConnectOption } from "../core/controller.js";
import { connectModalCss } from "./styles.js";

export type JBConnectModalProps = {
  open: boolean;
  controller: ConnectController;
  /** Called for Escape, the backdrop and the cancel button, after the controller is cancelled. */
  onClose(): void;
  /** Which option is the passkey account; it renders as the primary button. */
  passkeyId?: string;
  title?: ReactNode;
  /** Renders a pairing URI (a QR code, a deep link) once an option publishes one. */
  renderHandoff?(uri: string, option: ConnectOption): ReactNode;
  /** A mark for an option without an icon. Defaults to the option's initial. */
  renderIcon?(option: ConnectOption): ReactNode;
  /** Extra footer actions, laid out on the cancel button's baseline. */
  footer?: ReactNode;
  /** App content shown under the wallet tiles while idle, such as mobile wallet links. */
  children?: ReactNode;
  className?: string;
};

export function JBConnectModal(props: JBConnectModalProps) {
  const { controller, open, onClose, passkeyId = "juicebox-center" } = props;
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      element.querySelector<HTMLElement>("h2")?.focus();
    } else if (!open && element.open) {
      element.close();
      // A finished wallet option keeps its pending state so the passkey redirect is not
      // interrupted; the next open must start clean.
      controller.cancel();
    }
  }, [open, controller]);
  const cancel = () => {
    controller.cancel();
    onClose();
  };
  const passkey = controller.options.find((option) => option.id === passkeyId);
  const wallets = controller.options.filter(
    (option) => option.id !== passkeyId,
  );
  const pending = state.pending
    ? controller.options.find((option) => option.id === state.pending)
    : undefined;
  return (
    <dialog
      ref={dialog}
      className={"jb-connect" + (props.className ? " " + props.className : "")}
      aria-label={typeof props.title === "string" ? props.title : "Sign in"}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      onMouseDown={(event) => {
        // The dialog element receives clicks on its own padding too; only the backdrop cancels.
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          cancel();
      }}
    >
      <style>{connectModalCss}</style>
      <h2 tabIndex={-1}>{props.title ?? "Sign in"}</h2>
      {pending ? (
        <div role="status" aria-label="Connection">
          {state.handoffUri && props.renderHandoff ? (
            <div className="jb-connect-handoff">
              {props.renderHandoff(state.handoffUri, pending)}
            </div>
          ) : (
            <p className="jb-connect-status">
              {pending === passkey
                ? "Continuing at Juicebox Center…"
                : `Opening ${pending.name}…`}
            </p>
          )}
        </div>
      ) : (
        <>
          {passkey && (
            <>
              <button
                type="button"
                className="jb-connect-primary"
                disabled={passkey.disabled}
                onClick={() => void controller.choose(passkey.id)}
              >
                Continue with a passkey
              </button>
              <p className="jb-connect-powered">Powered by Juicebox Center</p>
            </>
          )}
          {wallets.length > 0 && (
            <>
              <p className="jb-connect-divider">
                {passkey ? "or connect a wallet" : "Connect a wallet"}
              </p>
              <div className="jb-connect-tiles">
                {wallets.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className="jb-connect-tile"
                    title={option.name}
                    aria-label={option.name}
                    disabled={option.disabled}
                    onClick={() => void controller.choose(option.id)}
                  >
                    {option.icon ? (
                      <img src={option.icon} alt="" />
                    ) : (
                      (props.renderIcon?.(option) ?? (
                        <span aria-hidden="true">
                          {option.name.slice(0, 1)}
                        </span>
                      ))
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {props.children}
        </>
      )}
      {state.error && (
        <p role="alert" className="jb-connect-error">
          {state.error}
        </p>
      )}
      <div className="jb-connect-footer">
        {props.footer}
        <button type="button" className="jb-connect-text" onClick={cancel}>
          {pending ? "Cancel connection" : "Cancel"}
        </button>
      </div>
    </dialog>
  );
}
