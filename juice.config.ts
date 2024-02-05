const sepoliaChainId = 11155111 as const;
const opSepoliaChainId = 11155420 as const;

/**
 * Chains to generate addresses for.
 */
const CHAINS = [sepoliaChainId, opSepoliaChainId] as const;
const DEFAULT_CHAIN = sepoliaChainId;

export { CHAINS, DEFAULT_CHAIN };
