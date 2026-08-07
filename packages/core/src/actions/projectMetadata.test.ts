import type { Address, PublicClient } from "viem";
import { zeroAddress } from "viem";
import { describe, expect, test, vi } from "vitest";
import { jbControllerAbi } from "../generated/juicebox.js";
import { getProjectMetadata } from "./projectMetadata.js";

const controller = "0x1000000000000000000000000000000000000001" as Address;
const cid = "QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR";

function client(uriOrError: string | Error) {
  const readContract = vi.fn(async (_request: { abi: unknown }) => {
    if (uriOrError instanceof Error) throw uriOrError;
    return uriOrError;
  });
  return {
    client: { readContract } as unknown as PublicClient,
    readContract,
  };
}

describe("getProjectMetadata", () => {
  test("does not read or fetch for the zero controller", async () => {
    const { client: publicClient, readContract } = client(`ipfs://${cid}`);

    await expect(
      getProjectMetadata(publicClient, {
        jbControllerAddress: zeroAddress,
        projectId: 1n,
      }),
    ).resolves.toBeUndefined();
    expect(readContract).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("reads uriOf with the canonical ABI and fetches the exact default IPFS URL", async () => {
    const { client: publicClient, readContract } = client(
      `ipfs://${cid}/metadata.json`,
    );
    const metadata = { name: "Safety first", archived: false };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => metadata,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getProjectMetadata(publicClient, {
        jbControllerAddress: controller,
        projectId: 42n,
      }),
    ).resolves.toBe(metadata);

    expect(readContract).toHaveBeenCalledOnce();
    expect(readContract.mock.calls[0][0].abi).toBe(jbControllerAbi);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: controller,
        functionName: "uriOf",
        args: [42n],
      }),
    );
    // The FULL validated asset path is fetched — a path-style URI must keep
    // its CID, never collapse to the trailing file name.
    expect(fetchMock).toHaveBeenCalledWith(
      `https://ipfs.io/ipfs/${cid}/metadata.json`,
    );
  });

  test("fetches a bare CID uri as-is", async () => {
    const { client: publicClient } = client(cid);
    const metadata = { name: "Bare CID" };
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => metadata });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getProjectMetadata(publicClient, {
        jbControllerAddress: controller,
        projectId: 7n,
      }),
    ).resolves.toBe(metadata);
    expect(fetchMock).toHaveBeenCalledWith(`https://ipfs.io/ipfs/${cid}`);
  });

  test("re-resolves an HTTP gateway uri through the requested gateway", async () => {
    const { client: publicClient } = client(
      `https://other-gateway.example/ipfs/${cid}/metadata.json`,
    );
    const metadata = { name: "Gateway uri" };
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => metadata });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getProjectMetadata(publicClient, {
        jbControllerAddress: controller,
        projectId: 8n,
      }),
    ).resolves.toBe(metadata);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://ipfs.io/ipfs/${cid}/metadata.json`,
    );
  });

  test("uses the requested gateway without changing metadata identity", async () => {
    const { client: publicClient } = client(`ipfs://${cid}`);
    const metadata = { name: "Custom gateway" };
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => metadata });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getProjectMetadata(
        publicClient,
        { jbControllerAddress: controller, projectId: 9n },
        { ipfsGatewayHostname: "gateway.example" },
      ),
    ).resolves.toBe(metadata);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://gateway.example/ipfs/${cid}`,
    );
  });

  test.each([
    "",
    "ipfs://cid/",
    "not-a-cid",
    "https://example.com/metadata.json",
  ])(
    "does not fetch when uriOf carries no valid IPFS asset path (%j)",
    async (uri) => {
      const { client: publicClient } = client(uri);

      await expect(
        getProjectMetadata(publicClient, {
          jbControllerAddress: controller,
          projectId: 3n,
        }),
      ).resolves.toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  test("propagates controller and gateway failures", async () => {
    const readFailure = new Error("controller reverted");
    const { client: failingClient } = client(readFailure);
    await expect(
      getProjectMetadata(failingClient, {
        jbControllerAddress: controller,
        projectId: 3n,
      }),
    ).rejects.toBe(readFailure);

    const { client: publicClient } = client(`ipfs://${cid}`);
    const gatewayFailure = new Error("gateway unavailable");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(gatewayFailure));
    await expect(
      getProjectMetadata(publicClient, {
        jbControllerAddress: controller,
        projectId: 3n,
      }),
    ).rejects.toBe(gatewayFailure);
  });
});
