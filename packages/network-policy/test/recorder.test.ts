import { describe, expect, it, vi } from "vitest";
import { RequestRecorder } from "../src/recorder";

describe("RequestRecorder", () => {
  it("records attempts in order with method and verdict", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const recorder = new RequestRecorder();

    recorder.record("https://rpc.example.org", { method: "post" });
    recorder.record(new URL("https://evil.example.net"), undefined, false);

    expect(recorder.entries).toEqual([
      { url: "https://rpc.example.org", method: "POST", allowed: true, timestamp: 1_700_000_000_000 },
      { url: "https://evil.example.net/", method: "GET", allowed: false, timestamp: 1_700_000_000_000 },
    ]);
    expect(recorder.size).toBe(2);
    vi.useRealTimers();
  });

  it("returns a copy of the entries", () => {
    const recorder = new RequestRecorder();
    recorder.record("https://rpc.example.org");
    const snapshot = recorder.entries as unknown as Array<{ url: string }>;
    snapshot.push({ url: "https://evil.example.net" });
    expect(recorder.size).toBe(1);
  });

  it("clears its buffer", () => {
    const recorder = new RequestRecorder();
    recorder.record("https://rpc.example.org");
    recorder.clear();
    expect(recorder.size).toBe(0);
    expect(recorder.entries).toEqual([]);
  });
});
