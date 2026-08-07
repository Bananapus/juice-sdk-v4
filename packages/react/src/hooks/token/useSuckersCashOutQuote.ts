import {
  applyJbDaoCashOutFee,
  ETH_CURRENCY_ID,
  getJBContractAddress,
  getProjectTerminalStore,
  getTokenCashOutQuoteEth,
  JBChainId,
  jbController4_1Abi,
  jbControllerAbi,
  jbControllerV5Abi,
  JBCoreContracts,
  jbDirectoryAbi,
  jbTerminalStoreAbi,
  jbTerminalStoreV5Abi,
  JBVersion,
  NATIVE_TOKEN,
  NATIVE_TOKEN_DECIMALS,
} from "@bananapus/nana-sdk-core";
import { getContract } from "viem";
import { useConfig } from "wagmi";
import { useQuery, UseQueryReturnType } from "wagmi/query";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useJBContractContext } from "../../contexts/JBContractContext/JBContractContext";
import { useSuckers } from "../suckers/useSuckers";

/**
 * V6 accounting contexts key currencies by token (`uint32(uint160(token))`), so the
 * native token's currency id is 61166 rather than V4/V5's `ETH_CURRENCY_ID` (1).
 * Quoting V6 in its own convention avoids a needless price-feed conversion.
 */
const V6_NATIVE_TOKEN_CURRENCY_ID = Number(BigInt(NATIVE_TOKEN) & 0xffffffffn);

function nativeCurrencyId(version: JBVersion) {
  return version === 6 ? V6_NATIVE_TOKEN_CURRENCY_ID : ETH_CURRENCY_ID;
}

function controllerAbi(version: JBVersion) {
  if (version === 6) return jbControllerAbi;
  if (version === 5) return jbControllerV5Abi;
  return jbController4_1Abi;
}

/**
 * Return the amount of ETH (wei) received from cashing out [tokenAmountWei] project
 * tokens, net of the JBDAO cash-out fee, valued against the sucker group's aggregate
 * surplus and token supply: `tokenAmountWei × Σsurplus / Σsupply`, run through the
 * current ruleset's cash-out tax curve.
 *
 * A cash out executes on a single chain against that chain's local surplus and
 * supply, so an actual reclaim can differ from this group-wide value until sucker
 * syncs re-balance the group. The tax rate is read from the current chain's ruleset
 * (sucker group members share ruleset configuration).
 *
 * Returns `undefined` (not 0) while the quote is loading or when it failed.
 *
 * @param tokenAmountWei the amount of tokens to cash out.
 */
export function useSuckersCashOutQuote(tokenAmountWei: bigint) {
  const config = useConfig();
  const chainId = useJBChainId();
  const { projectId, version } = useJBContractContext();

  const { data: pairs = [], isLoading, error } = useSuckers();

  const suckersQuote: UseQueryReturnType<bigint | null> = useQuery({
    queryKey: [
      "suckersTokenRedemptionQuote",
      projectId.toString(),
      chainId?.toString(),
      version,
      tokenAmountWei.toString(),
      pairs.map((pair) => pair.peerChainId).join(","),
    ],
    enabled: Boolean(!isLoading && chainId),
    queryFn: async () => {
      if (!chainId) return null;

      // The indexed sucker group includes the project's own chain. If the group
      // can't be resolved, fall back to quoting the current chain alone.
      const members =
        pairs.length > 0
          ? pairs
          : [{ peerChainId: chainId as JBChainId, projectId }];

      const [totals, cashOutTaxRate] = await Promise.all([
        Promise.all(
          members.map(({ peerChainId, projectId }) =>
            getChainSurplusAndSupply(
              config,
              peerChainId as JBChainId,
              projectId,
              version,
            ),
          ),
        ),
        getCashOutTaxRate(config, chainId, projectId, version),
      ]);

      return getTokenCashOutQuoteEth(tokenAmountWei, {
        overflowWei: totals.reduce((acc, { surplus }) => acc + surplus, 0n),
        totalSupply: totals.reduce(
          (acc, { totalSupply }) => acc + totalSupply,
          0n,
        ),
        cashOutTaxRate,
        // `totalTokenSupplyWithReservedTokensOf` already includes pending
        // reserved tokens.
        tokensReserved: 0n,
      });
    },
  });

  // A missing quote means "unknown", not "worth 0": propagate undefined so
  // consumers can distinguish a failed or pending read from a zero value.
  const netTotal =
    suckersQuote.data != null
      ? applyJbDaoCashOutFee(suckersQuote.data)
      : undefined;

  return {
    data: netTotal,
    isLoading: suckersQuote.isLoading || isLoading,
    errors: [error, suckersQuote.error].filter(Boolean),
  };
}

async function getChainSurplusAndSupply(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  version: JBVersion,
) {
  const client = config.getClient({ chainId });

  const terminalStore = getContract({
    address: getProjectTerminalStore(chainId, version),
    abi: version === 6 ? jbTerminalStoreAbi : jbTerminalStoreV5Abi,
    client,
  });

  const [surplus, controller] = await Promise.all([
    terminalStore.read.currentTotalSurplusOf([
      projectId,
      BigInt(NATIVE_TOKEN_DECIMALS),
      BigInt(nativeCurrencyId(version)),
    ]),
    getControllerAddress(config, chainId, projectId, version),
  ]);

  const totalSupply = await getContract({
    address: controller,
    abi: controllerAbi(version),
    client,
  }).read.totalTokenSupplyWithReservedTokensOf([projectId]);

  return { surplus, totalSupply };
}

async function getCashOutTaxRate(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  version: JBVersion,
): Promise<number> {
  const controller = await getControllerAddress(
    config,
    chainId,
    projectId,
    version,
  );

  const [, metadata] = await getContract({
    address: controller,
    abi: controllerAbi(version),
    client: config.getClient({ chainId }),
  }).read.currentRulesetOf([projectId]);

  return Number(metadata.cashOutTaxRate);
}

async function getControllerAddress(
  config: ReturnType<typeof useConfig>,
  chainId: JBChainId,
  projectId: bigint,
  version: JBVersion,
) {
  return await getContract({
    address: getJBContractAddress(
      JBCoreContracts.JBDirectory,
      version,
      chainId,
    ),
    abi: jbDirectoryAbi,
    client: config.getClient({ chainId }),
  }).read.controllerOf([projectId]);
}
