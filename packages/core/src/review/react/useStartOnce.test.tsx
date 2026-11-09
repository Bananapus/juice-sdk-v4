// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { useStartOnce } from "./useStartOnce.js";

type Props = {
  open: boolean;
  preparing?: boolean;
  start?: () => void;
  startKey?: unknown;
  blocked?: boolean;
};
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});
let root: Root;
afterEach(() => act(() => root.unmount()));
function Probe({ open, preparing = false, start, startKey, blocked }: Props) {
  useStartOnce(open, preparing, start, startKey, blocked);
  return null;
}
const mount = () => {
  root = createRoot(document.createElement("div"));
  return (props: Props) => act(() => root.render(<Probe {...props} />));
};

test("starts once per opening, preparation and key", async () => {
  const render = mount();
  const start = vi.fn();
  await render({ open: false, start });
  await render({ open: true, preparing: true, start });
  expect(start).not.toHaveBeenCalled();
  await render({ open: true, start });
  await render({ open: true, start: () => start() });
  expect(start).toHaveBeenCalledTimes(1);
  await render({ open: true, start, startKey: 2 });
  expect(start).toHaveBeenCalledTimes(2);
  await render({ open: true, preparing: true, start, startKey: 2 });
  await render({ open: true, start, startKey: 2 });
  expect(start).toHaveBeenCalledTimes(3);
  await render({ open: false, start, startKey: 2 });
  await render({ open: true, start, startKey: 2 });
  expect(start).toHaveBeenCalledTimes(4);
});

test("holds while blocked or without a start, then starts", async () => {
  const render = mount();
  const start = vi.fn();
  await render({ open: true });
  await render({ open: true, start, blocked: true });
  expect(start).not.toHaveBeenCalled();
  await render({ open: true, start });
  expect(start).toHaveBeenCalledTimes(1);
  await render({ open: true, start, blocked: true });
  await render({ open: true, start });
  expect(start).toHaveBeenCalledTimes(1);
});
