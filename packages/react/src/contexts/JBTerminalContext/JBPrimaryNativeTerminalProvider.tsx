import { debug } from "src/debug";
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
  const terminalAddress = contracts?.primaryNativeTerminal?.data;
  debug("JBPrimaryNativeTerminalProvider", { terminalAddress });

  if (!terminalAddress) return children;

  return (
    <JBTerminalProvider address={terminalAddress}>
      {children}
    </JBTerminalProvider>
  );
}
