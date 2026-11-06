import { actionFor } from "@blind-report/core";

import type { AdmitResult, IdKitPayload } from "./types";
import type { NullifierStore } from "./store";
import type { ProofVerifier } from "./verifier";

export function createSubmissionGate({
  verifier,
  store,
  rpId,
  environment,
}: {
  verifier: ProofVerifier;
  store: NullifierStore;
  rpId: string;
  environment: string;
}): {
  admit(input: { newsroom: string; epoch: string; idKitPayload: IdKitPayload }): Promise<AdmitResult>;
} {
  return {
    async admit({ newsroom, epoch, idKitPayload }) {
      const action = actionFor(newsroom, epoch);
      const verification = await verifier(idKitPayload, action);
      if (!verification.ok) {
        return { ok: false, code: verification.code === "invalid_action" ? "invalid_action" : "invalid_proof" };
      }

      const consumed = await store.consume(action, idKitPayload.nullifier_hash);
      if (!consumed) {
        return { ok: false, code: "limit_reached" };
      }

      return {
        ok: true,
        release: async () => {
          await store.release(action, idKitPayload.nullifier_hash);
        },
      };
    },
  };
}
