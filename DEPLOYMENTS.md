# Blind Report — Testnet Deployments & Verifiable On-Chain Artifacts

> **Ethereum Sepolia & Arkiv Rabdi Testnet Reference**  
> **ETHGlobal Mumbai Showcase Submission**

---

## 1. Ethereum Sepolia (Chain ID: 11155111)

### Official ENSv2 Contracts on Sepolia
The project interacts with official ENSv2 infrastructure contracts deployed on Ethereum Sepolia:

| Contract | Address | Purpose |
| :--- | :--- | :--- |
| **ENS Registry** | [`0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`](https://sepolia.etherscan.io/address/0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e) | Root name and resolver registry |
| **Universal Resolver** | [`0x8FADE66B79cC9f707aB26799354482EB93a5B7dD`](https://sepolia.etherscan.io/address/0x8FADE66B79cC9f707aB26799354482EB93a5B7dD) | Multicall name and record resolution |
| **Public Resolver** | [`0x1da022710dF50023FB37746df8d30ac7ea971169`](https://sepolia.etherscan.io/address/0x1da022710dF50023FB37746df8d30ac7ea971169) | Text record store and profile data |
| **NameWrapper** | [`0x0635513f179D50A207757E05759Cb1f12E45371b`](https://sepolia.etherscan.io/address/0x0635513f179D50A207757E05759Cb1f12E45371b) | ERC-1155 subname minting and authority management |

### Showcase Test Accounts (Sepolia Testnet)
- **Newsroom Owner (Deployer):** `0x8cf0ff092E8B41EA2C957989a713F75a9ECDC4fc`  
  [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x8cf0ff092E8B41EA2C957989a713F75a9ECDC4fc)
- **Authorized Reporter:** `0x3C8E9FE1Cd5dE98D9245c028d00a7ADC1880Dd3d`  
  [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x3C8E9FE1Cd5dE98D9245c028d00a7ADC1880Dd3d)
- **Sponsoring Relayer:** `0x77DD7d6DaA32DF7F34FEbd0eaeBD6B1a1c9a1D8F`  
  [View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x77DD7d6DaA32DF7F34FEbd0eaeBD6B1a1c9a1D8F)

---

## 2. Arkiv Network (Rabdi Testnet)

- **Network Name:** Rabdi Testnet
- **RPC URL:** `https://rpc.rabdi.db-chain.testnet.arkiv.network`
- **Explorer:** [Arkiv Rabdi Explorer](https://rabdi.explorer.arkiv.network)
- **Integration Library:** `@arkiv-network/sdk` (v1.0.0)
- **Features Demonstrated:**
  - `publishSubmission`: Entity storage with block expiration and custody transfer.
  - `extendRetention`: Renewal of active investigation documents.
  - `publishReply`: Encrypted anonymous return communication channel.

---

## 3. World ID (Protocol 4.0 Staging)

- **App ID:** `app_4042c24254a33097907e995869d6e132`
- **RP ID:** `rp_4847560e061aacf6`
- **Environment:** Staging / Simulator
- **ZKP Action Specification:** Dynamic string binding: `submit:<newsroomName>:<epoch>` (e.g., `submit:jornal-livre.eth:202611`).
- **Nullifier Hash:** 248-bit deterministic unique value preventing duplicate monthly submissions per human.

---

## 4. How to Verify On-Chain Execution

To execute the live protocol flow from scratch transmitting fresh transactions on Sepolia:

```bash
# Execute the live Sepolia script (requires funded OWNER account in .env)
npm run test:sepolia:flow
```
