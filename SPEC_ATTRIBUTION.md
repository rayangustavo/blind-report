# ETHGlobal Mumbai — AI Tools Attribution & Spec-Driven Development Record

> **Compliance Document:** In accordance with the official [ETHGlobal Mumbai Guidelines on AI Tools & Spec-Driven Workflows](https://ethglobal.com/events/mumbai/info/details).

---

## 1. Transparency & Development Methodology

The **Blind Report** protocol was conceptualized, architected, and engineered by the team during the hackathon using a rigorous **Spec-Driven & Test-Driven Development (TDD)** methodology.

AI tools were utilized as an agentic pair-programming assistant to accelerate implementation, verify cryptographic edge cases, and maintain high test coverage across an 8-package monorepo.

### AI Assistance Breakdown

| Layer / Component | Human Contribution | AI Assistance Role | Spec / Artifact Reference |
| :--- | :--- | :--- | :--- |
| **Core Architecture & Threat Model** | Protocol design, partner selection (ENS, Arkiv, World ID), privacy guardrails | Synthesizing formal security models and adversarial scenarios | [`THREAT_MODEL.md`](THREAT_MODEL.md) |
| **ENSv2 Client (`ens-client`)** | Design of text record schemas (`blindreport.pubkey.v1`, `policy`), subname delegation rules | Viem contract call bindings and multicall commit-reveal automation | [`packages/ens-client`](packages/ens-client) |
| **Arkiv Storage (`arkiv-store`)** | Data lifecycle definition, block expiration rules, custody transfer logic | SDK integration (`@arkiv-network/sdk`), Rabdi testnet mapping | [`packages/arkiv-store`](packages/arkiv-store) |
| **World ID Gate (`worldid-gate`)** | Mathematical formulation of action-bound nullifiers (`submit:newsroom:epoch`) | Protocol 4.0 schema validation and staging verifier mock | [`packages/worldid-gate`](packages/worldid-gate) |
| **Libsodium Crypto (`crypto`)** | Choice of X25519 + ChaCha20-Poly1305 and cryptographic salt commitment | Implementation of envelope packing, mailbox derivation, and fast-check property tests | [`packages/crypto`](packages/crypto) |
| **Static Guardrails (`guardrails`)** | RNF-05 policy requirements (zero-log, zero-trackers, strict CSP) | Static AST scanning scripts and pattern enforcement | [`guardrails/check.mjs`](guardrails/check.mjs) |

---

## 2. Test-Driven Verification & Quality Metrics

To ensure the integrity of AI-assisted code, every package was subjected to strict automated verification before inclusion:
- **613 Unit Tests Passing:** Covering all cryptographic boundaries, serialization formats, and error conditions.
- **Contract Boundary Tests:** Verifying authority rules for subnames and rate limits.
- **Network Policy Assertions:** Proving zero telemetry, zero leaks, and strict CSP compliance.
- **Sepolia On-Chain E2E Flow:** Real transactions broadcasted and validated on Ethereum Sepolia testnet.

---

## 3. Direction & Governance Prompts

The engineering process was guided by precise architectural directives:
- *"Enforce strict separation between source identity and submission payload."*
- *"Ensure World ID action strings dynamically incorporate the target newsroom name and the monthly epoch to prevent cross-context tracking."*
- *"Implement Libsodium envelope encryption client-side so the relayer receives only opaque ciphertexts."*
- *"Leverage Arkiv's native block-based retention and custody delegation to provide true right-to-be-forgotten compliance."*
