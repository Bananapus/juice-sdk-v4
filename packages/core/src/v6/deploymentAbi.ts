import type { Abi } from "viem";

/** Preserve errors/events while selecting one tuple-heavy deployment overload. */
export function selectDeploymentAbi<T extends Abi>(
  abi: T,
  functionName: string,
  argumentCount: number,
): T {
  if (
    abi.filter(
      (item) =>
        item.type === "function" &&
        item.name === functionName &&
        item.inputs.length === argumentCount,
    ).length !== 1
  ) {
    throw new Error(
      `Expected one ${functionName} overload with ${argumentCount} arguments.`,
    );
  }
  return abi.filter(
    (item) =>
      item.type !== "function" ||
      item.name !== functionName ||
      item.inputs.length === argumentCount,
  ) as unknown as T;
}
