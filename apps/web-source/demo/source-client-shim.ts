// Substitui o barrel de @blind-report/source-client no bundle da demo, evitando
// carregar client.ts (que depende de APIs divergentes de crypto/ens-client).
export { ProofError, SourceError } from "../../../packages/source-client/src/errors.ts";
export { parseReceipt, serializeReceipt } from "../../../packages/source-client/src/receipt.ts";
