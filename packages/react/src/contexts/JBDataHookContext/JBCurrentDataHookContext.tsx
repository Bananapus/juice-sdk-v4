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

  return (
    <JBDataHookProvider dataHookAddress={dataHookAddress}>
      {children}
    </JBDataHookProvider>
  );
}
