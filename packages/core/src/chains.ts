import { defineChain } from "viem";
import { chainConfig } from "viem/op-stack";

/**
 * Juicebox's supported chains.
 *
 * Keep these definitions local instead of importing the `viem/chains` barrel.
 * That barrel eagerly exposes every chain, including chains with runtime-only
 * modules which client bundlers cannot statically analyse.
 */
export const mainnet = defineChain({
  id: 1,
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockTime: 12_000,
  rpcUrls: {
    default: { http: ["https://eth.merkle.io"] },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://etherscan.io",
      apiUrl: "https://api.etherscan.io/api",
    },
  },
  contracts: {
    ensUniversalResolver: {
      address: "0xeeeeeeee14d718c2b47d9923deab1335e144eeee",
      blockCreated: 23_085_558,
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 14_353_601,
    },
  },
});

export const sepolia = defineChain({
  id: 11_155_111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.drpc.org"] },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      apiUrl: "https://api-sepolia.etherscan.io/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 751_532,
    },
    ensUniversalResolver: {
      address: "0xeeeeeeee14d718c2b47d9923deab1335e144eeee",
      blockCreated: 8_928_790,
    },
  },
  testnet: true,
});

const optimismSourceId = 1;

export const optimism = defineChain({
  ...chainConfig,
  id: 10,
  name: "OP Mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.optimism.io"] },
  },
  blockExplorers: {
    default: {
      name: "Optimism Explorer",
      url: "https://optimistic.etherscan.io",
      apiUrl: "https://api-optimistic.etherscan.io/api",
    },
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [optimismSourceId]: {
        address: "0xe5965Ab5962eDc7477C8520243A95517CD252fA9",
      },
    },
    l2OutputOracle: {
      [optimismSourceId]: {
        address: "0xdfe97868233d1aa22e815a266982f2cf17685a27",
      },
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 4_286_263,
    },
    portal: {
      [optimismSourceId]: {
        address: "0xbEb5Fc579115071764c7423A4f12eDde41f106Ed",
      },
    },
    l1StandardBridge: {
      [optimismSourceId]: {
        address: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1",
      },
    },
  },
  sourceId: optimismSourceId,
});

const sepoliaSourceId = 11_155_111;

export const optimismSepolia = defineChain({
  ...chainConfig,
  id: 11_155_420,
  name: "OP Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.optimism.io"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://optimism-sepolia.blockscout.com",
      apiUrl: "https://optimism-sepolia.blockscout.com/api",
    },
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [sepoliaSourceId]: {
        address: "0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1",
      },
    },
    l2OutputOracle: {
      [sepoliaSourceId]: {
        address: "0x90E9c4f8a994a250F6aEfd61CAFb4F2e895D458F",
      },
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 1_620_204,
    },
    portal: {
      [sepoliaSourceId]: {
        address: "0x16Fc5058F25648194471939df75CF27A2fdC48BC",
      },
    },
    l1StandardBridge: {
      [sepoliaSourceId]: {
        address: "0xFBb0621E0B23b5478B630BD55a5f21f67730B0F1",
      },
    },
  },
  testnet: true,
  sourceId: sepoliaSourceId,
});

export const base = defineChain({
  ...chainConfig,
  id: 8_453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.base.org"] },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://basescan.org",
      apiUrl: "https://api.basescan.org/api",
    },
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [optimismSourceId]: {
        address: "0x43edB88C4B80fDD2AdFF2412A7BebF9dF42cB40e",
      },
    },
    l2OutputOracle: {
      [optimismSourceId]: {
        address: "0x56315b90c40730925ec5485cf004d835058518A0",
      },
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 5_022,
    },
    portal: {
      [optimismSourceId]: {
        address: "0x49048044D57e1C92A77f79988d21Fa8fAF74E97e",
        blockCreated: 17_482_143,
      },
    },
    l1StandardBridge: {
      [optimismSourceId]: {
        address: "0x3154Cf16ccdb4C6d922629664174b904d80F2C35",
        blockCreated: 17_482_143,
      },
    },
  },
  sourceId: optimismSourceId,
});

export const baseSepolia = defineChain({
  ...chainConfig,
  id: 84_532,
  network: "base-sepolia",
  name: "Base Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: {
      name: "Basescan",
      url: "https://sepolia.basescan.org",
      apiUrl: "https://api-sepolia.basescan.org/api",
    },
  },
  contracts: {
    ...chainConfig.contracts,
    disputeGameFactory: {
      [sepoliaSourceId]: {
        address: "0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1",
      },
    },
    l2OutputOracle: {
      [sepoliaSourceId]: {
        address: "0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254",
      },
    },
    portal: {
      [sepoliaSourceId]: {
        address: "0x49f53e41452c74589e85ca1677426ba426459e85",
        blockCreated: 4_446_677,
      },
    },
    l1StandardBridge: {
      [sepoliaSourceId]: {
        address: "0xfd0Bf71F60660E2f608ed56e1659C450eB113120",
        blockCreated: 4_446_677,
      },
    },
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 1_059_647,
    },
  },
  testnet: true,
  sourceId: sepoliaSourceId,
});

export const arbitrum = defineChain({
  id: 42_161,
  name: "Arbitrum One",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockTime: 250,
  rpcUrls: {
    default: { http: ["https://arb1.arbitrum.io/rpc"] },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://arbiscan.io",
      apiUrl: "https://api.arbiscan.io/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 7_654_707,
    },
  },
});

export const arbitrumSepolia = defineChain({
  id: 421_614,
  name: "Arbitrum Sepolia",
  blockTime: 250,
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
      apiUrl: "https://api-sepolia.arbiscan.io/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 81_930,
    },
  },
  testnet: true,
});
