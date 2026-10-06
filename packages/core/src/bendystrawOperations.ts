import {
  Kind,
  parse,
  type ConstValueNode,
  type FragmentDefinitionNode,
  type SelectionSetNode,
  type TypeNode,
} from "graphql";
import {
  requestBendystraw,
  type BendystrawNetwork,
} from "./utils/bendystraw.js";

export type BendystrawOperationContract = {
  operationName?: string;
  validateData: (value: unknown) => value is Record<string, unknown>;
  validateVariables: (value: unknown) => value is Record<string, unknown>;
};

const contracts = new Map<string, BendystrawOperationContract>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeInput(value: unknown, depth = 0): boolean {
  if (depth > 12) return false;
  if (
    value === undefined ||
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }
  if (typeof value === "string") return value.length <= 16_384;
  if (Array.isArray(value)) {
    return (
      value.length <= 1_000 &&
      value.every((item) => isSafeInput(item, depth + 1))
    );
  }
  return (
    isRecord(value) &&
    Object.keys(value).length <= 250 &&
    Object.values(value).every((item) => isSafeInput(item, depth + 1))
  );
}

function validateNamedInput(name: string, value: unknown): boolean {
  if (!isSafeInput(value)) return false;
  switch (name) {
    case "Boolean":
      return typeof value === "boolean";
    case "Float":
      return typeof value === "number" && Number.isFinite(value);
    case "Int":
      return typeof value === "number" && Number.isSafeInteger(value);
    case "ID":
      return typeof value === "string" || Number.isSafeInteger(value);
    case "String":
      return typeof value === "string";
    default:
      return true;
  }
}

function validateInput(type: TypeNode, value: unknown): boolean {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return (
      value !== null && value !== undefined && validateInput(type.type, value)
    );
  }
  if (value === null || value === undefined) return true;
  if (type.kind === Kind.LIST_TYPE) {
    const values = Array.isArray(value) ? value : [value];
    return values.every((item) => validateInput(type.type, item));
  }
  return validateNamedInput(type.name.value, value);
}

// Defaults are constant values: the parser rejects a variable inside one.
function defaultValueOf(value: ConstValueNode | undefined): unknown {
  if (!value) return undefined;
  switch (value.kind) {
    case Kind.BOOLEAN:
      return value.value;
    case Kind.ENUM:
    case Kind.STRING:
      return value.value;
    case Kind.FLOAT:
    case Kind.INT:
      return Number(value.value);
    case Kind.LIST:
      return value.values.map(defaultValueOf);
    case Kind.NULL:
      return null;
    case Kind.OBJECT:
      return Object.fromEntries(
        value.fields.map((field) => [
          field.name.value,
          defaultValueOf(field.value),
        ]),
      );
  }
}

function validateSelectedValue(
  value: unknown,
  selectionSet: SelectionSetNode,
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
): boolean {
  if (value === null) return true;
  if (Array.isArray(value)) {
    return value.every((item) =>
      validateSelectedValue(item, selectionSet, fragments),
    );
  }
  if (!isRecord(value)) return false;
  return validateSelectionSet(value, selectionSet, fragments, true);
}

function validateSelectionSet(
  value: Record<string, unknown>,
  selectionSet: SelectionSetNode,
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
  requireFields: boolean,
): boolean {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const responseKey = selection.alias?.value ?? selection.name.value;
      if (!Object.prototype.hasOwnProperty.call(value, responseKey)) {
        if (requireFields) return false;
        continue;
      }
      if (
        selection.selectionSet &&
        !validateSelectedValue(
          value[responseKey],
          selection.selectionSet,
          fragments,
        )
      ) {
        return false;
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      if (
        !validateSelectionSet(
          value,
          selection.selectionSet,
          fragments,
          requireFields && !selection.typeCondition,
        )
      ) {
        return false;
      }
    } else {
      const fragment = fragments.get(selection.name.value);
      if (!fragment) return false;
      if (
        !validateSelectionSet(value, fragment.selectionSet, fragments, false)
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Compile one static GraphQL document into the same runtime operation contract
 * used by every Bendystraw transport: operation name, bounded variables, and
 * recursive response-shape validation.
 */
export function compileBendystrawOperation(
  query: string,
): BendystrawOperationContract {
  const cached = contracts.get(query);
  if (cached) return cached;

  const document = parse(query);
  const operations = document.definitions.filter(
    (definition) => definition.kind === Kind.OPERATION_DEFINITION,
  );
  if (operations.length !== 1) {
    throw new TypeError(
      "A Bendystraw document must contain exactly one operation",
    );
  }
  const operation = operations[0];
  const fragments = new Map(
    document.definitions
      .filter(
        (definition): definition is FragmentDefinitionNode =>
          definition.kind === Kind.FRAGMENT_DEFINITION,
      )
      .map((fragment) => [fragment.name.value, fragment]),
  );
  const variableNames = new Set(
    operation.variableDefinitions?.map(
      (definition) => definition.variable.name.value,
    ) ?? [],
  );

  const contract: BendystrawOperationContract = {
    operationName: operation.name?.value,
    validateData: (value): value is Record<string, unknown> =>
      isRecord(value) &&
      validateSelectionSet(value, operation.selectionSet, fragments, true),
    validateVariables: (value): value is Record<string, unknown> => {
      if (!isRecord(value) || !isSafeInput(value)) return false;
      if (Object.keys(value).some((name) => !variableNames.has(name)))
        return false;
      return (operation.variableDefinitions ?? []).every((definition) => {
        const name = definition.variable.name.value;
        const input =
          value[name] === undefined
            ? defaultValueOf(definition.defaultValue)
            : value[name];
        return validateInput(definition.type, input);
      });
    },
  };
  contracts.set(query, contract);
  return contract;
}

/** The persisted-operation id a same-origin Bendystraw proxy accepts: the SHA-256 of the exact document. */
export async function bendystrawOperationId(query: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(query),
  );
  let id = "";
  for (const byte of new Uint8Array(digest))
    id += byte.toString(16).padStart(2, "0");
  return id;
}

export type PersistedBendystrawRequest = {
  query: string;
  variables: Record<string, unknown>;
};

/**
 * Resolve a proxy request body (`{ operation, variables }`) against the app's
 * registry of persisted documents. Anything else, including an unknown id, is
 * refused with null, so the proxy never forwards arbitrary GraphQL.
 */
export function resolvePersistedBendystrawRequest(
  value: unknown,
  registry: Readonly<Record<string, string>>,
): PersistedBendystrawRequest | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (
    keys.some((key) => key !== "operation" && key !== "variables") ||
    typeof value.operation !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.operation) ||
    !isRecord(value.variables)
  ) {
    return null;
  }
  // The 64-hex id check above rules out inherited keys such as `__proto__`.
  const query = registry[value.operation];
  return query ? { query, variables: value.variables } : null;
}

/**
 * Send one persisted operation through the app's same-origin proxy
 * (`/api/bendystraw/{network}/query` unless `endpoint` says otherwise). Only
 * the operation id and variables leave the browser; the response is validated
 * against the document's contract. When the caller's `signal` aborts, the
 * request under way fails with the signal's reason and is not retried; a signal
 * that has already aborted sends nothing.
 */
export async function requestPersistedBendystraw<T>(args: {
  contract: BendystrawOperationContract;
  network: BendystrawNetwork;
  query: string;
  variables: Record<string, unknown>;
  endpoint?: string;
  signal?: AbortSignal;
}): Promise<T> {
  const operation = await bendystrawOperationId(args.query);
  return requestBendystraw<T, Record<string, unknown>>(
    args.endpoint ?? `/api/bendystraw/${args.network}/query`,
    args.query,
    args.variables,
    {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          body: JSON.stringify({ operation, variables: args.variables }),
          cache: "no-store",
        }),
      operationName: args.contract.operationName,
      signal: args.signal,
      validateData: (value): value is T => args.contract.validateData(value),
      validateVariables: args.contract.validateVariables,
    },
  );
}
