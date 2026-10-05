import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const owner = "0x0000000000000000000000000000000000000099";
const rpc = "https://offline-rpc.invalid";
function cli(file, args = [], env = {}) {
  return run(
    process.execPath,
    [
      "--import",
      "./examples/test/mock-rpc.mjs",
      "--import",
      "tsx",
      `examples/${file}.mts`,
      ...args,
    ],
    { env: { ...process.env, RPC_URL: rpc, ...env }, timeout: 15000 },
  );
}

test("project URL inspection returns copyable network-bound evidence", async () => {
  const { stdout } = await cli(
    "check-deployment",
    ["https://revnet.money/basesep:45"],
    { OPERATOR_ADDRESS: owner },
  );
  const report = JSON.parse(stdout);
  assert.equal(report.chainId, 84532);
  assert.equal(report.projectId, "45");
  assert.equal(report.operator, owner);
  assert.equal(report.checkedBlock, "123");
  assert.equal(report.indexer.status, "not-checked");
  assert.ok(
    report.checks.some(
      (check) => check.id === "project.owner" && check.status === "passed",
    ),
  );
});
test("current Juicebox URLs use the same v6 project", async () => {
  const { stdout } = await cli("check-deployment", [
    "https://juicebox.money/basesep:45",
  ]);
  assert.equal(JSON.parse(stdout).projectId, "45");
});

test("transaction receipt resolves its project from the canonical registry", async () => {
  const { stdout } = await cli("check-deployment", [
    `0x${"11".repeat(32)}`,
    "basesep",
  ]);
  assert.equal(JSON.parse(stdout).projectId, "45");
});

test("preparation uses the actual creation fee and simulation never sends", async () => {
  const { stdout } = await cli("prepare-revnet", [owner, "--simulate"]);
  assert.match(stdout, /"value": "123"/);
  assert.match(stdout, /"decimals": 6/);
  assert.match(stdout, /"preventOperatorMinting": true/);
  assert.match(stdout, /Simulation succeeded. No transaction was sent/);
});
test("input failures return actionable safe messages", async () => {
  await assert.rejects(
    cli("check-deployment", ["https://juicebox.money/v5/basesep/45"]),
    (error) => {
      assert.match(error.stderr, /Expected a v6 project/);
      assert.ok(!error.stderr.includes(rpc));
      return true;
    },
  );
});
