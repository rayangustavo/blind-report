import { describe, expect, it } from "vitest";
import { actionFor, isNewsroomName } from "../src/action";
import { InvalidEpochError, InvalidNewsroomNameError } from "../src/errors";

describe("isNewsroomName", () => {
  it("accepts lowercase .eth names with valid labels", () => {
    for (const name of ["redacao.eth", "a.eth", "a1.eth", "redacao-2026.eth", "sub.redacao.eth", "1.eth"]) {
      expect(isNewsroomName(name)).toBe(true);
    }
  });

  it("rejects names that are not .eth", () => {
    for (const name of ["redacao.com", "redacaoeth", "eth", ".eth", "redacao.ETH"]) {
      expect(isNewsroomName(name)).toBe(false);
    }
  });

  it("rejects invalid label characters and shapes", () => {
    for (const name of [
      "Redacao.eth",
      "-redacao.eth",
      "redacao-.eth",
      "red acao.eth",
      "redacao..eth",
      "redacao.eth2",
      "redacao_1.eth",
      `${"a".repeat(64)}.eth`,
    ]) {
      expect(isNewsroomName(name)).toBe(false);
    }
  });

  it("rejects empty and oversized names", () => {
    expect(isNewsroomName("")).toBe(false);
    expect(isNewsroomName(42 as unknown as string)).toBe(false);
    expect(isNewsroomName(`${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.eth`)).toBe(false);
  });
});

describe("actionFor", () => {
  it("formats submit:<newsroom>:<epoch>", () => {
    expect(actionFor("redacao.eth", "2026-11")).toBe("submit:redacao.eth:2026-11");
    expect(actionFor("sub.redacao.eth", "2026-01")).toBe("submit:sub.redacao.eth:2026-01");
  });

  it("throws InvalidNewsroomNameError for invalid newsrooms", () => {
    expect(() => actionFor("redacao.com", "2026-11")).toThrow(InvalidNewsroomNameError);
    expect(() => actionFor("", "2026-11")).toThrowError(/invalid newsroom name/);
  });

  it("throws InvalidEpochError for invalid epochs", () => {
    expect(() => actionFor("redacao.eth", "2026-13")).toThrow(InvalidEpochError);
    expect(() => actionFor("redacao.eth", "")).toThrowError(/invalid epoch/);
  });
});
