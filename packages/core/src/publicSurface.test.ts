import { describe, expect, test } from "vitest";
import * as sdk from "./index.js";
import * as bendystrawOperations from "./bendystrawOperations.js";
import * as reviewDecode from "./review/decode.js";
import * as review from "./review/index.js";
import * as reviewRelayr from "./review/relayr.js";
import * as safe from "./safe.js";
import * as safeService from "./safeService.js";
import * as feeBuyback from "./v6/feeBuyback.js";
import * as v6 from "./v6/index.js";

describe("published core SDK surfaces", () => {
  test("exports the framework-free Safe creation boundary", () => {
    expect(safe.resolveSafeAddress).toBeTypeOf("function");
    expect(safe.buildSafeDeploymentTx).toBeTypeOf("function");
    expect(safe.bundleSafeLaunch).toBeTypeOf("function");
    expect(safe.verifySafeDeployments).toBeTypeOf("function");
    expect(safeService.waitForSafeExecutionHash).toBeTypeOf("function");
    expect(safeService.isSafeWalletPeer("https://app.safe.global")).toBe(true);
    expect(safeService.safeServiceBase(8453)).toBe(
      "https://api.safe.global/tx-service/base",
    );
    expect(safe.SAFE_PROXY_CREATION_CODE).toMatch(/^0x(?:[\da-f]{2}){486}$/u);
  });

  test("exports the framework-free utility and V6 transaction boundaries", () => {
    expect(sdk.getTokenAToBQuote).toBeTypeOf("function");
    expect(sdk.getProjectTerminalStore).toBeTypeOf("function");
    expect(sdk.downsampleTimeSeries).toBeTypeOf("function");
    expect(sdk.requestBendystraw).toBeTypeOf("function");
    expect(sdk.resolveBendystrawNetwork).toBeTypeOf("function");
    expect(sdk.selectBendystrawEndpoint).toBeTypeOf("function");
    expect(sdk.bendystrawDataHasFields).toBeTypeOf("function");
    expect(sdk.bendystrawCacheTtl).toBeTypeOf("function");
    expect(sdk.bendystrawProjectRefsFilter).toBeTypeOf("function");
    expect(sdk.bendystrawProjectRefsFilters).toBeTypeOf("function");
    expect(sdk.createJBCenterClient).toBeTypeOf("function");
    expect(sdk.createJBCenterRpcProvider).toBeTypeOf("function");
    expect(sdk.JBCENTER_DEFAULT_URL).toBe("https://juicebox.center");
    expect(sdk.JBCENTER_RPC_METHODS).toContain("eth_chainId");
    expect(sdk.JBCENTER_SPONSORED_CHAIN_IDS).toContain(8453);
    expect(sdk.isSponsorable).toBeTypeOf("function");
    expect(sdk.sponsorableChains).toBeTypeOf("function");
    expect(sdk.unsponsoredChains).toBeTypeOf("function");
    expect(sdk.decodeDeploymentCall).toBeTypeOf("function");
    expect(sdk.intentCalls).toBeTypeOf("function");
    expect(sdk.mergeSearch).toBeTypeOf("function");
    expect(sdk.intentRow).toBeTypeOf("function");
    expect(sdk.intentPath).toBeTypeOf("function");
    expect(sdk.deployedChains).toBeTypeOf("function");
    expect(sdk.isFullyDeployed).toBeTypeOf("function");
    expect(sdk.ensureDeployed).toBeTypeOf("function");
    expect(sdk.EnsureDeployedError).toBeTypeOf("function");
    expect(sdk.publishSignedIntent).toBeTypeOf("function");
    expect(sdk.JBCenterIntentMismatchError).toBeTypeOf("function");
    expect(sdk.describeCenterRefusal).toBeTypeOf("function");
    expect(sdk.describeCenterRefusal(new Error("boom"))).toBeNull();
    expect(v6.buildDeployRevnetTx).toBeTypeOf("function");
    expect(v6.buildAutoIssueTx).toBeTypeOf("function");
    expect(v6.quoteDirectPaySwap).toBeTypeOf("function");
    expect(v6.buildDirectPaySwapTx).toBeTypeOf("function");
    expect(v6.permit2TypedData).toBeTypeOf("function");
    expect(v6.netLoanProceeds).toBeTypeOf("function");
    expect(v6.build721RulesetMetadata).toBeTypeOf("function");
    expect(v6.decode721RulesetMetadata).toBeTypeOf("function");
    expect(sdk.isContractRevertError).toBeTypeOf("function");
    expect(sdk.isMissingContractFunctionError).toBeTypeOf("function");
    expect(v6.requiredFeedPairs).toBeTypeOf("function");
    expect(v6.probeFeedReachability).toBeTypeOf("function");
    expect(v6.REV_METADATA_ALLOW_SUCKER_DEPLOYMENT).toBe(1 << 2);
    expect(v6.REVLOANS_BURN_PERMISSION_ID).toBe(11);
    expect(v6.isStickySplit).toBeTypeOf("function");
    expect(v6.describeStickySplit).toBeTypeOf("function");
  });

  test("exports the shared web-client runtime boundaries", () => {
    expect(review.submitReviewedContractWrite).toBeTypeOf("function");
    expect(review.requireContractTransactionReview).toBeTypeOf("function");
    expect(review.gasWithinCap).toBeTypeOf("function");
    expect(bendystrawOperations.compileBendystrawOperation).toBeTypeOf(
      "function",
    );
    expect(bendystrawOperations.requestPersistedBendystraw).toBeTypeOf(
      "function",
    );
    expect(sdk.resolveProjectDeployments).toBeTypeOf("function");
    expect(feeBuyback.checkFeeBuyback).toBeTypeOf("function");
    expect(feeBuyback.createFeeWatch).toBeTypeOf("function");
    expect(review.isDefiniteWalletRejection).toBeTypeOf("function");
    expect(review.waitForTrackedReceipt).toBeTypeOf("function");
    expect(review.TransactionReceiptUnavailableError).toBeTypeOf("function");
    expect(review.isTransactionReceiptUnavailableError).toBeTypeOf("function");
    expect(review.simulateStateChangingTransaction).toBeTypeOf("function");
    expect(review.simulateCallSequence).toBeTypeOf("function");
    expect(review.TRANSACTION_SIMULATION_GAS).toBe(10_000_000n);
    expect(review.TRANSACTION_SIMULATION_MAX_RETURN_BYTES).toBe(4_096);
    expect(feeBuyback.isFeePayingCall).toBeTypeOf("function");
    expect(feeBuyback.combineFeeResults).toBeTypeOf("function");
    expect(feeBuyback.feeReviewConfirmLabel).toBeTypeOf("function");
    expect(feeBuyback.feeBuybackOptions).toBeTypeOf("function");
  });

  test("keeps the review decoders on their own lazily loaded entry point", () => {
    expect(Object.keys(reviewDecode).sort()).toEqual([
      "describeJBHookMetadata",
      "describePermissionsData",
      "describeSafeInitializer",
      "describeSafeInnerCall",
      "describeSplitGroups",
      "describeSuckerClaim",
      "describeUniversalRouterExecute",
      "describeV4UnlockData",
      "functionFromCall",
      "knownAddressName",
      "namedValue",
      "nativeValue",
      "readableValue",
      "reviewDescription",
    ]);
    for (const name of Object.keys(reviewDecode)) {
      expect(review).not.toHaveProperty(name);
    }
  });

  test("keeps the Relayr primitives on their own entry point", () => {
    expect(Object.keys(reviewRelayr).sort()).toEqual([
      "FORWARD_REQUEST_TYPES",
      "RELAYR_API",
      "RELAYR_FORWARDER_DEADLINE_SECONDS",
      "RELAYR_NATIVE_TOKEN",
      "RELAYR_PAYMENT_ADDRESS",
      "RELAYR_PAYMENT_CODE_HASH",
      "RELAYR_PAYMENT_GAS",
      "RELAYR_PAYMENT_SELECTOR",
      "RelayrDestinationRevertedError",
      "RelayrPaymentRevertedError",
      "RelayrProofError",
      "TRUSTED_FORWARDER_ABI",
      "bindRelayrQuote",
      "quoteExpired",
      "relayrBundleRequest",
      "relayrDestinationHash",
      "relayrForwardRequest",
      "relayrPaymentChains",
      "relayrPaymentDetails",
      "relayrPaymentOptions",
      "relayrProgress",
      "relayrRecordChain",
      "relayrStateIsFailed",
      "relayrStateIsSuccess",
      "relayrSupportsChain",
      "relayrSupportsChains",
      "requireRelayrPaymentRetry",
      "requireRelayrPaymentRuntime",
      "simulateRelayrPayment",
      "verifyRelayrDestination",
      "verifyRelayrDestinations",
      "verifyRelayrPayment",
    ]);
    for (const name of Object.keys(reviewRelayr)) {
      expect(review).not.toHaveProperty(name);
      expect(sdk).not.toHaveProperty(name);
    }
  });

  test("keeps the Safe authority, queue and distribution checks on their own entry points", () => {
    expect(Object.keys(safe).sort()).toEqual([
      "CREATE_BATCH_ABI",
      "MAX_SAFE_OWNERS",
      "MULTICALL3",
      "MULTI_SEND_ABI",
      "MULTI_SEND_CALL_ONLY",
      "MULTI_SEND_CALL_ONLY_DEPLOYMENTS",
      "RECOGNIZED_SAFE_RELEASES",
      "SAFE_CANONICAL_PAYMENT_RECEIVER",
      "SAFE_CREATE_ABI",
      "SAFE_FACTORY",
      "SAFE_FALLBACK",
      "SAFE_L1_L2_SINGLETON_PAIRS",
      "SAFE_PROXY_CREATION_CODE",
      "SAFE_SETUP_ABI",
      "SAFE_SINGLETON",
      "SAFE_TO_L2_SETUP_ABI",
      "SAFE_TO_L2_SETUP_ADDRESS",
      "SAFE_TO_L2_SETUP_CODE_HASH",
      "authorityIdentitiesMatch",
      "buildSafeDeploymentCalls",
      "buildSafeDeploymentTx",
      "buildSafeInitializer",
      "buildSafeProxyFactoryCall",
      "bundleSafeLaunch",
      "checkSafeDeployments",
      "decodeMultiSend",
      "encodeMultiSend",
      "isDeployableSafeAuthority",
      "isEip7702DelegatedEoaRuntime",
      "isRecognizedSafeDeployment",
      "multiSendCallsOf",
      "packMultiSend",
      "predictSafeAddress",
      "prepareSafeSameAddressDeployment",
      "proveSafeCreation",
      "readAuthorityIdentity",
      "readBoundedSafeApprovedHash",
      "readBoundedSafeNonce",
      "readCrossChainHandleAuthority",
      "readMatchingAuthorityIdentities",
      "readSafeCreationCode",
      "resolveSafeAddress",
      "safeSingletonsAreEquivalent",
      "unbundleSafeLaunch",
      "validateSafeCreationForCurrentPolicy",
      "validateSafeDeploymentPlan",
      "verifySafeDeployments",
      "verifySafeLaunchSimulation",
    ]);
    expect(Object.keys(safeService).sort()).toEqual([
      "SAFE_EXEC_ABI",
      "SAFE_NONCE_GUIDANCE",
      "SAFE_PREFIX",
      "SAFE_SERVICE_MAX_RETRY_WAIT_MS",
      "SAFE_SERVICE_PREFIX",
      "SAFE_TX_TYPES",
      "canonicalSafeTxHash",
      "fetchSafeCreation",
      "fetchSafesOwnedBy",
      "findPendingSafeTransaction",
      "hasSafeService",
      "isSafeWalletPeer",
      "listPendingSafeTransactions",
      "nextProposalNonce",
      "onchainApprovalStep",
      "parseSafeCreationPayload",
      "proposeSafeTransaction",
      "readSafeTransaction",
      "requireSafeExecutionSuccess",
      "safeBatchProposalFor",
      "safeCreationUrl",
      "safeExecutionArgs",
      "safeExecutionResult",
      "safeExecutionSignatures",
      "safeProposalFor",
      "safeQueueUrl",
      "safeServiceBase",
      "safeTransactionHasRefund",
      "safeTransactionHash",
      "safeTransactionMatchesCall",
      "safeTransactionMessage",
      "safeTransactionUrl",
      "submitSafeConfirmation",
      "swapDeadline",
      "usableSafeConfirmations",
      "waitForSafeExecutionHash",
    ]);
    for (const name of [...Object.keys(safe), ...Object.keys(safeService)]) {
      expect(sdk).not.toHaveProperty(name);
    }
    expect(v6.verifyPayoutReceipt).toBeTypeOf("function");
    expect(v6.verifyReservedDistributionReceipt).toBeTypeOf("function");
    expect(sdk).not.toHaveProperty("verifyPayoutReceipt");
  });
});
