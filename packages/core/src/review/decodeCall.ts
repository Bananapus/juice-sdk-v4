import {
  decodeFunctionData,
  encodeFunctionData,
  erc20Abi,
  toFunctionSelector,
  type Abi,
  type AbiFunction,
  type Address,
  type Hex,
} from "viem";
import { erc2771ForwarderAbi } from "../generated/abi/erc2771ForwarderAbi.js";
import { jb721TiersHookAbi } from "../generated/abi/jb721TiersHookAbi.js";
import { jb721TiersHookDeployerAbi } from "../generated/abi/jb721TiersHookDeployerAbi.js";
import { jb721TiersHookProjectDeployerAbi } from "../generated/abi/jb721TiersHookProjectDeployerAbi.js";
import { jb721TiersHookStoreAbi } from "../generated/abi/jb721TiersHookStoreAbi.js";
import { jbAddressRegistryAbi } from "../generated/abi/jbAddressRegistryAbi.js";
import { jbBuybackHookAbi } from "../generated/abi/jbBuybackHookAbi.js";
import { jbBuybackHookPreviousAbi } from "../generated/abi/jbBuybackHookPreviousAbi.js";
import { jbBuybackHookRegistryAbi } from "../generated/abi/jbBuybackHookRegistryAbi.js";
import { jbBuybackHookV1Abi } from "../generated/abi/jbBuybackHookV1Abi.js";
import { jbControllerAbi } from "../generated/abi/jbControllerAbi.js";
import { jbDeadline1DayAbi } from "../generated/abi/jbDeadline1DayAbi.js";
import { jbDeadline3DaysAbi } from "../generated/abi/jbDeadline3DaysAbi.js";
import { jbDeadline3HoursAbi } from "../generated/abi/jbDeadline3HoursAbi.js";
import { jbDeadline7DaysAbi } from "../generated/abi/jbDeadline7DaysAbi.js";
import { jbDirectoryAbi } from "../generated/abi/jbDirectoryAbi.js";
import { jbFundAccessLimitsAbi } from "../generated/abi/jbFundAccessLimitsAbi.js";
import { jbMultiTerminalAbi } from "../generated/abi/jbMultiTerminalAbi.js";
import { jbOmnichainDeployerAbi } from "../generated/abi/jbOmnichainDeployerAbi.js";
import { jbp6FeeLpSplitHookAbi } from "../generated/abi/jbp6FeeLpSplitHookAbi.js";
import { jbPermissionsAbi } from "../generated/abi/jbPermissionsAbi.js";
import { jbPricesAbi } from "../generated/abi/jbPricesAbi.js";
import { jbProjectsAbi } from "../generated/abi/jbProjectsAbi.js";
import { jbRatioPriceFeedAbi } from "../generated/abi/jbRatioPriceFeedAbi.js";
import { jbRouterTerminalAbi } from "../generated/abi/jbRouterTerminalAbi.js";
import { jbRouterTerminalGatewayAbi } from "../generated/abi/jbRouterTerminalGatewayAbi.js";
import { jbRouterTerminalRegistryAbi } from "../generated/abi/jbRouterTerminalRegistryAbi.js";
import { jbRulesetsAbi } from "../generated/abi/jbRulesetsAbi.js";
import { jbSplitsAbi } from "../generated/abi/jbSplitsAbi.js";
import { jbSuckerRegistryAbi } from "../generated/abi/jbSuckerRegistryAbi.js";
import { jbTerminalStoreAbi } from "../generated/abi/jbTerminalStoreAbi.js";
import { jbTokensAbi } from "../generated/abi/jbTokensAbi.js";
import { jbUniswapV4LpSplitHookAbi } from "../generated/abi/jbUniswapV4LpSplitHookAbi.js";
import { jbUniswapV4LpSplitHookDeployerAbi } from "../generated/abi/jbUniswapV4LpSplitHookDeployerAbi.js";
import { revDeployerAbi } from "../generated/abi/revDeployerAbi.js";
import { revLoansAbi } from "../generated/abi/revLoansAbi.js";
import { revOwnerAbi } from "../generated/abi/revOwnerAbi.js";
import { stickyAutoStickAbi } from "../generated/abi/stickyAutoStickAbi.js";
import { stickyDeployerAbi } from "../generated/abi/stickyDeployerAbi.js";
import { stickyDistributorAbi } from "../generated/abi/stickyDistributorAbi.js";
import { stickyHookAbi } from "../generated/abi/stickyHookAbi.js";
import { stickyRewardReceiverFactoryAbi } from "../generated/abi/stickyRewardReceiverFactoryAbi.js";
import type { jbV6ContractAddress } from "../generated/juicebox.js";
import { MULTI_SEND_ABI, SAFE_CREATE_ABI } from "../safe.js";
import { permit2Abi } from "../v6/permit2.js";
import { stickySourceCollectorAbi } from "../v6/sticky.js";
import { knownAddressName } from "./decode.js";
import type { TransactionReviewCall } from "./transactionReview.js";

type ReviewAbis = Readonly<
  Record<keyof typeof jbV6ContractAddress, Abi> & Record<string, Abi>
>;

let abis: ReviewAbis | undefined;

/**
 * The ABI of each contract {@link knownAddressName} names, by that name. A
 * retired generation keeps its own ABI where the SDK has one. The type makes
 * every V6 deployment carry one.
 */
function reviewAbis(): ReviewAbis {
  return (abis ??= {
    ERC2771Forwarder: erc2771ForwarderAbi,
    JB721TiersHook: jb721TiersHookAbi,
    JB721TiersHookDeployer: jb721TiersHookDeployerAbi,
    JB721TiersHookProjectDeployer: jb721TiersHookProjectDeployerAbi,
    JB721TiersHookStore: jb721TiersHookStoreAbi,
    JBAddressRegistry: jbAddressRegistryAbi,
    JBBuybackHook: jbBuybackHookAbi,
    "JBBuybackHook (previous)": jbBuybackHookPreviousAbi,
    "JBBuybackHook (v1)": jbBuybackHookV1Abi,
    JBBuybackHookRegistry: jbBuybackHookRegistryAbi,
    JBController: jbControllerAbi,
    JBDeadline1Day: jbDeadline1DayAbi,
    JBDeadline3Days: jbDeadline3DaysAbi,
    JBDeadline3Hours: jbDeadline3HoursAbi,
    JBDeadline7Days: jbDeadline7DaysAbi,
    JBDirectory: jbDirectoryAbi,
    JBFundAccessLimits: jbFundAccessLimitsAbi,
    JBMultiTerminal: jbMultiTerminalAbi,
    JBOmnichainDeployer: jbOmnichainDeployerAbi,
    JBP6FeeLPSplitHook: jbp6FeeLpSplitHookAbi,
    JBPermissions: jbPermissionsAbi,
    JBPrices: jbPricesAbi,
    JBProjects: jbProjectsAbi,
    JBRatioPriceFeed: jbRatioPriceFeedAbi,
    JBRouterTerminal: jbRouterTerminalAbi,
    JBRouterTerminalGateway: jbRouterTerminalGatewayAbi,
    JBRouterTerminalRegistry: jbRouterTerminalRegistryAbi,
    JBRulesets: jbRulesetsAbi,
    JBSplits: jbSplitsAbi,
    JBSuckerRegistry: jbSuckerRegistryAbi,
    JBTerminalStore: jbTerminalStoreAbi,
    JBTokens: jbTokensAbi,
    JBUniswapV4LPSplitHook: jbUniswapV4LpSplitHookAbi,
    JBUniswapV4LPSplitHookDeployer: jbUniswapV4LpSplitHookDeployerAbi,
    REVDeployer: revDeployerAbi,
    REVLoans: revLoansAbi,
    REVOwner: revOwnerAbi,
    StickyAutoStick: stickyAutoStickAbi,
    StickyDeployer: stickyDeployerAbi,
    StickyDistributor: stickyDistributorAbi,
    StickyHook: stickyHookAbi,
    StickyRewardReceiverFactory: stickyRewardReceiverFactoryAbi,
    StickySourceCollector: stickySourceCollectorAbi,
    Permit2: permit2Abi,
    USDC: erc20Abi,
  });
}

let bySelector: ReadonlyMap<string, AbiFunction> | undefined;

/**
 * Every function the SDK knows, by selector. ERC-20 comes first, so a
 * selector it shares (ERC-721's `approve`) reads as ERC-20; otherwise the
 * first ABI to declare a selector keeps it.
 */
function functionsBySelector(): ReadonlyMap<string, AbiFunction> {
  if (bySelector) return bySelector;
  const functions = new Map<string, AbiFunction>();
  for (const abi of [
    erc20Abi as Abi,
    ...Object.values(reviewAbis()),
    MULTI_SEND_ABI,
    SAFE_CREATE_ABI,
  ]) {
    for (const item of abi) {
      if (item.type !== "function") continue;
      const selector = toFunctionSelector(item);
      if (!functions.has(selector)) functions.set(selector, item);
    }
  }
  return (bySelector = functions);
}

/** `item`'s arguments in `data`, when `data` is exactly their canonical encoding. */
function decodeExactly(
  item: AbiFunction,
  data: Hex,
): Pick<TransactionReviewCall, "abi" | "functionName" | "args"> | null {
  try {
    const { args = [] } = decodeFunctionData({ abi: [item], data });
    const encoded = encodeFunctionData({
      abi: [item],
      functionName: item.name,
      args,
    });
    return encoded.toLowerCase() === data.toLowerCase()
      ? { abi: [item], functionName: item.name, args }
      : null;
  } catch {
    return null;
  }
}

/**
 * A raw call as the review takes it, decoded by the SDK alone: with the ABI
 * of the known contract at `to` on `chainId`, else by its selector across the
 * SDK's ABIs and ERC-20. A decode counts only when the arguments re-encode to
 * exactly `data`; otherwise the call has no ABI and the review shows it raw.
 * The gas a wallet or Safe signs passes through, so it stays bound in the id.
 */
export function decodeReviewCall(call: {
  chainId: number;
  to: Address;
  data: Hex;
  value?: bigint;
  from?: Address;
  gas?: bigint;
  safeTxGas?: bigint;
}): TransactionReviewCall {
  const raw: TransactionReviewCall = {
    chainId: call.chainId,
    to: call.to,
    data: call.data,
    ...(call.value === undefined ? {} : { value: call.value }),
    ...(call.from === undefined ? {} : { from: call.from }),
    ...(call.gas === undefined ? {} : { gas: call.gas }),
    ...(call.safeTxGas === undefined ? {} : { safeTxGas: call.safeTxGas }),
  };
  if (!/^0x[0-9a-f]{8}/iu.test(call.data)) return raw;
  const selector = call.data.slice(0, 10).toLowerCase();
  const name = knownAddressName(call.chainId, call.to)?.replace(
    / \((?:current|home chain \d+)\)$/u,
    "",
  );
  const own = name
    ? reviewAbis()[name]?.find(
        (item): item is AbiFunction =>
          item.type === "function" && toFunctionSelector(item) === selector,
      )
    : undefined;
  const item = own ?? functionsBySelector().get(selector);
  const decoded = item ? decodeExactly(item, call.data) : null;
  return decoded ? { ...raw, ...decoded } : raw;
}
