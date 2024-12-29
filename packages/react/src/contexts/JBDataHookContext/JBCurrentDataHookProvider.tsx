import { debug } from "juice-sdk-core";
import { useJBRulesetMetadata } from "../JBRulesetContext/JBRulesetContext";
import { JBDataHookProvider } from "./JBDataHookContext";

/**
 * Provide infortmaion about the current funding cycle's datahook.
 *
 * @note depends on JBFundingCycleContext
 */
export function JBCurrentDataHookProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data } = useJBRulesetMetadata();
  const dataHookAddress = data?.dataHook;

  debug("JBCurrentDataHookContext", { dataHookAddress });

  return (
    <JBDataHookProvider dataHookAddress={dataHookAddress}>
      {children}
    </JBDataHookProvider>
  );
}
