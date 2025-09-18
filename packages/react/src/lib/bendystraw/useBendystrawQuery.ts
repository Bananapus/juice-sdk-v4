"use client";

import { type TypedDocumentNode } from "@graphql-typed-document-node/core";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import request from "graphql-request";
import { useJBChainId } from "../../contexts/JBChainContext/JBChainContext";
import { getBendystrawUrl } from "./getBendystrawUrl";
import { useBendystrawConfig } from "../../contexts/JBProjectProvider/JBProjectProvider";

export function useBendystrawQuery<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  ...[variables, options]: TVariables extends Record<string, never>
    ? [undefined?, { pollInterval?: number; enabled?: boolean }?]
    : [TVariables, { pollInterval?: number; enabled?: boolean }?]
): UseQueryResult<TResult> {
  const chainId = useJBChainId();
  const config = useBendystrawConfig();

  const url = chainId && config ? getBendystrawUrl(chainId, config) : undefined;

  return useQuery({
    queryKey: [(document.definitions[0] as any).name.value, chainId, variables],
    queryFn: async () => request(`${url}/graphql`, document, variables as object),
    enabled: options?.enabled !== false && !!chainId && !!url,
    refetchInterval: options?.pollInterval,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}
