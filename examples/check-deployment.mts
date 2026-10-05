/** Run from the SDK checkout: node --import tsx examples/check-deployment.mts --help */
import {
  createPublicClient,
  http,
  isAddress,
  parseEventLogs,
  type Hash,
} from "viem";
import { JB_CHAINS, JB_CHAIN_SLUGS } from "@bananapus/nana-sdk-core";
import { jbProjectsAbi, revDeployerAbi } from "@bananapus/nana-sdk-core";
import { jbUrn } from "@bananapus/nana-sdk-core";
import {
  getProjectDeploymentDiagnostics,
  v6Address,
} from "@bananapus/nana-sdk-core/v6";
import type { JBChainId } from "@bananapus/nana-sdk-core";

class InputError extends Error {}

const input = process.argv[2];
if (!input || input === "--help") {
  console.log(
    "Usage: node --import tsx examples/check-deployment.mts <v6:chain:project | revnet URL | Juicebox v6 URL | transaction hash> [chain slug/id]\nExamples: basesep:45; https://revnet.money/basesep:45; https://juicebox.money/basesep:45\nTransaction hashes require a chain. Optional RPC_URL overrides the chain default; OPERATOR_ADDRESS enables permission reads. No wallet or indexer is used.",
  );
} else {
  try {
    let target = input;
    let chainId: JBChainId;
    let projectId: bigint | undefined;
    const isTransaction = /^0x[\da-f]{64}$/i.test(target);
    if (isTransaction) {
      const chainArg = process.argv[3] ?? "";
      const metadata =
        JB_CHAIN_SLUGS[chainArg] ?? JB_CHAINS[Number(chainArg) as JBChainId];
      if (!metadata)
        throw new InputError(
          "A supported chain slug or ID is required with a transaction hash.",
        );
      chainId = metadata.chain.id;
    } else {
      if (/^https?:\/\//.test(target)) {
        const url = new URL(target);
        const path = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "");
        // Both current sites use versionless v6 project paths.
        if (
          [
            "revnet.money",
            "www.revnet.money",
            "juicebox.money",
            "www.juicebox.money",
          ].includes(url.hostname)
        ) {
          const urn = path.replaceAll("/", ":");
          target = urn.startsWith("v") ? urn : `v6:${urn}`;
        } else
          throw new InputError("Use a current Revnet or Juicebox project URL.");
      }
      const parsed = jbUrn(target.startsWith("v") ? target : `v6:${target}`);
      if (!parsed || parsed.version !== 6)
        throw new InputError(
          "Expected a v6 project: chain:project or v6:chain:project.",
        );
      chainId = parsed.chainId;
      projectId = parsed.projectId;
    }
    const client = createPublicClient({
      chain: JB_CHAINS[chainId].chain,
      transport: http(process.env.RPC_URL),
    });
    if ((await client.getChainId()) !== chainId)
      throw new InputError(
        "RPC network differs from the requested project network.",
      );
    if (isTransaction) {
      const receipt = await client.getTransactionReceipt({
        hash: target as Hash,
      });
      if (receipt.status !== "success")
        throw new InputError(
          "The transaction reverted; it did not complete deployment.",
        );
      const projects = v6Address("JBProjects", chainId).toLowerCase();
      const deployer = v6Address("REVDeployer", chainId).toLowerCase();
      const created = parseEventLogs({
        abi: jbProjectsAbi,
        eventName: "Create",
        logs: receipt.logs.filter(
          (log) => log.address.toLowerCase() === projects,
        ),
      }).map((log) => log.args.projectId);
      const revnets = parseEventLogs({
        abi: revDeployerAbi,
        eventName: "DeployRevnet",
        logs: receipt.logs.filter(
          (log) => log.address.toLowerCase() === deployer,
        ),
      }).map((log) => log.args.revnetId);
      const ids = [...new Set([...created, ...revnets])];
      if (ids.length !== 1)
        throw new InputError(
          "The receipt does not identify exactly one v6 project. Pass chain:project explicitly.",
        );
      projectId = ids[0];
    }
    const operator = process.env.OPERATOR_ADDRESS;
    if (operator !== undefined && !isAddress(operator))
      throw new InputError("OPERATOR_ADDRESS must be an Ethereum address.");
    const report = await getProjectDeploymentDiagnostics(client, {
      chainId,
      projectId: projectId!,
      operator,
    });
    console.log(
      JSON.stringify(
        { ...report, indexer: { status: "not-checked" } },
        null,
        2,
      ),
    );
    if (
      report.checks.some(
        (check) =>
          check.status === "mismatch" || check.status === "unavailable",
      )
    )
      process.exitCode = 1;
  } catch (error) {
    // Never copy provider URLs, credentials or raw RPC messages into diagnostics.
    console.error(
      error instanceof InputError
        ? error.message
        : "Could not inspect the target. Check the project format, chain, transaction receipt and RPC availability. Run --help for accepted inputs.",
    );
    process.exitCode = 1;
  }
}
