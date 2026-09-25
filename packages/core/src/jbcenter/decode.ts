import {
  decodeFunctionData,
  encodeFunctionData,
  isAddressEqual,
  slice,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import {
  jb721TiersHookProjectDeployerAbi,
  jbControllerAbi,
  jbOmnichainDeployerAbi,
  revDeployerAbi,
} from "../generated/juicebox.js";
import type { JBChainId } from "../types.js";
import type { JBTerminalConfig } from "../v6/launch.js";
import type { REVConfig } from "../v6/revnets.js";
import type { JBRulesetConfig } from "../v6/rulesets.js";
import type { JBAccountingContext } from "../v6/terminals.js";
import { v6Address, type V6Contract } from "../v6/types.js";
import type { JBCenterDeploymentCall } from "../jbcenter.js";
import {
  SAFE_CREATE_ABI,
  SAFE_FACTORY,
  SAFE_FALLBACK,
  SAFE_PROXY_CREATION_CODE,
  SAFE_SINGLETON,
  buildSafeInitializer,
  predictSafeAddress,
} from "../safe.js";

export type JBCenterDecodedLaunch =
  | {
      flavor: "project";
      owner: Address;
      projectUri: string;
      rulesetConfigurations: readonly JBRulesetConfig[];
      terminalConfigurations: readonly JBTerminalConfig[];
      memo: string;
    }
  | {
      flavor: "project-721";
      owner: Address;
      projectUri: string;
      rulesetConfigurations: readonly JBRulesetConfig[];
      terminalConfigurations: readonly JBTerminalConfig[];
      memo: string;
      salt: Hex;
    }
  | {
      flavor: "omnichain";
      owner: Address;
      projectUri: string;
      rulesetConfigurations: readonly JBRulesetConfig[];
      terminalConfigurations: readonly JBTerminalConfig[];
      memo: string;
      has721: boolean;
    }
  | {
      flavor: "revnet";
      operator: Address;
      projectUri: string;
      stages: REVConfig["stageConfigurations"];
      description: REVConfig["description"];
      accountingContexts: readonly JBAccountingContext[];
    }
  | {
      flavor: "safe-create";
      to: Address;
      singleton: Address;
      saltNonce: Hex;
      owners: readonly Address[];
      threshold: number;
      fallbackHandler: Address;
      address: Address;
    }
  | { flavor: "unknown"; to: Address; selector: Hex };

/** The address of `contract` on `chainId`, or null when it isn't deployed there. */
function addressFor(contract: V6Contract, chainId: number): Address | null {
  try {
    return v6Address(contract, chainId as JBChainId);
  } catch {
    return null;
  }
}

function decodeProjectLaunch(
  call: JBCenterDeploymentCall,
): JBCenterDecodedLaunch | null {
  try {
    const address = addressFor("JBController", call.chainId);
    if (!address || !isAddressEqual(address, call.to)) return null;
    const decoded = decodeFunctionData({
      abi: jbControllerAbi,
      data: call.data,
    });
    if (decoded.functionName !== "launchProjectFor") return null;
    const [
      owner,
      projectUri,
      rulesetConfigurations,
      terminalConfigurations,
      memo,
    ] = decoded.args;
    return {
      flavor: "project",
      owner,
      projectUri,
      rulesetConfigurations,
      terminalConfigurations,
      memo,
    };
  } catch {
    return null;
  }
}

function decodeProject721Launch(
  call: JBCenterDeploymentCall,
): JBCenterDecodedLaunch | null {
  try {
    const address = addressFor("JB721TiersHookProjectDeployer", call.chainId);
    if (!address || !isAddressEqual(address, call.to)) return null;
    const decoded = decodeFunctionData({
      abi: jb721TiersHookProjectDeployerAbi,
      data: call.data,
    });
    if (decoded.functionName !== "launchProjectFor") return null;
    const [owner, , launchProjectConfig, , salt] = decoded.args;
    return {
      flavor: "project-721",
      owner,
      projectUri: launchProjectConfig.projectUri,
      // This deployer's ruleset metadata always turns the pay data hook on and
      // points it at the hook it deploys, so `dataHook`/`useDataHookForPay`
      // aren't inputs here — they read as `undefined` on this flavor's shell.
      rulesetConfigurations:
        launchProjectConfig.rulesetConfigurations as unknown as readonly JBRulesetConfig[],
      terminalConfigurations: launchProjectConfig.terminalConfigurations,
      memo: launchProjectConfig.memo,
      salt,
    };
  } catch {
    return null;
  }
}

function decodeOmnichainLaunch(
  call: JBCenterDeploymentCall,
): JBCenterDecodedLaunch | null {
  try {
    const address = addressFor("JBOmnichainDeployer", call.chainId);
    if (!address || !isAddressEqual(address, call.to)) return null;
    const decoded = decodeFunctionData({
      abi: jbOmnichainDeployerAbi,
      data: call.data,
    });
    if (decoded.functionName !== "launchProjectFor") return null;
    const args = decoded.args;
    if (args.length === 7) {
      const [
        owner,
        projectUri,
        ,
        rulesetConfigurations,
        terminalConfigurations,
        memo,
      ] = args;
      return {
        flavor: "omnichain",
        owner,
        projectUri,
        rulesetConfigurations,
        terminalConfigurations,
        memo,
        has721: true,
      };
    }
    const [
      owner,
      projectUri,
      rulesetConfigurations,
      terminalConfigurations,
      memo,
    ] = args;
    return {
      flavor: "omnichain",
      owner,
      projectUri,
      rulesetConfigurations,
      terminalConfigurations,
      memo,
      has721: false,
    };
  } catch {
    return null;
  }
}

function decodeRevnetDeploy(
  call: JBCenterDeploymentCall,
): JBCenterDecodedLaunch | null {
  try {
    const address = addressFor("REVDeployer", call.chainId);
    if (!address || !isAddressEqual(address, call.to)) return null;
    const decoded = decodeFunctionData({
      abi: revDeployerAbi,
      data: call.data,
    });
    if (decoded.functionName !== "deployFor") return null;
    const [, config, accountingContexts] = decoded.args;
    return {
      flavor: "revnet",
      operator: config.operator,
      projectUri: config.description.uri,
      stages: config.stageConfigurations,
      description: config.description,
      accountingContexts,
    };
  } catch {
    return null;
  }
}

/** JB Center's ceiling on the owners one intent's Safe may carry. */
const MAX_INTENT_SAFE_OWNERS = 20;

/**
 * A setup call: `createProxyWithNonce` to the canonical Safe factory, for the
 * canonical singleton and fallback handler, with no delegatecall hook and no
 * setup payment. The address is the one the factory would compute, derived
 * from the pinned proxy creation code, so nothing here reaches a chain.
 */
function decodeSafeCreate(
  call: JBCenterDeploymentCall,
): JBCenterDecodedLaunch | null {
  try {
    if (!isAddressEqual(SAFE_FACTORY, call.to)) return null;
    const create = decodeFunctionData({
      abi: SAFE_CREATE_ABI,
      data: call.data,
    });
    if (create.functionName !== "createProxyWithNonce") return null;
    const [singleton, initializer, nonce] = create.args;
    if (!isAddressEqual(singleton, SAFE_SINGLETON)) return null;
    const setup = decodeFunctionData({
      abi: SAFE_CREATE_ABI,
      data: initializer,
    });
    if (setup.functionName !== "setup") return null;
    const [
      owners,
      threshold,
      to,
      data,
      fallbackHandler,
      paymentToken,
      payment,
      paymentReceiver,
    ] = setup.args;
    if (
      owners.length < 1 ||
      owners.length > MAX_INTENT_SAFE_OWNERS ||
      owners.some((owner) => BigInt(owner) === 0n) ||
      new Set(owners.map((owner) => owner.toLowerCase())).size !==
        owners.length ||
      threshold < 1n ||
      threshold > BigInt(owners.length) ||
      !isAddressEqual(to, zeroAddress) ||
      data !== "0x" ||
      !isAddressEqual(fallbackHandler, SAFE_FALLBACK) ||
      !isAddressEqual(paymentToken, zeroAddress) ||
      payment !== 0n ||
      !isAddressEqual(paymentReceiver, zeroAddress)
    ) {
      return null;
    }
    const plan = {
      owners: [...owners],
      threshold: Number(threshold),
      saltNonce: toHex(nonce, { size: 32 }),
      proxyCreationCode: SAFE_PROXY_CREATION_CODE,
    };
    // Only the canonical encoding predicts the address the factory computes,
    // so the call has to be exactly what this plan re-encodes to. This also
    // refuses the sentinel owner, which `buildSafeInitializer` rejects.
    if (
      encodeFunctionData({
        abi: SAFE_CREATE_ABI,
        functionName: "createProxyWithNonce",
        args: [SAFE_SINGLETON, buildSafeInitializer(plan), nonce],
      }).toLowerCase() !== call.data.toLowerCase()
    ) {
      return null;
    }
    return {
      flavor: "safe-create",
      to: call.to,
      singleton,
      saltNonce: plan.saltNonce,
      owners: plan.owners,
      threshold: plan.threshold,
      fallbackHandler,
      address: predictSafeAddress(plan),
    };
  } catch {
    return null;
  }
}

const DECODERS = [
  decodeSafeCreate,
  decodeProjectLaunch,
  decodeProject721Launch,
  decodeOmnichainLaunch,
  decodeRevnetDeploy,
];

/**
 * Recognize a frozen `{ chainId, to, data }` deployment call (as produced by
 * {@link createJBCenterDeploymentCall}) as one of the known v6 launch
 * flavors, or `"unknown"` when the target address or selector isn't
 * recognized.
 */
export function decodeDeploymentCall(
  call: JBCenterDeploymentCall,
): JBCenterDecodedLaunch {
  for (const decode of DECODERS) {
    const decoded = decode(call);
    if (decoded) return decoded;
  }
  return { flavor: "unknown", to: call.to, selector: slice(call.data, 0, 4) };
}
