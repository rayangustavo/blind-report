export type AadFields = {
  version: number;
  newsroom: string;
  category: string;
  epoch: string;
};

const encoder = new TextEncoder();

/**
 * Dados autenticados adicionais (AAD) canônicos: a redação, a categoria, a
 * época e a versão ficam autenticadas junto ao ciphertext. Qualquer alteração
 * desses campos impede a decifragem.
 */
export function aadFor(fields: AadFields): Uint8Array {
  return encoder.encode(JSON.stringify([fields.version, fields.newsroom, fields.category, fields.epoch]));
}
