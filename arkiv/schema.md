# Arkiv schema reference

## denuncias

Campos principais:

- newsroom: string, indexed
- epoch: string, indexed
- category: string, indexed
- status: string, indexed
- mailboxId: string, indexed
- createdAt: number
- payload: binary entity data

## resposta

- mailboxId: string, indexed
- authorName: string, optional
- createdAt: number
- payload: encrypted bytes

## anotacao

- submissionKey: string, indexed
- status: string
- notes: string, optional
- updatedAt: number

## persistence criteria

- Entity payloads are stored as raw bytes.
- Retention windows are capped in block time windows around ~182 days.
- Custody transfer occurs to newsroom owner after publication.
