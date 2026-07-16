import {
  Address,
  Hex,
  PublicClient,
  bytesToHex,
  encodeAbiParameters,
  keccak256,
  toBytes,
} from "viem";
import { DEFAULT_ALLOW_OVERSPENDING, NATIVE_TOKEN } from "../constants.js";
import { jbMultiTerminalAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { createHookMetadata } from "../utils/hook.js";

/**
 * A prepared `pay` transaction request, accepted as-is by viem's
 * `walletClient.writeContract` and wagmi's `writeContract`.
 */
export interface V6PayTxRequest {
  chainId: JBChainId;
  address: Address;
  abi: typeof jbMultiTerminalAbi;
  functionName: "pay";
  args: readonly [bigint, Address, bigint, Address, bigint, string, Hex];
  value: bigint;
}

/**
 * Build a `pay(projectId, token, amount, beneficiary, minReturnedTokens, memo,
 * metadata)` transaction request for a v6 terminal.
 *
 * When `token` is the native token, `value` is set to `amount` (the terminal reads the
 * paid amount from `msg.value`); for ERC-20 payments `value` is 0 and the terminal must
 * be approved to pull `amount` beforehand.
 *
 * @param args.chainId The chain to pay on.
 * @param args.terminal The terminal to pay (resolve with `resolvePaymentTerminal`).
 * @param args.projectId The project's id.
 * @param args.token The token being paid.
 * @param args.amount The amount being paid, as a fixed point number with the token's
 * decimals.
 * @param args.beneficiary The address that receives the minted project tokens.
 * @param args.minReturnedTokens The minimum project token count the beneficiary must
 * receive, else the transaction reverts. Defaults to 0.
 * @param args.memo A memo included in the Pay event. Defaults to "".
 * @param args.metadata Hook metadata (e.g. from {@link build721PayMetadata}). Defaults
 * to "0x".
 * @returns The transaction request.
 */
export function buildPayTx({
  chainId,
  terminal,
  projectId,
  token,
  amount,
  beneficiary,
  minReturnedTokens = 0n,
  memo = "",
  metadata = "0x",
}: {
  chainId: JBChainId;
  terminal: Address;
  projectId: bigint;
  token: Address;
  amount: bigint;
  beneficiary: Address;
  minReturnedTokens?: bigint;
  memo?: string;
  metadata?: Hex;
}): V6PayTxRequest {
  const isNative = token.toLowerCase() === NATIVE_TOKEN.toLowerCase();

  return {
    chainId,
    address: terminal,
    abi: jbMultiTerminalAbi,
    functionName: "pay",
    args: [
      projectId,
      token,
      amount,
      beneficiary,
      minReturnedTokens,
      memo,
      metadata,
    ],
    value: isNative ? amount : 0n,
  };
}

/**
 * The result of previewing a payment.
 */
export interface PayPreview {
  /**
   * The project token count the beneficiary would receive.
   */
  beneficiaryTokenCount: bigint;
  /**
   * The project token count that would be reserved for the project's reserved splits.
   */
  reservedTokenCount: bigint;
}

/**
 * Preview the project tokens minted by a payment, via the terminal's
 * `previewPayFor(projectId, token, amount, beneficiary, metadata)`.
 *
 * The terminal's `previewPayFor` is used (rather than
 * `JBTerminalStore.previewPayFrom`) because it takes exactly the data a `pay` caller
 * already has — the store variant additionally requires a full `JBTokenAmount` tuple
 * (token, decimals, currency, value), forcing an extra accounting-context lookup.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to preview on.
 * @param args.terminal The terminal that would be paid.
 * @param args.projectId The project's id.
 * @param args.token The token being paid.
 * @param args.amount The amount being paid, as a fixed point number with the token's
 * decimals.
 * @param args.beneficiary The address that would receive the minted project tokens.
 * @param args.metadata Hook metadata. Defaults to "0x".
 * @returns The previewed token counts.
 */
export async function previewPay(
  client: PublicClient,
  {
    terminal,
    projectId,
    token,
    amount,
    beneficiary,
    metadata = "0x",
  }: {
    chainId: JBChainId;
    terminal: Address;
    projectId: bigint;
    token: Address;
    amount: bigint;
    beneficiary: Address;
    metadata?: Hex;
  },
): Promise<PayPreview> {
  const [, beneficiaryTokenCount, reservedTokenCount] =
    await client.readContract({
      address: terminal,
      abi: jbMultiTerminalAbi,
      functionName: "previewPayFor",
      args: [projectId, token, amount, beneficiary, metadata],
    });

  return { beneficiaryTokenCount, reservedTokenCount };
}

/**
 * The metadata id a JB721 hook looks up in pay metadata:
 * `bytes4(bytes20(target) ^ bytes20(keccak256("pay")))`, where the target is the hook's
 * own address (`JB721Hook.METADATA_ID_TARGET` is `address(this)`).
 *
 * @link https://github.com/Bananapus/nana-core-v6/blob/main/src/libraries/JBMetadataResolver.sol (`getId`)
 */
function pay721MetadataId(hookAddress: Address): Hex {
  const targetBytes = toBytes(hookAddress).slice(0, 20);
  const purposeBytes = toBytes(keccak256(toBytes("pay"))).slice(0, 20);

  const xorResult = targetBytes.map((byte, i) => byte ^ purposeBytes[i]);

  return bytesToHex(xorResult.slice(0, 4));
}

/**
 * Build pay metadata instructing a project's JB721 tiers hook to mint specific tiers.
 *
 * The tier payload is `abi.encode(bool allowOverspending, uint16[] tierIdsToMint)`,
 * keyed by the hook's metadata id (`bytes4(bytes20(hookAddress) ^
 * bytes20(keccak256("pay")))`) and packed into the JBMetadataResolver
 * word-offset-table format.
 *
 * @param args.hookAddress The project's JB721 tiers hook (the ruleset's data hook).
 * @param args.tierIdsToMint The tier ids to mint, one entry per NFT.
 * @param args.allowOverspending Whether payment beyond the tiers' total price is
 * allowed (excess mints no NFT). Defaults to true.
 * @returns The metadata to pass as `pay`'s `metadata` argument.
 */
export function build721PayMetadata({
  hookAddress,
  tierIdsToMint,
  allowOverspending = DEFAULT_ALLOW_OVERSPENDING,
}: {
  hookAddress: Address;
  tierIdsToMint: bigint[];
  allowOverspending?: boolean;
}): Hex {
  const tierPayload = encodeAbiParameters(
    [{ type: "bool" }, { type: "uint16[]" }],
    [allowOverspending, tierIdsToMint.map(Number)],
  );

  return createHookMetadata(
    [pay721MetadataId(hookAddress)],
    [tierPayload],
  ) as Hex;
}
