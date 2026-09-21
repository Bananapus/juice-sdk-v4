import {
  decodeFunctionData,
  isAddressEqual,
  slice,
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
  const address = addressFor("JBController", call.chainId);
  if (!address || !isAddressEqual(address, call.to)) return null;
  try {
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
  const address = addressFor("JB721TiersHookProjectDeployer", call.chainId);
  if (!address || !isAddressEqual(address, call.to)) return null;
  try {
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
  const address = addressFor("JBOmnichainDeployer", call.chainId);
  if (!address || !isAddressEqual(address, call.to)) return null;
  try {
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
  const address = addressFor("REVDeployer", call.chainId);
  if (!address || !isAddressEqual(address, call.to)) return null;
  try {
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

const DECODERS = [
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
