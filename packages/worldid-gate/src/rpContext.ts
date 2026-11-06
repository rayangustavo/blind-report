import { createHmac } from "node:crypto";

import type { RpContext } from "./types";

export function createRpContext({
  rpId,
  action,
  secret,
  validMs,
}: {
  rpId: string;
  action: string;
  secret: string;
  validMs: number;
}): RpContext {
  const valid_until = Date.now() + validMs;
  const payload = `${rpId}:${action}:${valid_until}:${secret}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  return {
    rp_id: rpId,
    action,
    signature,
    valid_until,
  };
}
