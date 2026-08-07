import { debug } from "@bananapus/nana-sdk-core";
import { useJBContractContext } from "../JBContractContext/JBContractContext";
import { JBTerminalProvider } from "./JBTerminalContext";

/**
 * Provide infortmaion about the project's primary native terminal.
 *
 * @note depends on JBContractContext
 */
export function JBPrimaryNativeTerminalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { contracts } = useJBContractContext();
  const terminalAddress = contracts?.primaryNativeTerminal?.data ?? undefined;
  debug("JBPrimaryNativeTerminalProvider", { terminalAddress });

  // Always render the provider: swapping between bare children and a wrapped
  // subtree changes the element type, so React would remount everything below
  // (losing state and refiring queries) the moment the terminal resolves. An
  // undefined address keeps the terminal reads disabled on its own.
  return (
    <JBTerminalProvider address={terminalAddress}>
      {children}
    </JBTerminalProvider>
  );
}
