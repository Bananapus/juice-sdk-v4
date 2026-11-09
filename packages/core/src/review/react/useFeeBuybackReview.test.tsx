// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import type { FeeReviewCall, FeeReviewContext } from "../../v6/feeBuyback.js";
import { useFeeBuybackReview } from "./useFeeBuybackReview.js";

const user = "0x3333333333333333333333333333333333333333";
const pay: FeeReviewCall = {
  chainId: 1,
  from: user,
  to: user,
  data: "0x",
  functionName: "pay",
};

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
});

function harness() {
  const unwatch = vi.fn();
  const client = {
    request: vi.fn(async () => "0x1"),
    watchBlockNumber: vi.fn(() => unwatch),
  };
  const context: FeeReviewContext = () => ({
    client,
    options: { trustedHooks: [], beneficiary: user },
  });
  const seen: { current?: ReturnType<typeof useFeeBuybackReview> } = {};
  function Probe({ calls }: { calls: readonly FeeReviewCall[] }) {
    seen.current = useFeeBuybackReview(calls, context);
    return null;
  }
  root = createRoot(document.createElement("div"));
  const render = (calls: readonly FeeReviewCall[]) =>
    act(async () => root!.render(<Probe calls={calls} />));
  return { seen, render, client, unwatch };
}

describe("useFeeBuybackReview", () => {
  test("checks the calls, starts over when they change and stops on unmount", async () => {
    const { seen, render, client, unwatch } = harness();
    const first = [pay];
    await render(first);
    expect(seen.current).toMatchObject({
      enabled: true,
      status: "unknown",
      settled: true,
      autoRefresh: true,
    });
    await act(async () => seen.current!.retry());
    await act(async () => seen.current!.wait());
    expect(seen.current!.waiting).toBe(true);
    expect(await act(() => seen.current!.confirm())).toBe(true);
    await render(first);
    expect(client.watchBlockNumber).toHaveBeenCalledTimes(1);
    await render([{ ...pay }]);
    expect(unwatch).toHaveBeenCalledTimes(1);
    expect(seen.current!.waiting).toBe(false);
    const last = seen.current!;
    act(() => root!.unmount());
    root = undefined;
    expect(unwatch).toHaveBeenCalledTimes(2);
    expect(await last.confirm()).toBe(false);
    last.retry();
    last.wait();
  });

  test("an earlier render's actions answer for its own calls only", async () => {
    const { seen, render } = harness();
    await render([pay]);
    const first = seen.current!;
    await render([{ ...pay }]);
    expect(await act(() => first.confirm())).toBe(false);
    expect(await act(() => seen.current!.confirm())).toBe(true);
  });

  test("approves at once when nothing pays a fee", async () => {
    const { seen, render } = harness();
    await render([{ ...pay, functionName: "launch" }]);
    expect(seen.current).toMatchObject({ enabled: false, status: "none" });
    act(() => root!.unmount());
    root = undefined;
    expect(await seen.current!.confirm()).toBe(true);
  });
});
