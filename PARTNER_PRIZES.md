# ETHGlobal Mumbai — Partner Prizes Showcase (Blind Report)

> Este documento detalha como o **Blind Report** integra e coloca em evidência as tecnologias dos **3 Partner Prizes** selecionados no [ETHGlobal Mumbai](https://ethglobal.com/events/mumbai): **ENS (Ethereum Name Service)**, **Arkiv Network** e **World ID (Worldcoin)**.

---

## 🏆 Resumo das Tecnologias Selecionadas

| Patrocinador | Trilha / Prêmio | Papel no Blind Report | Pacote no Monorepo |
| :--- | :--- | :--- | :--- |
| **ENS** | Best Use of ENS / ENSv2 Identity | Descoberta descentralizada de chaves públicas, políticas editoriais e subnomes delegados (`repórter.redacao.eth`) | [`packages/ens-client`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/ens-client) |
| **Arkiv** | Decentralized Storage & Data Lifecycle | Armazenamento imutável de envelopes cifrados, ciclo de vida com expiração programada, custódia transferida e caixa postal de respostas | [`packages/arkiv-store`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/arkiv-store) |
| **World ID** | Best Use of World ID / Proof of Humanity | Prevenção de ataques Sybil e spam através de ZKP (Zero-Knowledge Proof) e nullifiers por época sem revelar identidade civil | [`packages/worldid-gate`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/worldid-gate) |

---

## 1. Ethereum Name Service (ENSv2)

### O Problema Resolvido
Em sistemas tradicionais de denúncia, a fonte precisa confiar cegamente em certificados TLS emitidos por autoridades centralizadas (PKI tradicional) ou em links web que podem sofrer interceptação ou ataques de DNS spoofing. Além disso, redações jornalísticas têm repórteres que entram e saem de investigações e precisam assinar comunicações oficiais com credibilidade sem depender de contas multisig lentas ou senhas compartilhadas.

### Como o ENS é Utilizado
O Blind Report utiliza o ENS como uma **Infraestrutura Pública de Chaves Criptográficas (PKI Descentralizada)**:

1. **Descoberta da Redação**: Qualquer cidadão ou fonte digita o nome ENS da redação (ex: `jornal-livre.eth`). O cliente consulta o resolver oficial do ENS na rede Sepolia (`0x8FADE66B79cC9f707aB26799354482EB93a5B7dD`).
2. **Text Records Criptográficos**:
   - `blindreport.pubkey.v1`: Chave pública primária de cifragem assimétrica (Libsodium Curve25519) da redação.
   - `blindreport.policy`: Objeto JSON com as categorias editoriais aceitas, tamanho máximo em bytes e suporte a anexos.
3. **Subnomes Delegados de Repórteres**:
   - Repórteres recebem subnomes oficiais (ex: `reporter.jornal-livre.eth`) cunhados pelo NameWrapper (`mintSubname`).
   - Respostas da redação à fonte anônima são assinadas pelo repórter portador do subnome, e a fonte verifica matematicamente se o emissor tem autoridade delegada pela redação consultando o ENS.

### Arquivos Principais de Implementação
- [`packages/ens-client/src/reader.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/ens-client/src/reader.ts): Resolução de nomes, cache em memória e leitura de text records.
- [`packages/ens-client/src/records.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/ens-client/src/records.ts): Serialização, validação estrita e tipagem de políticas e chaves em text records.
- [`packages/ens-client/src/authority.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/ens-client/src/authority.ts): Verificação de linhagem e autoridade de subnomes delegados.
- [`packages/ens-client/src/admin.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/ens-client/src/admin.ts): Registro de redação, delegação de subnomes e atualização de registros via carteira.

### Feedback para o Time do ENS
A capacidade de usar text records estruturados combinada com subnomes delegados transforma o ENS de um mero "redirecionador de carteiras" em um diretório criptográfico de confiança descentralizada de altíssimo valor para direitos civis e jornalismo investigativo.

---

## 2. Arkiv Network

### O Problema Resolvido
Plataformas como IPFS comum não oferecem garantias determinísticas de ciclo de vida (retenção programada), pagamento de taxas por terceiros com custódia delegada nem consultas flexíveis por atributos estruturados sem indexadores centralizados proprietários.

### Como a Arkiv é Utilizada
O Blind Report integra o `@arkiv-network/sdk` no core de persistência de dados sensíveis:

1. **Publicação com Custódia Transferida**:
   - Para proteger o IP e endereço da fonte, o **Relayer** recebe o envelope já cifrado, paga a taxa de gravação no nó Arkiv e registra a entidade transferindo a custódia (`custodian`) para o endereço Ethereum da redação jornalística.
2. **Ciclo de Vida & Expiração por Blocos**:
   - Denúncias têm período de retenção predeterminado (ex: 90 dias / ~648.000 blocos).
   - O painel editorial permite que os jornalistas estendam o período de retenção de denúncias ativas via `store.extendRetention` diretamente pela interface.
3. **Caixa Postal Anônima (Replies)**:
   - Respostas da redação para a fonte são seladas para a chave efêmera do mailbox da fonte e gravadas no Arkiv com a tag `type=reply` e `mailbox=<id>`. A fonte consulta o Arkiv usando apenas o seu recibo local.
4. **Consultas Estruturadas**:
   - `listSubmissions`: Filtra entidades por redação, categoria e status editorial sem requerer indexador offchain proprietário.

### Arquivos Principais de Implementação
- [`packages/arkiv-store/src/store.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/arkiv-store/src/store.ts): Implementação do store com paginação, anotações de status, caixa postal e renovação.
- [`packages/arkiv-store/src/sdk-backend.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/arkiv-store/src/sdk-backend.ts): Conexão direta com nós Arkiv via `@arkiv-network/sdk` e chain Rabdi.
- [`packages/arkiv-store/src/constants.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/arkiv-store/src/constants.ts): Mapeamento de tags, tipos de entidades e regras de ciclo de vida.

### Feedback para o Time da Arkiv
O modelo de retenção temporária nativa com expiração por bloco e transferência de custódia é uma funcionalidade espetacular para compliance de privacidade (ex: LGPD/GDPR - direito ao esquecimento), garantindo que dados confidenciais não fiquem órfãos eternamente na rede caso a redação decida descartá-los.

---

## 3. World ID (Worldcoin)

### O Problema Resolvido
Canais de denúncia sofrem de dois males opostos: se exigem login ou identificação da fonte, geram medo de perseguição de Estado ou retaliação física; se forem totalmente abertos, são bombardeados por robôs com terabytes de lixo e ataques Sybil que inviabilizam a triagem jornalística.

### Como o World ID é Utilizado
O Blind Report implementa a verificação de **Prova de Humanidade com Conhecimento Zero (ZKP)** utilizando o Protocolo 4.0 do World ID:

1. **Ação Dinâmica Vinculada**:
   - A prova ZKP é gerada com o parâmetro `action` estritamente amarrado à redação e ao período mensal atual:
     $$\text{action} = \text{"submit:"} + \text{newsroomName} + \text{":"} + \text{epoch}$$
     Exemplo: `submit:jornal-livre.eth:202611`.
2. **Garantia Anti-Sybil (Nullifier)**:
   - Para cada ação, o World ID gera um **Nullifier Hash** determinístico e único para aquela pessoa humana, mas que **não permite correlação** entre ações diferentes nem revela a identidade real do usuário.
   - O `worldid-gate` no Relayer armazena o nullifier durante aquela época. Se a mesma pessoa tentar enviar uma segunda denúncia para a mesma redação no mesmo mês, o envio é barrado matematicamente com `409 Conflict (SYBIL_ATTACK_DETECTED)`.
   - Na mudança de mês (`epoch`), uma nova ação é gerada, permitindo um novo envio legítimo sem histórico de ligação.
3. **Privacidade Absoluta**:
   - Nem o Relayer, nem a Redação, nem a Worldcoin sabem qual pessoa física realizou a denúncia. Apenas é provado matematicamente que ela é um ser humano único.

### Arquivos Principais de Implementação
- [`packages/worldid-gate/src/gate.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/worldid-gate/src/gate.ts): Mecanismo de admissão de provas, amarração de ação e persistência de nullifiers.
- [`packages/worldid-gate/src/verifier.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/worldid-gate/src/verifier.ts): Verificador de provas ZKP compatível com o protocolo World ID v4.
- [`packages/core/src/epoch.ts`](file:///l/disk0/rayang/devcon8/ethglobal/project/blind-report/packages/core/src/epoch.ts): Cálculo determinístico de épocas e amarrações de ação.

### Feedback para o Time da Worldcoin
O World ID é a peça-chave que torna o jornalismo investigativo anônimo viável contra spam. A separação por `action` permite uma barreira de proteção elegante sem criar pegada de dados persistente.

---

## 🚀 Como Avaliar e Testar em 1 Minuto

### 1. Testes Automatizados Dedicados aos Parceiros
Execute a suíte de testes que avalia os critérios de cada patrocinador:
```bash
npm run test:partners
```

### 2. Demonstração Interativa do Protocolo Completo no Terminal
Execute o fluxo de ponta a ponta com callouts coloridos destacando os 3 parceiros:
```bash
npm run demo
```

### 3. Interface Web com Inspetor de Parceiros
Inicie o ambiente local:
```bash
npm run dev:all
```
- Acesse `http://localhost:5173` para o portal da fonte anônima (com ribbon e cards de ENS, World ID e Arkiv).
- Acesse `http://localhost:5174` para o painel editorial dos jornalistas (com gerenciamento de custódia Arkiv e subnomes ENS).
