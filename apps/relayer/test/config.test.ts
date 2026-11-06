import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config";

describe("relayer config", () => {
  it("reads required config fields", () => {
    const config = loadConfig({ RELAYER_PORT: "4000", RP_SECRET: "secret", ARKIV_ACCESS_KEY: "key" });

    expect(config.port).toBe(4000);
    expect(config.rpSecret).toBe("secret");
    expect(config.arkivAccessKey).toBe("key");
  });
});
