import type { IdKitPayload } from "./types";

export type VerificationResult =
  | { ok: true }
  | { ok: false; code: "invalid_proof" | "expired" | "invalid_action" };

export type ProofVerifier = (
  payload: IdKitPayload,
  expectedAction: string,
) => Promise<VerificationResult>;

export function createSimulatedVerifier({ appId }: { appId: string }): ProofVerifier {
  return async (payload, expectedAction) => {
    if (!payload || typeof payload.proof !== "string" || payload.proof.length === 0) {
      return { ok: false, code: "invalid_proof" };
    }

    if (payload.proof === "bad-proof") {
      return { ok: false, code: "invalid_proof" };
    }

    if (!expectedAction || !expectedAction.includes(":")) {
      return { ok: false, code: "invalid_action" };
    }

    if (expectedAction.includes(appId) === false && appId !== "blind-report") {
      return { ok: false, code: "invalid_action" };
    }

    return { ok: true };
  };
}

export function createWorldVerifier({
  appId,
  apiUrl,
  fetchImpl = globalThis.fetch,
}: {
  appId: string;
  apiUrl?: string;
  fetchImpl?: typeof globalThis.fetch;
}): ProofVerifier {
  return async (payload, expectedAction) => {
    const target = apiUrl ?? "https://developer.worldcoin.org/api/v1/verify";
    const response = await fetchImpl(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ app_id: appId, action: expectedAction, payload }),
    });

    if (!response.ok) {
      return { ok: false, code: "invalid_proof" };
    }

    const data = (await response.json()) as { success?: boolean; code?: string };
    if (data.success === false) {
      return { ok: false, code: data.code === "expired" ? "expired" : "invalid_proof" };
    }

    return { ok: true };
  };
}
