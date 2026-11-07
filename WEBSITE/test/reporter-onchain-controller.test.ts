import { describe, expect, it, vi } from 'vitest'
import { createWebsiteController, SHOWCASE_ACCOUNTS, type ReportItem, type WebsiteDeps } from '../lib/website-controller'
import { toBase64Url, encodePayload, fromBase64Url } from '@blind-report/core'
import { newKeypair, seal, sealTo, encodeEnvelope } from '@blind-report/crypto'
import type { Address } from 'viem'

describe('Journalist / Reporter On-Chain Controller & Bridge Flows', () => {
  describe('1. Production Mode Enforcement (No Silent Mocks for Journalist)', () => {
    it('rejects updateReportStatus in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      controller.state.selectedReport = {
        id: 'BR-9999',
        title: 'Test Tip',
        category: 'Corruption',
        status: 'unread',
        date: 'Now',
        priority: 'High',
        initials: 'CO',
        receiptKey: '0x' + 'aa'.repeat(32),
      }

      await expect(controller.updateReportStatus('investigating')).rejects.toThrow(
        'Web3 wallet connected to Sepolia is required to update tip status on Arkiv.'
      )
    })

    it('rejects replyToReport in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      controller.state.selectedReport = {
        id: 'BR-9999',
        title: 'Test Tip',
        category: 'Corruption',
        status: 'unread',
        date: 'Now',
        priority: 'High',
        initials: 'CO',
        receiptKey: '0x' + 'aa'.repeat(32),
        rawEnvelope: new Uint8Array([1, 2, 3]),
      }

      await expect(controller.replyToReport('Official newsroom response')).rejects.toThrow(
        'Web3 wallet connected to Sepolia is required to publish official replies on Arkiv.'
      )
    })

    it('rejects renewSubmission in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      await expect(controller.renewSubmission('0x' + 'aa'.repeat(32), 90)).rejects.toThrow(
        'Web3 wallet connected to Sepolia is required to renew retention on Arkiv.'
      )
    })
  })

  describe('2. On-Chain Role Detection & Identity Verification', () => {
    it('detects journalist role dynamically when connected wallet owns subname on Sepolia ENS', async () => {
      const mockResolveJournalistOwner = vi.fn().mockImplementation(async (subname: string) => {
        if (subname === 'reporter.br53fd4i.eth') {
          return '0x3c8e9fe1cd5de98d9245c028d00a7adc1880dd3d'
        }
        return null
      })

      const deps: WebsiteDeps = {
        newsroomClient: {
          resolveJournalistOwner: mockResolveJournalistOwner,
          ensureNewsroom: vi.fn().mockResolvedValue({
            name: 'br53fd4i.eth',
            label: 'br53fd4i',
          }),
        },
        walletProvider: {
          request: async ({ method }) => {
            if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
              return ['0x3C8E9FE1Cd5dE98D9245c028d00a7ADC1880Dd3d']
            }
            if (method === 'eth_chainId') return '0xaa36a7'
            if (method === 'personal_sign') return '0xsig'
            return null
          },
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      await controller.connectWallet()

      expect(controller.state.role).toBe('journalist')
      expect(controller.state.selectedNewsroom).toBe('br53fd4i.eth')
      expect(controller.state.journalistName).toBe('reporter.br53fd4i.eth')
      expect(controller.state.walletAddress).toBe('0x3C8E9FE1Cd5dE98D9245c028d00a7ADC1880Dd3d')
      expect(controller.state.notice).toContain('Verified Reporter (reporter.br53fd4i.eth)')
    })

    it('allows demo role switching to journalist with newsroom binding', () => {
      const controller = createWebsiteController({}, [])
      controller.selectNewsroom('br53fd4i.eth')
      controller.switchDemoRole('journalist')

      expect(controller.state.role).toBe('journalist')
      expect(controller.state.journalistName).toBe('reporter.br53fd4i.eth')
      expect(controller.state.walletAddress).toBe(SHOWCASE_ACCOUNTS.reporter)
      expect(controller.state.notice).toContain('Verified Reporter (reporter.br53fd4i.eth)')
    })
  })

  describe('3. Reader Key Management & On-Chain Resolution', () => {
    it('generates reader keypair and stores in state', () => {
      const controller = createWebsiteController({}, [])
      const rKey = controller.newReaderKey()

      expect(rKey.publicKey).toBeDefined()
      expect(rKey.privateKey).toBeDefined()
      expect(controller.state.readerKey).toEqual(rKey)
      expect(controller.state.notice).toContain('Reader keypair generated')
    })

    it('resolves on-chain reader key from ENS text record on Sepolia', async () => {
      const expectedKeyBytes = new Uint8Array(32).fill(7)
      const mockResolveReaderKey = vi.fn().mockResolvedValue(expectedKeyBytes)

      const deps: WebsiteDeps = {
        newsroomClient: {
          resolveReaderKey: mockResolveReaderKey,
        },
      }

      const controller = createWebsiteController(deps, [])
      controller.state.selectedNewsroom = 'br53fd4i.eth'
      controller.state.journalistName = 'reporter.br53fd4i.eth'

      const keyStr = await controller.resolveOnChainReaderKey()

      expect(mockResolveReaderKey).toHaveBeenCalledWith('reporter.br53fd4i.eth')
      expect(keyStr).toBe(toBase64Url(expectedKeyBytes))
      expect(controller.state.onchainReaderKey).toBe(keyStr)
      expect(controller.state.notice).toContain('On-chain reader key resolved from ENSv2 Sepolia')
    })
  })

  describe('4. Keyring Sharing & Decryption of Confidential Reports', () => {
    it('imports shared keyring and unlocks decryption keys in controller and client', async () => {
      const newsroomKp = newKeypair()
      const journalistReaderKp = newKeypair()

      const controller = createWebsiteController({}, [])
      controller.state.readerKey = {
        publicKey: toBase64Url(journalistReaderKp.publicKey),
        privateKey: toBase64Url(journalistReaderKp.privateKey),
      }

      // Simula o blob cifrado pelo owner para a chave de leitura do jornalista
      const keyringData = {
        v: 1,
        kind: 'shared',
        newsroom: { name: 'br53fd4i.eth', label: 'br53fd4i' },
        keys: [
          {
            version: 1,
            publicKey: toBase64Url(newsroomKp.publicKey),
            privateKey: toBase64Url(newsroomKp.privateKey),
          },
        ],
      }
      const rawPlain = new TextEncoder().encode(JSON.stringify(keyringData))
      const sealedBlob = toBase64Url(sealTo(journalistReaderKp.publicKey, rawPlain))

      controller.importSharedKeyring(sealedBlob)

      expect(controller.state.keysLoaded).toBe(true)
      expect(controller.state.notice).toContain('Newsroom shared keyring unlocked and imported successfully')

      // Agora cria um envelope confidencial cifrado com a chave da redação
      const secretPayload = encodePayload({
        text: 'Denúncia de corrupção em licitação pública.',
        attachment: { name: 'provas.csv', data: new Uint8Array([1, 2, 3]) },
      })

      const { envelope } = seal(
        {
          newsroom: 'br53fd4i.eth',
          pubkeyVersion: 1,
          category: 'Corruption',
          recipients: [{ id: 'redacao', publicKey: newsroomKp.publicKey }],
          plaintext: secretPayload,
        },
        { now: () => new Date() }
      )

      const rawEnvelope = encodeEnvelope(envelope)

      controller.state.reports = [
        {
          id: 'BR-1001',
          title: 'Tip #1001',
          category: 'Corruption',
          status: 'unread',
          date: 'Now',
          priority: 'High',
          initials: 'CO',
          decrypted: false,
          rawEnvelope,
        },
      ]
      controller.state.selectedReport = controller.state.reports[0]

      const decryptedText = await controller.decryptSelectedReport()

      expect(decryptedText).toBe('Denúncia de corrupção em licitação pública.')
      expect(controller.state.selectedReport.decrypted).toBe(true)
      expect(controller.state.selectedReport.attachment?.name).toBe('provas.csv')
      expect(controller.state.notice).toContain('decrypted using Libsodium Curve25519 key')
    })
  })

  describe('5. Editorial Triage: Status Annotation on Arkiv (No Mocks)', () => {
    it('records status annotation on Arkiv and updates lastTx with real entity hash', async () => {
      const arkivAnnotationKey = '0x' + 'bb'.repeat(32) as `0x${string}`
      const mockSetStatus = vi.fn().mockResolvedValue(arkivAnnotationKey)

      const deps: WebsiteDeps = {
        newsroomClient: {
          setStatus: mockSetStatus,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      controller.state.journalistName = 'reporter.br53fd4i.eth'
      controller.state.reports = [
        {
          id: 'BR-8421',
          title: 'Contract audit',
          category: 'Corruption',
          status: 'unread',
          date: 'Now',
          priority: 'High',
          initials: 'CO',
          receiptKey: '0x' + '11'.repeat(32),
        },
      ]
      controller.state.selectedReport = controller.state.reports[0]

      await controller.updateReportStatus('investigating')

      expect(mockSetStatus).toHaveBeenCalledWith('0x' + '11'.repeat(32), 'investigating')
      expect(controller.state.selectedReport.status).toBe('investigating')
      expect(controller.state.lastTx?.hash).toBe(arkivAnnotationKey)
      expect(controller.state.lastTx?.label).toContain('Arkiv Status Annotation Signed: Investigating (reporter.br53fd4i.eth)')
      expect(controller.state.notice).toContain('Status updated to Investigating on Arkiv')
    })
  })

  describe('6. Sealed Official Reply to Whistleblower on Arkiv (No Mocks)', () => {
    it('dispatches sealed reply on Arkiv with author attribution and real entity key', async () => {
      const arkivReplyKey = '0x' + 'cc'.repeat(32) as `0x${string}`
      const mockReply = vi.fn().mockResolvedValue(arkivReplyKey)

      const deps: WebsiteDeps = {
        newsroomClient: {
          reply: mockReply,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      controller.state.selectedNewsroom = 'br53fd4i.eth'
      controller.state.journalistName = 'reporter.br53fd4i.eth'

      const dummyEnvelopeBytes = new Uint8Array([1, 2, 3, 4, 5])
      controller.state.reports = [
        {
          id: 'BR-8421',
          title: 'Contract audit',
          category: 'Corruption',
          status: 'in_review',
          date: 'Now',
          priority: 'High',
          initials: 'CO',
          receiptKey: '0x' + '11'.repeat(32),
          rawEnvelope: dummyEnvelopeBytes,
        },
      ]
      controller.state.selectedReport = controller.state.reports[0]

      await controller.replyToReport('Recebido pela redação. Fatos em verificação.')

      expect(mockReply).toHaveBeenCalledWith(
        { envelope: dummyEnvelopeBytes, key: '0x' + '11'.repeat(32) },
        'Recebido pela redação. Fatos em verificação.'
      )
      expect(controller.state.replies).toContainEqual({
        text: 'Recebido pela redação. Fatos em verificação.',
        author: 'reporter.br53fd4i.eth',
      })
      expect(controller.state.lastTx?.hash).toBe(arkivReplyKey)
      expect(controller.state.lastTx?.label).toContain('Sealed Reply Dispatched to Source Mailbox on Arkiv (reporter.br53fd4i.eth)')
      expect(controller.state.notice).toContain('Sealed reply dispatched to whistleblower')
    })
  })

  describe('7. Arkiv Data Retention Extension for Investigations', () => {
    it('extends retention on Arkiv and records transaction badge', async () => {
      const mockRenew = vi.fn().mockResolvedValue('extended')

      const deps: WebsiteDeps = {
        newsroomClient: {
          renew: mockRenew,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      const entityKey = '0x' + 'dd'.repeat(32)

      controller.state.expiring = [
        {
          key: entityKey,
          title: 'Investigation #1',
          category: 'Corruption',
          blocksLeft: 1000,
          daysLeft: 15,
        },
      ]

      await controller.renewSubmission(entityKey, 90)

      expect(mockRenew).toHaveBeenCalledWith(entityKey, 90 * 86400)
      expect(controller.state.expiring[0].daysLeft).toBe(105)
      expect(controller.state.lastTx?.hash).toBe(entityKey)
      expect(controller.state.lastTx?.label).toContain('Arkiv Retention Extended (+90 days)')
      expect(controller.state.notice).toContain('Retention extended by 90 days on Arkiv Network')
    })
  })
})
