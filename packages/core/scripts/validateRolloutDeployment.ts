import { SUPPORTED_CHAINS } from "../src/contracts.js";

const rolloutContracts = new Set([
  "JBBuybackHook",
  "JBRouterTerminal",
  "JBRouterTerminalGateway",
  "JBRatioPriceFeed",
]);

function quantity(value: unknown): bigint | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    return BigInt(value);
  if (typeof value === "string" && /^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value))
    return BigInt(value);
  return undefined;
}

function minedHash(value: unknown) {
  return (
    typeof value === "string" &&
    /^0x[0-9a-f]{64}$/i.test(value) &&
    !/^0x0{64}$/i.test(value)
  );
}

/**
 * A canonical filename alone is not execution evidence. The rollout and its
 * retained generations use the same Sphinx artifact format and receipt layout;
 * deprecated suffixes affect the filename, not contractName. CREATE2 receipts
 * may have contractAddress=null, so identity comes from the artifact header.
 */
export function validateRolloutDeployment(
  deployment: unknown,
  chainAlias: string,
  artifactName: string,
  source: string,
) {
  const contractName = artifactName.replace(/_deprecated\d*$/, "");
  if (!rolloutContracts.has(contractName)) return;
  const record = (
    deployment && typeof deployment === "object" ? deployment : {}
  ) as Record<string, unknown>;
  const receipt = (
    record.receipt && typeof record.receipt === "object" ? record.receipt : {}
  ) as Record<string, unknown>;
  const chainId = Object.entries(SUPPORTED_CHAINS).find(
    ([, alias]) => alias === chainAlias,
  )?.[0];
  if (
    !chainId ||
    record.format !== "sphinx-sol-ct-artifact-1" ||
    record.contractName !== contractName ||
    quantity(record.chainId) !== BigInt(chainId) ||
    quantity(receipt.status) !== 1n ||
    (quantity(receipt.blockNumber) ?? 0n) <= 0n ||
    !minedHash(receipt.transactionHash) ||
    !minedHash(receipt.blockHash)
  ) {
    throw new Error(
      `Invalid executed rollout artifact ${source}: expected ${contractName} on ${chainAlias} with a successful mined receipt and transaction/block hashes`,
    );
  }
}
