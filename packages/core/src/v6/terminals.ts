import { Address, PublicClient, zeroAddress } from "viem";
import { jbDirectoryAbi, jbMultiTerminalAbi } from "../generated/juicebox.js";
import { JBChainId } from "../types.js";
import { v6Address } from "./types.js";

/**
 * A payment terminal resolved for a `(projectId, token)` pair.
 */
export interface ResolvedPaymentTerminal {
  /**
   * The terminal address payments for the token should be sent to.
   */
  address: Address;
  /**
   * True when the project has no primary terminal for the token and the
   * JBRouterTerminalRegistry (which exposes the same `pay` signature) is used
   * instead.
   *
   * The registry is NOT a universal terminal: it forwards to a per-project
   * resolved terminal and reverts `JBRouterTerminalRegistry_TerminalNotSet`
   * when none resolves — the cold-start case, where a project has no pinned
   * terminal and has not reached the default-terminal threshold. So `isRouter`
   * means "the router is where the payment would go", not "this token is
   * payable". Probe routability with `previewPayFor` before offering the
   * route: a `previewPayFor` call against the resolved address reverts for a
   * cold-start project and succeeds otherwise.
   */
  isRouter: boolean;
}

/**
 * A v6 terminal accounting context.
 */
export interface JBAccountingContext {
  /**
   * The token the context applies to.
   */
  token: Address;
  /**
   * The token's number of decimals.
   */
  decimals: number;
  /**
   * The token's accounting-context currency: `uint32(uint160(token))`.
   */
  currency: number;
}

/**
 * Resolve the terminal to pay a project's `token` payments to.
 *
 * Reads `JBDirectory.primaryTerminalOf(projectId, token)`. When the project has no
 * primary terminal for the token (zero address), falls back to the
 * JBRouterTerminalRegistry, which exposes the same `pay` signature.
 *
 * The registry is a FORWARDER, not a universal terminal: it resolves a
 * per-project terminal (the project's pinned one, else the threshold-resolved
 * default) and reverts `JBRouterTerminalRegistry_TerminalNotSet` when neither
 * exists (`JBRouterTerminalRegistry.sol:429-432`, reached from both `pay` and
 * `previewPayFor`). Its view surface is deliberately softer — an unresolved
 * `accountingContextForTokenOf` returns an EMPTY context rather than reverting
 * (`:182-186`) — so an empty context is not proof the token is unsupported.
 *
 * A returned `isRouter: true` therefore does not mean the token is payable.
 * Probe routability with {@link previewPay} against the returned address: it
 * reverts for a cold-start project and returns a preview otherwise.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to resolve on.
 * @param args.projectId The project's id.
 * @param args.token The token being paid.
 * @returns The terminal address and whether it's the router registry fallback.
 */
export async function resolvePaymentTerminal(
  client: PublicClient,
  {
    chainId,
    projectId,
    token,
  }: {
    chainId: JBChainId;
    projectId: bigint;
    token: Address;
  },
): Promise<ResolvedPaymentTerminal> {
  const primaryTerminal = await client.readContract({
    address: v6Address("JBDirectory", chainId),
    abi: jbDirectoryAbi,
    functionName: "primaryTerminalOf",
    args: [projectId, token],
  });

  if (primaryTerminal === zeroAddress) {
    return {
      address: v6Address("JBRouterTerminalRegistry", chainId),
      isRouter: true,
    };
  }

  return { address: primaryTerminal, isRouter: false };
}

/**
 * Read the accounting contexts (accepted tokens with their decimals and currencies)
 * registered for a project on the JBMultiTerminal.
 *
 * @param client A viem public client on the given chain.
 * @param args.chainId The chain to read from.
 * @param args.projectId The project's id.
 * @returns The project's accounting contexts.
 */
export async function getAccountingContexts(
  client: PublicClient,
  {
    chainId,
    projectId,
  }: {
    chainId: JBChainId;
    projectId: bigint;
  },
): Promise<readonly JBAccountingContext[]> {
  return client.readContract({
    address: v6Address("JBMultiTerminal", chainId),
    abi: jbMultiTerminalAbi,
    functionName: "accountingContextsOf",
    args: [projectId],
  });
}
