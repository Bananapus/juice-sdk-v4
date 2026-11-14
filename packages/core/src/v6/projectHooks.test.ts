import { type Address, type PublicClient, getAddress, zeroAddress } from "viem";
import { describe, expect, test, vi } from "vitest";
import { resolveProjectBuybackHook } from "./projectHooks.js";
import { v6Address, v6Deployments } from "./types.js";

const chainId = 8453;
const projectId = 7n;
const CONTROLLER = getAddress("0x00000000000000000000000000000000000000C1");
const PINNED = getAddress("0x00000000000000000000000000000000000000B1");
const OTHER = getAddress("0x00000000000000000000000000000000000000D1");
const HOOK_721 = getAddress("0x0000000000000000000000000000000000000721");

const REGISTRY = getAddress(v6Address("JBBuybackHookRegistry", chainId));
const REV_OWNER = getAddress(v6Address("REVOwner", chainId));
const OMNICHAIN = getAddress(v6Address("JBOmnichainDeployer", chainId));
const HOOK = getAddress(v6Address("JBBuybackHook", chainId));

type Flags = { pay?: boolean; cashOut?: boolean };

/** A chain where each address answers the reads it would onchain; anything else throws. */
function chain({
  dataHook = zeroAddress,
  flags = {},
  extra,
  hook721,
  hookOf = { [REGISTRY]: PINNED } as Record<string, Address>,
  revnetRegistry = REGISTRY,
  controller = CONTROLLER,
  fail,
}: {
  dataHook?: Address;
  flags?: Flags;
  extra?: { dataHook: Address } & Flags;
  hook721?: { hook: Address; cashOut: boolean };
  hookOf?: Record<string, Address>;
  revnetRegistry?: Address;
  controller?: Address;
  fail?: string;
}) {
  // Addresses compare without their checksum casing, as they do onchain.
  const registryAnswer = (address: Address) => {
    const key = Object.keys(hookOf).find(
      (registry) => registry.toLowerCase() === address.toLowerCase(),
    );
    if (!key) throw new Error(`no registry at ${address}`);
    return hookOf[key];
  };
  const readContract = vi.fn(
    async ({
      address,
      functionName,
      args,
    }: {
      address: Address;
      functionName: string;
      args: readonly bigint[];
    }) => {
      if (functionName === fail) throw new Error("rpc down");
      // Each read names the contract and the exact arguments it is for.
      const expected: Record<string, [Address, readonly bigint[]]> = {
        controllerOf: [v6Address("JBDirectory", chainId), [projectId]],
        currentRulesetOf: [controller, [projectId]],
        extraDataHookOf: [OMNICHAIN, [projectId, 42n]],
        tiered721HookOf: [OMNICHAIN, [projectId, 42n]],
        BUYBACK_HOOK: [REV_OWNER, []],
        hookOf: [address, [projectId]],
      };
      const [at, withArgs] = expected[functionName] ?? [address, args];
      if (at.toLowerCase() !== address.toLowerCase())
        throw new Error(functionName + " read at " + address);
      if (args.join() !== withArgs.join())
        throw new Error(functionName + " read with " + args.join());
      switch (functionName) {
        case "controllerOf":
          return controller;
        case "currentRulesetOf":
          return [
            { id: 42 },
            {
              dataHook,
              useDataHookForPay: flags.pay ?? true,
              useDataHookForCashOut: flags.cashOut ?? true,
            },
          ];
        case "extraDataHookOf":
          return {
            dataHook: extra?.dataHook ?? zeroAddress,
            useDataHookForPay: extra?.pay ?? true,
            useDataHookForCashOut: extra?.cashOut ?? true,
          };
        case "tiered721HookOf":
          return [hook721?.hook ?? zeroAddress, hook721?.cashOut ?? false];
        case "BUYBACK_HOOK":
          return revnetRegistry;
        case "hookOf":
          return registryAnswer(address);
        default:
          throw new Error(`unexpected read ${functionName}`);
      }
    },
  );
  return {
    client: { readContract } as unknown as PublicClient,
    reads: () => readContract.mock.calls.map(([call]) => call.functionName),
  };
}

const resolve = (
  setup: Parameters<typeof chain>[0],
  direction?: "pay" | "cashOut",
) =>
  resolveProjectBuybackHook(chain(setup).client, {
    chainId,
    projectId,
    direction,
  });

describe("resolveProjectBuybackHook", () => {
  test("the registry as the data hook resolves through its hookOf", async () => {
    await expect(resolve({ dataHook: REGISTRY })).resolves.toEqual({
      hook: PINNED,
      via: "registry",
      dataHook: REGISTRY,
      rulesetId: 42n,
      registry: REGISTRY,
    });
  });

  test("a project whose ruleset calls another hook, or none, has no buyback hook even though the registry names a default", async () => {
    for (const dataHook of [OTHER, zeroAddress]) {
      const { client, reads } = chain({ dataHook });
      const resolved = await resolveProjectBuybackHook(client, {
        chainId,
        projectId,
      });
      expect(resolved).toMatchObject({
        hook: null,
        via: "none",
        registry: null,
      });
      // The registry's cohort default is never asked.
      expect(reads()).not.toContain("hookOf");
    }
  });

  test("a revnet resolves through its owner contract's own registry", async () => {
    const older = getAddress("0x00000000000000000000000000000000000000E1");
    await expect(
      resolve({
        dataHook: REV_OWNER,
        revnetRegistry: older,
        hookOf: { [older]: PINNED },
      }),
    ).resolves.toMatchObject({ hook: PINNED, via: "revnet", registry: older });
  });

  test("a buyback hook of any generation as the data hook is that hook", async () => {
    for (const hook of v6Deployments("JBBuybackHook", chainId).map((a) =>
      getAddress(a),
    )) {
      await expect(resolve({ dataHook: hook })).resolves.toMatchObject({
        hook,
        via: "direct",
        registry: null,
      });
    }
    expect(
      v6Deployments("JBBuybackHook", chainId).map((a) => getAddress(a)),
    ).toContain(HOOK);
  });

  test("the direction's use flag decides whether the hook is called", async () => {
    const setup = { dataHook: REGISTRY, flags: { pay: true, cashOut: false } };
    await expect(resolve(setup, "pay")).resolves.toMatchObject({
      hook: PINNED,
    });
    await expect(resolve(setup, "cashOut")).resolves.toMatchObject({
      hook: null,
      via: "none",
    });
  });

  test("the omnichain deployer forwards to the project's extra hook, by that hook's own flags", async () => {
    const setup = {
      dataHook: OMNICHAIN,
      extra: { dataHook: REGISTRY, pay: true, cashOut: false },
    };
    await expect(resolve(setup, "pay")).resolves.toEqual({
      hook: PINNED,
      via: "omnichain",
      dataHook: OMNICHAIN,
      rulesetId: 42n,
      registry: REGISTRY,
    });
    await expect(resolve(setup, "cashOut")).resolves.toMatchObject({
      hook: null,
      via: "none",
    });
    await expect(
      resolve({ dataHook: OMNICHAIN, extra: { dataHook: HOOK } }),
    ).resolves.toMatchObject({ hook: HOOK, via: "omnichain", registry: null });
    await expect(
      resolve({ dataHook: OMNICHAIN, extra: { dataHook: OTHER } }),
    ).resolves.toMatchObject({ hook: null, via: "none" });
    await expect(resolve({ dataHook: OMNICHAIN })).resolves.toMatchObject({
      hook: null,
      via: "none",
    });
  });

  test("on cash out the omnichain deployer skips the extra hook when the 721 hook handles cash outs", async () => {
    const extra = { dataHook: REGISTRY };
    const handles = { hook: HOOK_721, cashOut: true };
    await expect(
      resolve({ dataHook: OMNICHAIN, extra, hook721: handles }, "cashOut"),
    ).resolves.toMatchObject({ hook: null, via: "none" });
    // Paying still reaches it, and so does a cash out the 721 hook does not handle.
    await expect(
      resolve({ dataHook: OMNICHAIN, extra, hook721: handles }, "pay"),
    ).resolves.toMatchObject({ hook: PINNED, via: "omnichain" });
    await expect(
      resolve(
        {
          dataHook: OMNICHAIN,
          extra,
          hook721: { hook: HOOK_721, cashOut: false },
        },
        "cashOut",
      ),
    ).resolves.toMatchObject({ hook: PINNED, via: "omnichain" });
  });

  test("a registry with nothing resolved, or a project with no controller, has no hook", async () => {
    await expect(
      resolve({ dataHook: REGISTRY, hookOf: { [REGISTRY]: zeroAddress } }),
    ).resolves.toMatchObject({
      hook: null,
      via: "registry",
      registry: REGISTRY,
    });
    await expect(resolve({ controller: zeroAddress })).resolves.toEqual({
      hook: null,
      via: "none",
      dataHook: zeroAddress,
      rulesetId: 0n,
      registry: null,
    });
  });

  test("a failed read throws instead of reading as no hook", async () => {
    for (const fail of ["controllerOf", "currentRulesetOf", "hookOf"]) {
      await expect(resolve({ dataHook: REGISTRY, fail })).rejects.toThrow(
        "rpc down",
      );
    }
    for (const fail of ["extraDataHookOf", "tiered721HookOf"]) {
      await expect(
        resolve(
          { dataHook: OMNICHAIN, extra: { dataHook: REGISTRY }, fail },
          "cashOut",
        ),
      ).rejects.toThrow("rpc down");
    }
    await expect(
      resolve({ dataHook: REV_OWNER, fail: "BUYBACK_HOOK" }),
    ).rejects.toThrow("rpc down");
  });
});
