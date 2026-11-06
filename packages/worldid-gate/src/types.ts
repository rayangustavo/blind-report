export type IdKitPayload = {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: "orb" | "device";
};

export type RpContext = {
  rp_id: string;
  action: string;
  signature: string;
  valid_until: number;
};

export type AdmitResult =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; code: "invalid_proof" | "limit_reached" | "expired" | "invalid_action" };
