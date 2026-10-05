/** Prepares and optionally simulates; never sends a transaction or loads a key. */
import {
  createPublicClient,
  encodeFunctionData,
  http,
  isAddress,
  parseEther,
  toHex,
  type Address,
  type PublicClient,
} from "viem";
import { randomBytes } from "node:crypto";
import { baseSepolia } from "@bananapus/nana-sdk-core/chains";
import {
  buildAccountingContext,
  buildDeployRevnetTx,
  buildRevnetStageConfig,
  getProjectCreationFee,
} from "@bananapus/nana-sdk-core/v6";

const sender = process.argv[2];
if (!sender || sender === "--help") {
  console.log(
    "Usage: node --import tsx examples/prepare-revnet.mts <sender address> [--simulate]\nReads the Base Sepolia creation fee, prepares a USD-denominated empty shop, and prints the call. RPC_URL optionally overrides the public RPC. --simulate performs eth_call only; no wallet, keys or send operation exists.",
  );
} else {
  try {
    if (!isAddress(sender)) throw new Error("Supply a sender address.");
    const client: PublicClient = createPublicClient({
      transport: http(
        process.env.RPC_URL ?? baseSepolia.rpcUrls.default.http[0],
      ),
    });
    if ((await client.getChainId()) !== baseSepolia.id)
      throw new Error("Wrong RPC network.");
    const creationFee = await getProjectCreationFee(client, baseSepolia.id);
    // Persist and reuse this salt and start across chains before submitting any call.
    const salt = toHex(randomBytes(32));
    const startsAtOrAfter = Number((await client.getBlock()).timestamp) + 3600;
    const request = buildDeployRevnetTx({
      chainId: baseSepolia.id,
      creationFee,
      config: {
        description: {
          name: "Example Revnet",
          ticker: "EXAMPLE",
          uri: "",
          salt,
        },
        baseCurrency: 2,
        operator: sender as Address,
        scopeCashOutsToLocalBalances: false,
        stageConfigurations: [
          buildRevnetStageConfig({
            startsAtOrAfter,
            initialIssuance: parseEther("1000"),
          }),
        ],
      },
      accountingContexts: [buildAccountingContext()],
      suckerConfig: { deployerConfigurations: [], salt },
      default721Config: {
        operatorPermissions: {
          canAdjustTiers: true,
          canUpdateMetadata: true,
          canMint: false,
          canIncreaseDiscountPercent: false,
        },
      },
    });
    console.log(
      JSON.stringify(
        {
          chainId: baseSepolia.id,
          account: sender,
          to: request.address,
          data: encodeFunctionData(request),
          value: request.value.toString(),
          salt,
          startsAtOrAfter,
          shop: request.args[4],
        },
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2,
      ),
    );
    if (process.argv.includes("--simulate")) {
      await client.call({
        account: sender as Address,
        to: request.address,
        data: encodeFunctionData(request),
        value: request.value,
      });
      console.log("Simulation succeeded. No transaction was sent.");
    }
  } catch {
    console.error(
      "Preparation or simulation failed. Check the sender, network, balance, creation fee and chosen configuration. No transaction was sent.",
    );
    process.exitCode = 1;
  }
}
