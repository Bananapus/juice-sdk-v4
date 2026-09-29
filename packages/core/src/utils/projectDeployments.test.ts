import { describe, expect, it } from "vitest";
import {
  resolveProjectDeployments,
  type BendystrawDeploymentRow,
} from "./bendystraw.js";

const project = (
  overrides: Partial<BendystrawDeploymentRow> = {},
): BendystrawDeploymentRow => ({
  projectId: 7,
  chainId: 1,
  version: 6,
  suckerGroupId: "group-a",
  ...overrides,
});
const ids = (rows: BendystrawDeploymentRow[]) =>
  rows.map((row) => [row.chainId, row.projectId]);

describe("sucker-group deployments are untrusted index input", () => {
  it("retains verified per-chain project IDs instead of copying the home ID", () => {
    const home = project();
    expect(
      ids(
        resolveProjectDeployments(home, [
          home,
          project({ chainId: 8453, projectId: 99 }),
          project({ chainId: 10, projectId: 12 }),
          project({ chainId: 10, projectId: 12 }),
        ]),
      ),
    ).toEqual([
      [1, 7],
      [10, 12],
      [8453, 99],
    ]);
  });

  it("fails closed to home-only when the route chain reports another project", () => {
    const home = project();
    expect(
      resolveProjectDeployments(home, [
        project({ projectId: 8 }),
        project({ chainId: 10, projectId: 12 }),
      ]),
    ).toEqual([home]);
  });

  it("omits an ambiguous remote chain while retaining unambiguous peers", () => {
    expect(
      ids(
        resolveProjectDeployments(project(), [
          project({ chainId: 10, projectId: 12 }),
          project({ chainId: 10, projectId: 13 }),
          project({ chainId: 8453, projectId: 22 }),
        ]),
      ),
    ).toEqual([
      [1, 7],
      [8453, 22],
    ]);
  });

  it("drops wrong-group, wrong-version and invalid numeric identities", () => {
    const home = project();
    expect(
      resolveProjectDeployments(home, [
        project({ chainId: 10, projectId: 12, suckerGroupId: "group-b" }),
        project({ chainId: 8453, projectId: 13, version: 5 }),
        project({ chainId: 42161, projectId: Number.NaN }),
        project({ chainId: 0, projectId: 14 }),
        project({ chainId: 1.5, projectId: 14 }),
        project({ chainId: 10, projectId: 0 }),
      ]),
    ).toEqual([home]);
  });

  it("never links a project that has no sucker group", () => {
    const home = project({ suckerGroupId: null });
    expect(
      resolveProjectDeployments(home, [
        project({ chainId: 10, projectId: 12 }),
      ]),
    ).toEqual([home]);
  });
});
