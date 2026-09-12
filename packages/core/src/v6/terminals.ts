import { Address, PublicClient, zeroAddress } from "viem";
import {
  jbContractAddress,
  jbContractAddressHistory,
  jbDirectoryAbi,
  jbMultiTerminalAbi,
  jbRouterTerminalGatewayAbi,
  jbRouterTerminalRegistryAbi,
} from "../generated/juicebox.js";
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
 * The registry-selected route for a project. `direct` identifies a known router
 * from current or historical deployment records; `unknown` preserves an
 * unrecognized terminal without assuming it implements the router or gateway.
 */
export type ResolvedRouterPath = { registry: Address } & (
  | {
      status: "unresolved";
      terminal: null;
      gateway: null;
      router: null;
    }
  | {
      status: "direct";
      terminal: Address;
      gateway: null;
      router: Address;
    }
  | {
      status: "gateway";
      terminal: Address;
      gateway: Address;
      router: Address;
    }
  | {
      status: "unknown";
      terminal: Address;
      gateway: null;
      router: null;
    }
);

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
 * Resolve a project's effective registry -> terminal -> router path.
 *
 * Reads `JBRouterTerminalRegistry.terminalOf(projectId)` so pinned terminals and
 * cohort defaults are respected. A zero terminal returns `unresolved`. Only a
 * gateway recorded as deployed on this chain is unwrapped via its `ROUTER()`
 * getter. Current and retired router deployments resolve as `direct`; any other
 * terminal returns `unknown`. RPC failures propagate to the caller.
 *
 * This describes the registry route, not the token-specific primary terminal
 * returned by {@link resolvePaymentTerminal}, and does not prove routability.
 * Keep payments addressed to the terminal selected by that payment helper;
 * calling the underlying router directly bypasses gateway custody semantics.
 *
 * The gateway can retain eligible failed source-project-opted calls, including
 * protocol fees, as pending calls in the original input token. A queued call is
 * not a settled payment: track gateway queue/process/refund events and pending
 * commitments through retry or refund. Calls without retention eligibility
 * still revert synchronously.
 */
export async function resolveRouterPath(
  client: PublicClient,
  {
    chainId,
    projectId,
  }: {
    chainId: JBChainId;
    projectId: bigint;
  },
): Promise<ResolvedRouterPath> {
  const registry = v6Address("JBRouterTerminalRegistry", chainId);
  const terminal = await client.readContract({
    address: registry,
    abi: jbRouterTerminalRegistryAbi,
    functionName: "terminalOf",
    args: [projectId],
  });

  if (terminal === zeroAddress) {
    return {
      status: "unresolved",
      registry,
      terminal: null,
      gateway: null,
      router: null,
    };
  }

  const deployedGateway = (
    jbContractAddress["6"].JBRouterTerminalGateway as Partial<
      Record<JBChainId, Address>
    >
  )[chainId];
  if (deployedGateway?.toLowerCase() === terminal.toLowerCase()) {
    const router = await client.readContract({
      address: terminal,
      abi: jbRouterTerminalGatewayAbi,
      functionName: "ROUTER",
    });

    return {
      status: "gateway",
      registry,
      terminal,
      gateway: terminal,
      router,
    };
  }

  const routerDeployments: Partial<Record<JBChainId, Address>>[] = [
    jbContractAddress["6"].JBRouterTerminal,
    ...Object.values(jbContractAddressHistory["6"].JBRouterTerminal),
  ];
  const isKnownRouter = routerDeployments.some(
    (addresses) => addresses[chainId]?.toLowerCase() === terminal.toLowerCase(),
  );

  if (isKnownRouter) {
    return {
      status: "direct",
      registry,
      terminal,
      gateway: null,
      router: terminal,
    };
  }

  return {
    status: "unknown",
    registry,
    terminal,
    gateway: null,
    router: null,
  };
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
