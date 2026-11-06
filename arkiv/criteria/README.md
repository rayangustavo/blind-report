# Arkiv criteria

This directory documents why the persisted entity model satisfies the project requirements for Arkiv-backed storage on the Rabdi testnet.

## Evidence

- payload remains binary and not base64 encoded in storage
- entities are indexed by newsroom, epoch and category
- retention window approximates the required ~182-day block horizon
- custody transfer is explicit after publication
- nullifier and replay protections remain outside the storage layer
