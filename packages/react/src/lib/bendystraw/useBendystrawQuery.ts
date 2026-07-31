"use client";

import { type TypedDocumentNode } from "@graphql-typed-document-node/core";
import { requestBendystraw } from "@bananapus/nana-sdk-core";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { analyzeDocument } from "graphql-request";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { useBendystrawConfig } from "../../contexts/JBProjectProvider/JBProjectProvider";
import { getBendystrawUrl } from "./getBendystrawUrl";

export function useBendystrawQuery<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  ...[variables, options]: TVariables extends Record<string, never>
    ? [
        undefined?,
        { pollInterval?: number; enabled?: boolean; staleTime?: number }?,
      ]
    : [
        TVariables,
        { pollInterval?: number; enabled?: boolean; staleTime?: number }?,
      ]
): UseQueryResult<TResult> {
  const chainId = useJBChainId();
  const config = useBendystrawConfig();

  const url = chainId && config ? getBendystrawUrl(chainId, config) : undefined;
  const { expression, operationName } = analyzeDocument(document);

  if (!operationName) {
    throw new Error("Bendystraw operations must have a name.");
  }

  return useQuery({
    queryKey: [operationName, chainId, url, variables],
    queryFn: async () =>
      requestBendystraw<TResult, object>(
        `${url}/graphql`,
        expression,
        variables as object,
      ),
    enabled: options?.enabled !== false && !!chainId && !!url,
    refetchInterval: options?.pollInterval,
    // requestBendystraw owns bounded transient retries. Retrying again here
    // would multiply requests and make timeout behavior inconsistent.
    retry: false,
    staleTime: options?.staleTime ?? 30000, // Consider data stale after 30 seconds by default
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
