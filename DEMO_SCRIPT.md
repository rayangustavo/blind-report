# ETHGlobal Mumbai — 2 to 4 Minute Demo Video Script & Storyboard

> **Official Video Requirements Compliance:**
> - Length: **Strictly between 2:00 and 4:00 minutes** (Target: 3:20).
> - Resolution: **1080p / minimum 720p**.
> - Voiceover: **REAL HUMAN VOICE REQUIRED** (Rule: AI voiceover / TTS is strictly disqualified by ETHGlobal).
> - Intro length: **Under 20 seconds** before showing the live working product.
> - Slides: Maximum **4 bullet points per slide**.

---

## 🎬 Storyboard & Minute-by-Minute Cue Sheet

### ⏱️ 0:00 - 0:18 | The Hook: The Real-World Whistleblower Dilemma
- **Visual:** Title slide / dramatic shot of the app header: *"Blind Report — Zero-Knowledge Whistleblowing for Investigative Journalism"*.
- **Voiceover (Human):**
  > *"Investigative journalists and whistleblowers risk prison and physical danger to expose corruption. But today's leak platforms face a fatal paradox: if they require identity, sources are endangered; if they are open, botnets flood them with spam. And centralized servers leave perpetual forensic trails."*

---

### ⏱️ 0:18 - 0:45 | The Solution: The Holy Trinity of Web3
- **Visual:** Architecture slide showing the 3 partner logos: **ENSv2**, **World ID**, **Arkiv**.
- **Voiceover (Human):**
  > *"Meet Blind Report. We combined three cutting-edge Ethereum technologies to build the first truly censorship-resistant, spam-proof anonymous whistleblowing network:
  > - **ENSv2** as a decentralized PKI for public encryption keys and reporter subnames.
  > - **World ID** for Zero-Knowledge Proof of Humanity that blocks spam with dynamic nullifiers.
  > - And **Arkiv Network** for immutable, block-expiring storage with custody transfer."*

---

### ⏱️ 0:45 - 1:40 | Live Demo: Source Submission & ZKP Proof
- **Visual:** Screen capture of `WEBSITE/` (Next.js 16 Whistleblower Portal at `http://localhost:3000`).
- **Actions:**
  1. Click `⚡ 1-Click Load: "Procurement Corruption" Leak`. The input fills with `jornal-livre.eth`.
  2. Click **Buscar no ENS**. Show the green card resolving public key version 1 and editorial policy from Sepolia ENS text records.
  3. Show the pre-filled report: *"Confidential Leak: Emergency contracts awarded without bidding ($14.2M)"* and the attached CSV file.
  4. Click **Continuar para Prova ZKP**.
  5. Explain the World ID step: Show the action string `submit:jornal-livre.eth:202611`.
  6. Click `⚡ Demonstração Rápida ZKP (Bancada de Jurados)`.
  7. Show the receipt being issued with Arkiv entity key, content hash, and private salt.
- **Voiceover (Human):**
  > *"Watch this live on Sepolia: The source types the newsroom's ENS name. Instantly, Blind Report resolves the newsroom's Libsodium public key and policy directly from on-chain text records—no centralized CA needed.
  > The browser encrypts the report locally using X25519 and ChaCha20-Poly1305.
  > Next, World ID generates a zero-knowledge proof. Notice the action string: it binds the proof strictly to this newsroom and this specific month. This guarantees only one submission per human per month, stopping Sybil spam without ever revealing the source's identity.
  > The relayer sponsors the gas on Arkiv, and the source receives an encrypted local receipt."*

---

### ⏱️ 1:40 - 2:30 | Live Demo: Editorial Triage & Encrypted Mailbox
- **Visual:** Switch view/tab to `WEBSITE/` (Editorial Dashboard at `http://localhost:3000`).
- **Actions:**
  1. Connect wallet as authorized reporter (`reporter.jornal-livre.eth`).
  2. Open Inbox: show the new submission fetched from Arkiv.
  3. Decrypt the report: show the plaintext and downloaded CSV attachment.
  4. Show editorial status annotation signed on Arkiv.
  5. Compose official reply: *"Received and verified. Publishing this Sunday."*
  6. Switch back to `WEBSITE/` -> **Respostas** tab -> paste receipt -> click **Consultar Caixa Postal no Arkiv**.
  7. Show the decrypted reply with verified author `reporter.jornal-livre.eth`.
- **Voiceover (Human):**
  > *"Now over to the newsroom. Connecting with MetaMask, the journalist's authority is validated via their delegated ENS subname: reporter.jornal-livre.eth.
  > The journalist decrypts the confidential report from Arkiv.
  > Notice the storage features: custody was delegated to the newsroom, and the report has a 90-day block expiration.
  > The reporter writes a sealed reply. It is encrypted specifically for the source's ephemeral mailbox and stored on Arkiv.
  > The source opens their receipt, queries Arkiv, and reads the reply. We have achieved two-way anonymous communication without IP tracking!"*

---

### ⏱️ 2:30 - 3:00 | The WOW Factor: Zero-Knowledge Authorship Proof
- **Visual:** Switch to `WEBSITE/` -> **Verificar** tab.
- **Actions:**
  1. Paste the original text, envelope, and secret salt.
  2. Click **Provar autoria**.
  3. Show the green banner: `✔ Autoria comprovada matematicamente: o hash e o sal correspondem ao envelope!`.
- **Voiceover (Human):**
  > *"Here is the ultimate breakthrough: months later, if the whistleblower needs to prove in court or to another newspaper that they were the original source of the leak, they reveal their private cryptographic salt.
  > The system mathematically verifies the commitment hash against Arkiv's immutable record. The source proves authorship beyond doubt without having exposed their identity beforehand!"*

---

### ⏱️ 3:00 - 3:20 | Partner Prizes & Conclusion
- **Visual:** Closing slide with GitHub repo link, test suite badge (613 tests passed), and partner prize checklist:
  - `ENSv2: Decentralized PKI & Subname Delegation`
  - `Arkiv: Block-based Retention & Custody Transfer`
  - `World ID: Protocol 4.0 Sybil-Resistant ZKP`
- **Voiceover (Human):**
  > *"Blind Report is production-ready, protected by strict network guardrails, and backed by over 600 automated tests. By empowering truth with zero-knowledge cryptography, we are building the future of fearless journalism. Thank you!"*

---

## 🎙️ Recording Checklist for the Team

- [ ] Record microphone in a quiet room with zero echo (good USB mic or headset).
- [ ] Record screen at 1080p (1920x1080) at 60fps or 30fps.
- [ ] Keep browser tabs pre-arranged (Tab 1: `http://localhost:3000` [Whistleblower], Tab 2: `http://localhost:3000` [Editorial Desk]).
- [ ] Export video in MP4/WebM with H.264 video codec and AAC audio.
- [ ] Verify exported video duration is between **2:00 and 4:00 minutes** before uploading to Hacker Dashboard.
