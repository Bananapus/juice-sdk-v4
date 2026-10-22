import type { Hex } from "viem";
import { describe, expect, it } from "vitest";
import { REVIEW_REQUESTS } from "./__fixtures__/review-requests.js";
import expectedModels from "./__fixtures__/review-models.json" with { type: "json" };
import { buildReviewModel } from "./model.js";
import type { TransactionReviewRequest } from "./transactionReview.js";

// review-models.json was captured from jbm main's dialog, where JSON keeps
// each bigint as { $bigint }.
const asJson = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === "bigint" ? { $bigint: item.toString() } : item,
    ),
  );

const requests = REVIEW_REQUESTS as Record<string, TransactionReviewRequest>;
const pay = requests["pay with 721 metadata"];

describe("buildReviewModel", () => {
  it("matches the jbm dialog for every fixture", () => {
    expect(Object.keys(requests)).toEqual(Object.keys(expectedModels));
    for (const [name, request] of Object.entries(requests)) {
      expect(asJson(buildReviewModel(request)), name).toEqual(
        (expectedModels as Record<string, unknown>)[name],
      );
    }
  });

  it("binds id to calls and context", () => {
    const { id } = buildReviewModel(pay);
    const [call] = pay.calls;
    const lastByte = call.data.slice(-2) === "00" ? "01" : "00";
    const changedData = {
      ...pay,
      calls: [{ ...call, data: `${call.data.slice(0, -2)}${lastByte}` as Hex }],
    };
    expect(buildReviewModel(changedData).id).not.toBe(id);

    const context = [{ label: "Pay", value: "0.01 ETH" }];
    const withContext = buildReviewModel({ ...pay, context });
    expect(withContext.id).not.toBe(id);
    expect(
      buildReviewModel({
        ...pay,
        context: [{ label: "Pay", value: "0.02 ETH" }],
      }).id,
    ).not.toBe(withContext.id);
    expect(buildReviewModel({ ...pay, context }).id).toBe(withContext.id);
  });

  it("keeps id when only warnings or enrichment change", () => {
    const { id } = buildReviewModel(pay);
    const [call] = pay.calls;
    // A nonzero safeTxGas adds a warning; a label, contract name or a missing
    // ABI only change what the review explains.
    const enriched = buildReviewModel({
      ...pay,
      title: "Another title",
      calls: [
        {
          ...call,
          label: "Pay with 4 decimals",
          contractName: "Terminal",
          safeTxGas: 1n,
          abi: undefined,
        },
      ],
    });
    expect(enriched.calls[0].warnings.map((warning) => warning.code)).toEqual([
      "safe-gas-nonzero",
      "abi-unavailable",
    ]);
    expect(enriched.id).toBe(id);
  });

  it("treats context as display only", () => {
    const context = [
      { label: "You pay", value: "0.01 ETH", strong: true },
      { label: "Project", value: "#4", mono: true },
    ];
    const plain = buildReviewModel(pay);
    const shown = buildReviewModel({ ...pay, context });
    expect(shown.context).toEqual(context);
    expect(shown.context).not.toBe(context);
    expect(shown.calls).toEqual(plain.calls);
    expect(shown.rawJson).toBe(plain.rawJson);
  });
});
