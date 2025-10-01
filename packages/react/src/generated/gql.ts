/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query Project($projectId: Float!, $chainId: Float!, $version: Float!) {\n  project(projectId: $projectId, chainId: $chainId, version: $version) {\n    projectId\n    metadataUri\n    handle\n    createdAt\n    logoUri\n    name\n    version\n    suckerGroupId\n    suckerGroup {\n      projects {\n        items {\n          chainId\n          balance\n          tokenSupply\n          projectId\n        }\n      }\n    }\n  }\n}\n\nquery Projects($where: projectFilter) {\n  projects(where: $where) {\n    items {\n      projectId\n      metadataUri\n      handle\n      createdAt\n      suckerGroupId\n      participants {\n        totalCount\n      }\n      version\n    }\n  }\n}\n\nquery ProjectAccountingContext($chainId: Float!, $projectId: Float!, $version: Float!) {\n  project(chainId: $chainId, projectId: $projectId, version: $version) {\n    token\n    decimals\n    currency\n  }\n}": typeof types.ProjectDocument,
};
const documents: Documents = {
    "query Project($projectId: Float!, $chainId: Float!, $version: Float!) {\n  project(projectId: $projectId, chainId: $chainId, version: $version) {\n    projectId\n    metadataUri\n    handle\n    createdAt\n    logoUri\n    name\n    version\n    suckerGroupId\n    suckerGroup {\n      projects {\n        items {\n          chainId\n          balance\n          tokenSupply\n          projectId\n        }\n      }\n    }\n  }\n}\n\nquery Projects($where: projectFilter) {\n  projects(where: $where) {\n    items {\n      projectId\n      metadataUri\n      handle\n      createdAt\n      suckerGroupId\n      participants {\n        totalCount\n      }\n      version\n    }\n  }\n}\n\nquery ProjectAccountingContext($chainId: Float!, $projectId: Float!, $version: Float!) {\n  project(chainId: $chainId, projectId: $projectId, version: $version) {\n    token\n    decimals\n    currency\n  }\n}": types.ProjectDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Project($projectId: Float!, $chainId: Float!, $version: Float!) {\n  project(projectId: $projectId, chainId: $chainId, version: $version) {\n    projectId\n    metadataUri\n    handle\n    createdAt\n    logoUri\n    name\n    version\n    suckerGroupId\n    suckerGroup {\n      projects {\n        items {\n          chainId\n          balance\n          tokenSupply\n          projectId\n        }\n      }\n    }\n  }\n}\n\nquery Projects($where: projectFilter) {\n  projects(where: $where) {\n    items {\n      projectId\n      metadataUri\n      handle\n      createdAt\n      suckerGroupId\n      participants {\n        totalCount\n      }\n      version\n    }\n  }\n}\n\nquery ProjectAccountingContext($chainId: Float!, $projectId: Float!, $version: Float!) {\n  project(chainId: $chainId, projectId: $projectId, version: $version) {\n    token\n    decimals\n    currency\n  }\n}"): (typeof documents)["query Project($projectId: Float!, $chainId: Float!, $version: Float!) {\n  project(projectId: $projectId, chainId: $chainId, version: $version) {\n    projectId\n    metadataUri\n    handle\n    createdAt\n    logoUri\n    name\n    version\n    suckerGroupId\n    suckerGroup {\n      projects {\n        items {\n          chainId\n          balance\n          tokenSupply\n          projectId\n        }\n      }\n    }\n  }\n}\n\nquery Projects($where: projectFilter) {\n  projects(where: $where) {\n    items {\n      projectId\n      metadataUri\n      handle\n      createdAt\n      suckerGroupId\n      participants {\n        totalCount\n      }\n      version\n    }\n  }\n}\n\nquery ProjectAccountingContext($chainId: Float!, $projectId: Float!, $version: Float!) {\n  project(chainId: $chainId, projectId: $projectId, version: $version) {\n    token\n    decimals\n    currency\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;