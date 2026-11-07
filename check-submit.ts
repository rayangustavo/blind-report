import { encodeEnvelope, seal, newKeypair } from '@blind-report/crypto';
import { toBase64Url } from '@blind-report/core';

async function main() {
  const kp = newKeypair();
  const { envelope } = seal({
    newsroom: 'jornal-livre.eth',
    pubkeyVersion: 1,
    category: 'corruption',
    recipients: [{ id: 'redacao', publicKey: kp.publicKey }],
    plaintext: new Uint8Array(128).fill(7),
  });

  const proof = {
    protocol_version: '4.0',
    action: 'submit:jornal-livre.eth:202611',
    environment: 'staging',
    responses: [{ identifier: 'proof_of_human', nullifier: '0x' + 'aa'.repeat(30) }],
  };

  const body = JSON.stringify({
    newsroom: 'jornal-livre.eth',
    epoch: 202611,
    category: 'corruption',
    hasAttachment: false,
    proof,
    envelope: toBase64Url(encodeEnvelope(envelope)),
  });

  const r = await fetch('http://127.0.0.1:8787/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
  console.log('STATUS', r.status);
  console.log(await r.text());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
