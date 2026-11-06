// Mantém o bundle da demo leve: importa só os erros e o recibo reais, sem puxar
// o client.ts completo (e suas dependências de rede) para uma UI simulada.
export { ProofError, SourceError } from "../../../packages/source-client/src/errors.ts";
export { parseReceipt, serializeReceipt } from "../../../packages/source-client/src/receipt.ts";
