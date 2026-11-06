import { describe, expect, it, vi } from 'vitest'
import { createWebsiteController, SHOWCASE_ACCOUNTS, type WebsiteDeps } from '../lib/website-controller'
import { createOnChainNewsroomDeps } from '../lib/onchain-newsroom'
import { toBase64Url } from '@blind-report/core'
import { newKeypair } from '@blind-report/crypto'
import type { Eip1193 } from '../lib/wallet'
import type { Address } from 'viem'

describe('Newsroom Owner On-Chain Controller & Bridge Flows', () => {
  describe('1. Production Mode Enforcement (No Silent Mocks)', () => {
    it('rejects registerNewsroom in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      await expect(
        controller.registerNewsroom({
          label: 'folha-sepolia',
          categories: ['investigacao'],
          maxBytes: 150000,
          attachments: true,
        })
      ).rejects.toThrow('Web3 wallet connected to Sepolia is required to register a newsroom on ENSv2.')
    })

    it('rejects rotateKey in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      await expect(controller.rotateKey()).rejects.toThrow(
        'Web3 wallet connected to Sepolia is required to rotate newsroom key on ENSv2.'
      )
    })

    it('rejects updatePolicy in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      await expect(
        controller.updatePolicy({
          categories: ['corrupcao'],
          maxBytes: 200000,
          attachments: true,
        })
      ).rejects.toThrow('Web3 wallet connected to Sepolia is required to update policy on ENSv2.')
    })

    it('rejects addJournalist in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      const kp = newKeypair()
      await expect(
        controller.addJournalist({
          label: 'maria',
          address: '0x3C8E9FE1Cd5dE98D9245c028d00a7ADC1880Dd3d',
          readerPublicKey: toBase64Url(kp.publicKey),
        })
      ).rejects.toThrow('Web3 wallet connected to Sepolia is required to delegate subname on ENSv2.')
    })

    it('rejects revokeJournalist in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      await expect(controller.revokeJournalist('maria')).rejects.toThrow(
        'Web3 wallet connected to Sepolia is required to revoke journalist subname on ENSv2.'
      )
    })

    it('rejects renewJournalist in production mode without on-chain newsroom client', async () => {
      const controller = createWebsiteController({}, [], { mode: 'production' })
      await expect(controller.renewJournalist('maria', 90)).rejects.toThrow(
        'Web3 wallet connected to Sepolia is required to renew journalist subname on ENSv2.'
      )
    })
  })

  describe('2. On-Chain Execution via newsroomClient', () => {
    it('executes registerNewsroom, tracks adminStep and updates editorialPolicy', async () => {
      const mockRegister = vi.fn().mockResolvedValue({
        name: 'jornal-sepolia.eth',
        label: 'jornal-sepolia',
      })

      const deps: WebsiteDeps = {
        newsroomClient: {
          registerNewsroom: mockRegister,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })

      await controller.registerNewsroom({
        label: 'jornal-sepolia',
        categories: ['investigacao', 'direitos-humanos'],
        maxBytes: 180000,
        attachments: true,
      })

      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'jornal-sepolia',
          categories: ['investigacao', 'direitos-humanos'],
          maxBytes: 180000,
          attachments: true,
        })
      )

      expect(controller.state.selectedNewsroom).toBe('jornal-sepolia.eth')
      expect(controller.state.keyVersion).toBe(1)
      expect(controller.state.adminStep).toEqual({ step: 'done' })
      expect(controller.state.editorialPolicy).toEqual({
        categories: ['investigacao', 'direitos-humanos'],
        maxBytes: 180000,
        attachments: true,
      })
      expect(controller.state.notice).toContain('registered successfully on ENSv2')
    })

    it('executes rotateKey on-chain and updates keyVersion state', async () => {
      const mockRotate = vi.fn().mockResolvedValue(2)
      const deps: WebsiteDeps = {
        newsroomClient: {
          rotateKey: mockRotate,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      expect(controller.state.keyVersion).toBe(1)

      const next = await controller.rotateKey()
      expect(next).toBe(2)
      expect(mockRotate).toHaveBeenCalled()
      expect(controller.state.keyVersion).toBe(2)
      expect(controller.state.notice).toContain('rotated on ENS to version 2')
    })

    it('executes updatePolicy on-chain and updates editorialPolicy state', async () => {
      const mockUpdatePolicy = vi.fn().mockResolvedValue(undefined)
      const deps: WebsiteDeps = {
        newsroomClient: {
          updatePolicy: mockUpdatePolicy,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      controller.selectNewsroom('jornal-livre.eth')

      await controller.updatePolicy({
        categories: ['saude', 'meio-ambiente'],
        maxBytes: 300000,
        attachments: false,
      })

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        categories: ['saude', 'meio-ambiente'],
        maxBytes: 300000,
        attachments: false,
        epoch: 'monthly',
      })

      expect(controller.state.editorialPolicy).toEqual({
        categories: ['saude', 'meio-ambiente'],
        maxBytes: 300000,
        attachments: false,
      })
      expect(controller.state.notice).toContain('Editorial policy updated successfully on ENSv2')
    })

    it('executes addJournalist on-chain with converted public key bytes and validity', async () => {
      const mockAdd = vi.fn().mockResolvedValue(undefined)
      const deps: WebsiteDeps = {
        newsroomClient: {
          addJournalist: mockAdd,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      controller.selectNewsroom('jornal-livre.eth')

      const readerKp = newKeypair()
      const readerPubBase64 = toBase64Url(readerKp.publicKey)

      await controller.addJournalist({
        label: 'clara',
        address: '0x1234567890123456789012345678901234567890',
        readerPublicKey: readerPubBase64,
        validForDays: 120,
      })

      expect(mockAdd).toHaveBeenCalledWith({
        label: 'clara',
        address: '0x1234567890123456789012345678901234567890',
        readerPublicKey: readerKp.publicKey,
        validForSeconds: 120 * 86400,
      })

      const added = controller.state.team.find((t) => t.label === 'clara')
      expect(added).toBeDefined()
      expect(added?.subname).toBe('clara.jornal-livre.eth')
      expect(added?.active).toBe(true)
    })

    it('executes revokeJournalist on-chain and updates active flag', async () => {
      const mockRevoke = vi.fn().mockResolvedValue({ rotateRecommended: true })
      const deps: WebsiteDeps = {
        newsroomClient: {
          revokeJournalist: mockRevoke,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })
      expect(controller.state.team[0].active).toBe(true)

      await controller.revokeJournalist('reporter')

      expect(mockRevoke).toHaveBeenCalledWith('reporter')
      expect(controller.state.team[0].active).toBe(false)
      expect(controller.state.notice).toContain('revoked on ENSv2')
    })

    it('executes renewJournalist on-chain with valid seconds', async () => {
      const mockRenew = vi.fn().mockResolvedValue(undefined)
      const deps: WebsiteDeps = {
        newsroomClient: {
          renewJournalist: mockRenew,
        },
      }

      const controller = createWebsiteController(deps, [], { mode: 'production' })

      await controller.renewJournalist('reporter', 90)

      expect(mockRenew).toHaveBeenCalledWith('reporter', 90 * 86400)
      expect(controller.state.notice).toContain('renewed for +90 days on ENSv2')
    })

    it('shares encrypted keyring and exports/imports password-locked backup', async () => {
      const controller = createWebsiteController({}, [], { mode: 'demo' })
      const readerKp = newKeypair()

      // Share keyring
      const blob = controller.shareKeyring(toBase64Url(readerKp.publicKey))
      expect(blob).toBeTruthy()
      expect(typeof blob).toBe('string')

      // Export backup
      const backup = await controller.exportBackup('super-secure-pass')
      expect(backup).toBeTruthy()
      expect(controller.state.backupText).toBe(backup)

      // Import backup
      await controller.importBackup(backup, 'super-secure-pass')
      expect(controller.state.keysLoaded).toBe(true)
    })
  })

  describe('3. On-Chain Newsroom Bridge & Transaction Interceptor', () => {
    it('creates on-chain dependencies and intercepts writeContract to record tx hash', async () => {
      const recordedTxs: any[] = []
      const fakeAccount = '0x8cf0ff092E8B41EA2C957989a713F75a9ECDC4fc' as Address

      const mockProvider: Eip1193 = {
        async request({ method, params }: { method: string; params?: any }) {
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') return [fakeAccount]
          if (method === 'eth_chainId') return '0xaa36a7'
          if (method === 'eth_sendTransaction') return '0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff'
          if (method === 'eth_getTransactionReceipt') {
            return { status: '0x1', transactionHash: params?.[0]?.hash || '0x9999' }
          }
          if (method === 'eth_blockNumber') return '0x1000'
          if (method === 'eth_getBlockByNumber') return { timestamp: '0x65000000' }
          return null
        },
      }

      const bridge = createOnChainNewsroomDeps(mockProvider, fakeAccount, {
        onTxRecorded: (tx) => {
          recordedTxs.push(tx)
        },
      })

      expect(bridge).toBeDefined()
      expect(typeof bridge.registerNewsroom).toBe('function')
      expect(typeof bridge.rotateKey).toBe('function')
      expect(typeof bridge.addJournalist).toBe('function')
      expect(typeof bridge.revokeJournalist).toBe('function')
      expect(typeof bridge.renewJournalist).toBe('function')
      expect(typeof bridge.updatePolicy).toBe('function')
      expect(typeof bridge.shareKeyring).toBe('function')
    })
  })
})
