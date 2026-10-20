import {
  encodeFunctionData,
  type Abi,
  type Address,
  type ContractFunctionName,
  type ContractFunctionParameters,
  type Hex,
} from "viem";
import {
  groupDeploymentCalls,
  isValidDeploymentCalls,
} from "./jbcenter/setupCalls.js";
import {
  JBCenterRpcClient,
  record,
  type JBCenterClientOptions,
  type JBCenterRequestOptions,
  type Validator,
} from "./jbcenter/rpcClient.js";

export type {
  JBCenterClientOptions,
  JBCenterRequestOptions,
  JBCenterRpcMethod,
  JBCenterRpcProvider,
  JBCenterRpcProviderOptions,
  JBCenterRpcRequest,
} from "./jbcenter/rpcClient.js";
export {
  JBCENTER_BLOCK_LAG_RETRY_DELAYS_MS,
  JBCENTER_DEFAULT_URL,
  JBCENTER_REQUEST_TIMEOUT_MS,
  JBCENTER_RPC_METHODS,
  JBCenterRequestError,
  JBCenterRpcClient,
  JBCenterRpcError,
  JBCenterTimeoutError,
  MAX_JBCENTER_RESPONSE_BYTES,
  createJBCenterRpcProvider,
} from "./jbcenter/rpcClient.js";

export const JBCENTER_DEPLOYMENT_TIMEOUT_MS = 45_000;
export const JBCENTER_PIN_TIMEOUT_MS = 300_000;

export type JBCenterJson =
  | null
  | boolean
  | number
  | string
  | JBCenterJson[]
  | JBCenterJsonObject;

export type JBCenterJsonObject = { [key: string]: JBCenterJson };

export type JBCenterDeploymentCall = {
  chainId: number;
  to: Address;
  data: Hex;
};

export type { JBCenterDecodedLaunch } from "./jbcenter/decode.js";
export { decodeDeploymentCall } from "./jbcenter/decode.js";

export type {
  JBCenterChainCalls,
  JBCenterDecodedCall,
} from "./jbcenter/setupCalls.js";
export { intentCalls } from "./jbcenter/setupCalls.js";

export type { JBCenterIntentRow } from "./jbcenter/merge.js";
export {
  deployedChains,
  intentPath,
  intentRow,
  isFullyDeployed,
  mergeSearch,
} from "./jbcenter/merge.js";

export type {
  EnsureDeployedOptions,
  EnsureDeployedStep,
} from "./jbcenter/ensureDeployed.js";
export {
  EnsureDeployedError,
  ensureDeployed,
} from "./jbcenter/ensureDeployed.js";

export type { PublishSignedIntentOptions } from "./jbcenter/publish.js";
export {
  JBCenterIntentMismatchError,
  publishSignedIntent,
} from "./jbcenter/publish.js";

export type {
  JBCenterRefusal,
  JBCenterRefusalCode,
} from "./jbcenter/refusal.js";
export { describeCenterRefusal } from "./jbcenter/refusal.js";

export type {
  ErrorChainLink,
  JBCenterLimiter,
  JBCenterLimiterOptions,
} from "./jbcenter/rateLimit.js";
export {
  JBCENTER_MAX_RATE_LIMIT_PAUSE_MS,
  createJBCenterLimiter,
  createPacedJBCenterLimiter,
  errorChain,
  isRateLimited,
  retryAfterOf,
} from "./jbcenter/rateLimit.js";

export type JBCenterContractCall<
  TAbi extends Abi = Abi,
  TFunctionName extends ContractFunctionName<
    TAbi,
    "payable" | "nonpayable"
  > = ContractFunctionName<TAbi, "payable" | "nonpayable">,
> = {
  chainId: number;
  address: Address;
} & ContractFunctionParameters<TAbi, "payable" | "nonpayable", TFunctionName>;

/** Freeze a typed viem contract request into the call signed by JB Center. */
export function createJBCenterDeploymentCall<
  const TAbi extends Abi,
  TFunctionName extends ContractFunctionName<TAbi, "payable" | "nonpayable">,
>(request: JBCenterContractCall<TAbi, TFunctionName>): JBCenterDeploymentCall {
  const { chainId, address, ...parameters } = request;
  return {
    chainId,
    to: address,
    data: encodeFunctionData(
      parameters as Parameters<typeof encodeFunctionData>[0],
    ),
  };
}

export type JBCenterIntentInput<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = {
  format: string;
  deploymentVersion: string;
  chainIds: number[];
  deploymentCalls: JBCenterDeploymentCall[];
  jb: TJb;
};

export type JBCenterIntentEnvelope<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = JBCenterIntentInput<TJb>;

export type JBCenterPreparedIntent<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = {
  contentHash: Hex;
  message: string;
  envelope: JBCenterIntentEnvelope<TJb>;
};

export type JBCenterPublishIntentInput<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = JBCenterIntentInput<TJb> & {
  publisher: Address;
  signature: Hex;
};

export type JBCenterIntentMetadata = {
  name: string;
  description: string | null;
  tagline: string | null;
  tags: string[];
  logoUri: string | null;
  owner: Address | null;
};

export type JBCenterDeployment = {
  chainId: number;
  projectId: string;
  transactionHash: Hex;
  createdAt: string;
  /**
   * Whether the launch reached the chain through JB Center's forwarder, so its
   * sender was Center's sponsor. Absent means a wallet sent it directly.
   */
  forwarded?: boolean;
};

export type JBCenterDeploymentInput = Omit<
  JBCenterDeployment,
  "createdAt" | "forwarded"
>;

/** One call a relay request asks the sender to make before the launch. */
export type JBCenterRelayCall = {
  to: Address;
  data: Hex;
  value: bigint;
};

/**
 * The forward request JB Center's sponsor signed for a chain it does not
 * sponsor. The forwarder reports the sponsor as the sender, so a chain
 * deployed this way keeps the token and sucker addresses every sponsored
 * chain in the intent gets; whoever sends it supplies only gas and the
 * creation fee. `setup` runs first, from the same wallet, in order.
 */
export type JBCenterRelayRequest = {
  chainId: number;
  to: Address;
  data: Hex;
  /** Wei the forwarder requires with the call: the chain's creation fee. */
  value: bigint;
  gas: bigint;
  /** Unix seconds after which the forwarder refuses the request. */
  deadline: number;
  setup: JBCenterRelayCall[];
};

export type JBCenterIntentDeploy = {
  chainId: number;
  status: "queued" | "sent" | "confirmed" | "failed";
  transactionHash: Hex | null;
  bundleUuid: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JBCenterIntent<
  TJb extends JBCenterJsonObject = JBCenterJsonObject,
> = JBCenterIntentMetadata & {
  id: string;
  status: "undeployed" | "deployed";
  contentHash: Hex;
  envelope: JBCenterIntentEnvelope<TJb>;
  publisher: Address;
  signature: Hex;
  createdAt: string;
  deployments: JBCenterDeployment[];
  deploys: JBCenterIntentDeploy[];
};

export const JBCENTER_SPONSORED_CHAIN_IDS = Object.freeze([
  10, 8453, 42161, 11155111, 11155420, 84532, 421614,
]);

/** The chains in the list JB Center's sponsor covers, in the order given. */
export function sponsorableChains(chainIds: readonly number[]): number[] {
  return chainIds.filter((id) => JBCENTER_SPONSORED_CHAIN_IDS.includes(id));
}

/** The chains in the list JB Center's sponsor does not cover. */
export function unsponsoredChains(chainIds: readonly number[]): number[] {
  return chainIds.filter((id) => !JBCENTER_SPONSORED_CHAIN_IDS.includes(id));
}

/** Whether JB Center's sponsor covers every chain in a non-empty list. */
export function isSponsorable(chainIds: readonly number[]): boolean {
  return chainIds.length > 0 && unsponsoredChains(chainIds).length === 0;
}

export type JBCenterSearchItem = JBCenterIntentMetadata & {
  source: "jbcenter";
  status: "undeployed";
  intentId: string;
  contentHash: Hex;
  format: string;
  deploymentVersion: string;
  chainIds: number[];
  publisher: Address;
  createdAt: string;
};

export type JBCenterSearchPage = {
  items: JBCenterSearchItem[];
  totalCount: number;
  nextCursor: string | null;
};

export type JBCenterSearchParams = {
  query?: string;
  limit?: number;
  cursor?: string;
  /** The intent's `jb.owner`, matched without regard to checksum casing. */
  owner?: Address;
  /** The address that signed the intent, matched the same way. */
  publisher?: Address;
};

export type JBCenterPin = {
  cid: string;
  status: "queued";
  uri: `ipfs://${string}`;
  gatewayUrl: string;
};

function isHash(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[0-9a-f]{64}$/iu.test(value);
}

function isSignature(value: unknown): value is Hex {
  return (
    typeof value === "string" &&
    /^0x(?:[0-9a-f]{128}|[0-9a-f]{130})$/iu.test(value)
  );
}

function isAddress(value: unknown): value is Address {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/iu.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => Number.isSafeInteger(item) && Number(item) > 0)
  );
}

function isCalldata(value: unknown): value is Hex {
  return typeof value === "string" && /^0x(?:[0-9a-f]{2}){4,}$/iu.test(value);
}

function isDecimalString(value: unknown): value is string {
  return typeof value === "string" && /^(?:0|[1-9][0-9]*)$/u.test(value);
}

function isDeploymentCall(value: unknown): value is JBCenterDeploymentCall {
  return (
    record(value) &&
    Number.isSafeInteger(value.chainId) &&
    Number(value.chainId) > 0 &&
    isAddress(value.to) &&
    isCalldata(value.data)
  );
}

type RelayCallJson = { to: Address; data: Hex; value: string };

type RelayRequestJson = Omit<
  JBCenterRelayRequest,
  "value" | "gas" | "setup"
> & {
  value: string;
  gas: string;
  setup: RelayCallJson[];
};

/** Setup calls carry no value of their own; only the forwarder call does. */
function isRelayCall(value: unknown): value is RelayCallJson {
  return (
    record(value) &&
    isAddress(value.to) &&
    isCalldata(value.data) &&
    value.value === "0"
  );
}

/** Wei and gas cross the wire as decimal strings, so no precision is lost. */
function relayRequest(chainId: number): Validator<RelayRequestJson> {
  return (value: unknown): value is RelayRequestJson =>
    record(value) &&
    value.chainId === chainId &&
    isAddress(value.to) &&
    isCalldata(value.data) &&
    isDecimalString(value.value) &&
    isDecimalString(value.gas) &&
    value.gas !== "0" &&
    Number.isSafeInteger(value.deadline) &&
    Number(value.deadline) > 0 &&
    Array.isArray(value.setup) &&
    value.setup.every(isRelayCall);
}

function isEnvelope(value: unknown): value is JBCenterIntentEnvelope {
  if (
    !record(value) ||
    typeof value.format !== "string" ||
    typeof value.deploymentVersion !== "string" ||
    !isNumberArray(value.chainIds) ||
    value.chainIds.length === 0 ||
    new Set(value.chainIds).size !== value.chainIds.length ||
    !record(value.jb)
  ) {
    return false;
  }
  if (
    !Array.isArray(value.deploymentCalls) ||
    !value.deploymentCalls.every(isDeploymentCall)
  ) {
    return false;
  }
  const calls: JBCenterDeploymentCall[] = value.deploymentCalls;
  if (!isValidDeploymentCalls(calls)) return false;
  const chains = [...value.chainIds].sort((a, b) => a - b);
  const callChains = [...groupDeploymentCalls(calls).keys()].sort(
    (a, b) => a - b,
  );
  return (
    callChains.length === chains.length &&
    chains.every((chainId, index) => callChains[index] === chainId)
  );
}

function isMetadata(value: Record<string, unknown>): boolean {
  return (
    typeof value.name === "string" &&
    (value.description === null || typeof value.description === "string") &&
    (value.tagline === null || typeof value.tagline === "string") &&
    isStringArray(value.tags) &&
    (value.logoUri === null || typeof value.logoUri === "string") &&
    (value.owner === null || isAddress(value.owner))
  );
}

function isDeployment(value: unknown): value is JBCenterDeployment {
  return (
    record(value) &&
    Number.isSafeInteger(value.chainId) &&
    Number(value.chainId) > 0 &&
    typeof value.projectId === "string" &&
    /^[0-9]+$/u.test(value.projectId) &&
    isHash(value.transactionHash) &&
    typeof value.createdAt === "string" &&
    (value.forwarded === undefined || typeof value.forwarded === "boolean")
  );
}

const JBCENTER_DEPLOY_STATUSES = [
  "queued",
  "sent",
  "confirmed",
  "failed",
] as const;

function isIntentDeploy(value: unknown): value is JBCenterIntentDeploy {
  return (
    record(value) &&
    Number.isSafeInteger(value.chainId) &&
    Number(value.chainId) > 0 &&
    typeof value.status === "string" &&
    (JBCENTER_DEPLOY_STATUSES as readonly string[]).includes(value.status) &&
    (value.transactionHash === null || isHash(value.transactionHash)) &&
    (value.bundleUuid === null || typeof value.bundleUuid === "string") &&
    (value.error === null || typeof value.error === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isDeployResponse(
  value: unknown,
): value is { deploys: JBCenterIntentDeploy[] } {
  return (
    record(value) &&
    Array.isArray(value.deploys) &&
    value.deploys.every(isIntentDeploy)
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
      value,
    )
  );
}

function isIntent(value: unknown): value is JBCenterIntent {
  return (
    record(value) &&
    isMetadata(value) &&
    isUuid(value.id) &&
    (value.status === "undeployed" || value.status === "deployed") &&
    isHash(value.contentHash) &&
    isEnvelope(value.envelope) &&
    isAddress(value.publisher) &&
    isSignature(value.signature) &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.deployments) &&
    value.deployments.every(isDeployment) &&
    Array.isArray(value.deploys) &&
    value.deploys.every(isIntentDeploy)
  );
}

function isPreparedIntent(value: unknown): value is JBCenterPreparedIntent {
  return (
    record(value) &&
    isHash(value.contentHash) &&
    typeof value.message === "string" &&
    isEnvelope(value.envelope)
  );
}

function isSearchItem(value: unknown): value is JBCenterSearchItem {
  return (
    record(value) &&
    isMetadata(value) &&
    value.source === "jbcenter" &&
    value.status === "undeployed" &&
    typeof value.intentId === "string" &&
    isHash(value.contentHash) &&
    typeof value.format === "string" &&
    typeof value.deploymentVersion === "string" &&
    isNumberArray(value.chainIds) &&
    isAddress(value.publisher) &&
    typeof value.createdAt === "string"
  );
}

function isSearchPage(value: unknown): value is JBCenterSearchPage {
  return (
    record(value) &&
    Array.isArray(value.items) &&
    value.items.every(isSearchItem) &&
    Number.isSafeInteger(value.totalCount) &&
    Number(value.totalCount) >= 0 &&
    (value.nextCursor === null || typeof value.nextCursor === "string")
  );
}

function isPin(value: unknown): value is JBCenterPin {
  return (
    record(value) &&
    typeof value.cid === "string" &&
    /^(?:Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,160})$/u.test(value.cid) &&
    value.status === "queued" &&
    typeof value.uri === "string" &&
    value.uri === `ipfs://${value.cid}` &&
    value.gatewayUrl === `/ipfs/${value.cid}`
  );
}

function filenameOf(content: Blob, fallback: string): string {
  const candidate = (content as Blob & { name?: unknown }).name;
  return typeof candidate === "string" && candidate ? candidate : fallback;
}

export class JBCenterClient extends JBCenterRpcClient {
  prepareIntent<TJb extends JBCenterJsonObject>(
    intent: JBCenterIntentInput<TJb>,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterPreparedIntent<TJb>> {
    return this.fetchJson(
      "v1/intents/message",
      { method: "POST", body: JSON.stringify(intent) },
      isPreparedIntent,
      options,
    ) as Promise<JBCenterPreparedIntent<TJb>>;
  }

  publishIntent<TJb extends JBCenterJsonObject>(
    intent: JBCenterPublishIntentInput<TJb>,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterIntent<TJb>> {
    return this.fetchJson(
      "v1/intents",
      { method: "POST", body: JSON.stringify(intent) },
      isIntent,
      options,
    ) as Promise<JBCenterIntent<TJb>>;
  }

  getIntent<TJb extends JBCenterJsonObject = JBCenterJsonObject>(
    intentId: string,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterIntent<TJb>> {
    return this.fetchJson(
      `v1/intents/${encodeURIComponent(intentId)}`,
      {},
      isIntent,
      options,
    ) as Promise<JBCenterIntent<TJb>>;
  }

  searchIntents(
    params: JBCenterSearchParams = {},
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterSearchPage> {
    const query = new URLSearchParams();
    if (params.query !== undefined) query.set("q", params.query);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.cursor !== undefined) query.set("cursor", params.cursor);
    if (params.owner !== undefined) query.set("owner", params.owner);
    if (params.publisher !== undefined)
      query.set("publisher", params.publisher);
    const suffix = query.size ? `?${query}` : "";
    return this.fetchJson(`v1/search${suffix}`, {}, isSearchPage, options);
  }

  recordDeployment(
    intentId: string,
    deployment: JBCenterDeploymentInput,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterDeployment> {
    return this.fetchJson(
      `v1/intents/${encodeURIComponent(intentId)}/deployments`,
      { method: "POST", body: JSON.stringify(deployment) },
      isDeployment,
      {
        ...options,
        timeoutMs: options?.timeoutMs ?? JBCENTER_DEPLOYMENT_TIMEOUT_MS,
      },
    );
  }

  /**
   * Asks JB Center's sponsor to deploy the intent. `chainIds` narrows the
   * request to those chains; omitted or empty, it means every sponsored chain
   * that has no deployment yet. Chains already queued or sent come back as
   * they are.
   */
  requestDeploy(
    intentId: string,
    options?: JBCenterRequestOptions & { chainIds?: readonly number[] },
  ): Promise<{ deploys: JBCenterIntentDeploy[] }> {
    return this.fetchJson(
      `v1/intents/${encodeURIComponent(intentId)}/deploy`,
      options?.chainIds?.length
        ? {
            method: "POST",
            body: JSON.stringify({ chainIds: options.chainIds }),
          }
        : { method: "POST" },
      isDeployResponse,
      options,
    );
  }

  /**
   * The forward request JB Center's sponsor signed for one chain it does not
   * sponsor. Nothing is stored and nothing is paid until someone sends it.
   * Two callers who ask for the same chain get the same forwarder nonce, so
   * the second transaction reverts and the caller asks again.
   */
  async requestRelay(
    intentId: string,
    chainId: number,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterRelayRequest> {
    if (!Number.isSafeInteger(chainId) || chainId <= 0) {
      throw new TypeError("chainId must be a positive safe integer");
    }
    const body = await this.fetchJson(
      `v1/intents/${encodeURIComponent(intentId)}/relay`,
      { method: "POST", body: JSON.stringify({ chainId }) },
      relayRequest(chainId),
      options,
    );
    return {
      chainId: body.chainId,
      to: body.to,
      data: body.data,
      value: BigInt(body.value),
      gas: BigInt(body.gas),
      deadline: body.deadline,
      setup: body.setup.map((call) => ({
        to: call.to,
        data: call.data,
        value: BigInt(call.value),
      })),
    };
  }

  pinJson(
    value: JBCenterJsonObject,
    options?: JBCenterRequestOptions,
  ): Promise<JBCenterPin> {
    return this.fetchJson(
      "v1/pins/json",
      { method: "POST", body: JSON.stringify(value) },
      isPin,
      { ...options, timeoutMs: options?.timeoutMs ?? JBCENTER_PIN_TIMEOUT_MS },
    );
  }

  pinImage(
    content: Blob,
    options?: JBCenterRequestOptions & { filename?: string },
  ): Promise<JBCenterPin> {
    return this.pinFile("v1/pins/file", content, "image", options);
  }

  pinMedia(
    content: Blob,
    options?: JBCenterRequestOptions & { filename?: string },
  ): Promise<JBCenterPin> {
    return this.pinFile("v1/pins/media", content, "media", options);
  }

  private pinFile(
    path: string,
    content: Blob,
    fallbackName: string,
    options?: JBCenterRequestOptions & { filename?: string },
  ): Promise<JBCenterPin> {
    const body = new FormData();
    body.append(
      "file",
      content,
      options?.filename ?? filenameOf(content, fallbackName),
    );
    return this.fetchJson(path, { method: "POST", body }, isPin, {
      ...options,
      timeoutMs: options?.timeoutMs ?? JBCENTER_PIN_TIMEOUT_MS,
    });
  }
}

export function createJBCenterClient(
  options: JBCenterClientOptions = {},
): JBCenterClient {
  return new JBCenterClient(options);
}
