import {
  PublicClient,
  decodeFunctionData,
  encodeFunctionData,
  parseEther,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { describe, expect, test } from "vitest";
import { NATIVE_TOKEN, USDC_ADDRESSES } from "../constants.js";
import { jbControllerAbi } from "../generated/juicebox.js";
import {
  buildAccountingContext,
  buildLaunchProjectTx,
  buildRulesetConfiguration,
  buildRulesetMetadata,
  buildTerminalConfigurations,
  getProjectCreationFee,
} from "./launch.js";
import { v6Address } from "./types.js";

const OWNER = "0x000000000000000000000000000000000000dEaD" as const;

/** A stub PublicClient that records readContract calls. */
function stubClient(returnValue: unknown, calls: unknown[] = []) {
  const client = {
    readContract: async (params: unknown) => {
      calls.push(params);
      return returnValue;
    },
  } as unknown as PublicClient;
  return { client, calls };
}

describe("buildAccountingContext", () => {
  test("defaults to the native token (61166 currency, 18 decimals)", () => {
    expect(buildAccountingContext()).toEqual({
      token: NATIVE_TOKEN,
      decimals: 18,
      currency: 61166,
    });
  });

  test("keys the currency off the token address", () => {
    const usdc = USDC_ADDRESSES[sepolia.id];
    const context = buildAccountingContext(usdc, 6);
    expect(context.token).toBe(usdc);
    expect(context.decimals).toBe(6);
    expect(context.currency).toBe(Number(BigInt(usdc) & 0xffffffffn));
  });

  test("requires decimals for non-native tokens", () => {
    expect(() => buildAccountingContext(USDC_ADDRESSES[sepolia.id])).toThrow(
      /decimals is required/,
    );
  });
});

describe("buildTerminalConfigurations", () => {
  test("pairs the multi terminal with the router registry (empty contexts)", () => {
    const configurations = buildTerminalConfigurations({
      chainId: sepolia.id,
    });
    expect(configurations).toHaveLength(2);
    expect(configurations[0].terminal).toBe(
      v6Address("JBMultiTerminal", sepolia.id),
    );
    expect(configurations[0].accountingContextsToAccept).toEqual([
      buildAccountingContext(),
    ]);
    expect(configurations[1].terminal).toBe(
      v6Address("JBRouterTerminalRegistry", sepolia.id),
    );
    expect(configurations[1].accountingContextsToAccept).toEqual([]);
  });

  test("accepts explicit accounting contexts", () => {
    const usdcContext = buildAccountingContext(USDC_ADDRESSES[sepolia.id], 6);
    const configurations = buildTerminalConfigurations({
      chainId: sepolia.id,
      accountingContexts: [usdcContext],
    });
    expect(configurations[0].accountingContextsToAccept).toEqual([usdcContext]);
  });
});

describe("buildRulesetMetadata", () => {
  test("uses safe v6 defaults", () => {
    const metadata = buildRulesetMetadata();
    expect(metadata.reservedPercent).toBe(0);
    expect(metadata.cashOutTaxRate).toBe(0);
    expect(metadata.baseCurrency).toBe(1);
    expect(metadata.scopeCashOutsToLocalBalances).toBe(false);
    expect(metadata.dataHook).toBe(zeroAddress);
    expect(metadata.metadata).toBe(0);
    // v6 field name only — the old inverted field must not exist.
    expect("useTotalSurplusForCashOuts" in metadata).toBe(false);
  });

  test("honors overrides", () => {
    const metadata = buildRulesetMetadata({
      reservedPercent: 5000,
      baseCurrency: 2,
      allowOwnerMinting: true,
    });
    expect(metadata.reservedPercent).toBe(5000);
    expect(metadata.baseCurrency).toBe(2);
    expect(metadata.allowOwnerMinting).toBe(true);
    expect(metadata.pausePay).toBe(false);
  });
});

describe("buildRulesetConfiguration", () => {
  test("uses safe defaults (zero payouts, no approval hook)", () => {
    const configuration = buildRulesetConfiguration();
    expect(configuration.mustStartAtOrAfter).toBe(0);
    expect(configuration.duration).toBe(0);
    expect(configuration.weight).toBe(0n);
    expect(configuration.weightCutPercent).toBe(0);
    expect(configuration.approvalHook).toBe(zeroAddress);
    expect(configuration.splitGroups).toEqual([]);
    expect(configuration.fundAccessLimitGroups).toEqual([]);
    expect(configuration.metadata).toEqual(buildRulesetMetadata());
  });
});

describe("buildLaunchProjectTx", () => {
  test("encodes against the controller ABI with the creation fee as value", () => {
    const creationFee = parseEther("0.01");
    const request = buildLaunchProjectTx({
      chainId: sepolia.id,
      owner: OWNER,
      projectUri: "ipfs://bafy",
      rulesetConfigurations: [
        buildRulesetConfiguration({ weight: parseEther("1000") }),
      ],
      terminalConfigurations: buildTerminalConfigurations({
        chainId: sepolia.id,
      }),
      creationFee,
    });

    expect(request.address).toBe(v6Address("JBController", sepolia.id));
    expect(request.value).toBe(creationFee);
    expect(request.args[4]).toBe(""); // default memo

    const data = encodeFunctionData(request);
    const decoded = decodeFunctionData({ abi: jbControllerAbi, data });
    if (decoded.functionName !== "launchProjectFor") {
      throw new Error("decoded the wrong function");
    }
    expect(decoded.args[0].toLowerCase()).toBe(OWNER.toLowerCase());
  });
});

describe("getProjectCreationFee", () => {
  test("reads JBProjects.creationFee on the requested chain", async () => {
    const { client, calls } = stubClient(parseEther("0.001"));
    const fee = await getProjectCreationFee(client, sepolia.id);
    expect(fee).toBe(parseEther("0.001"));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      address: v6Address("JBProjects", sepolia.id),
      functionName: "creationFee",
    });
  });
});
