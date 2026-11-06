'use client'

import { useState } from 'react'
import { Check, ChevronRight, FileCode, Key, Lock, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react'

export type StoryboardStep = {
  id: number
  title: string
  partner: 'ENSv2' | 'Arkiv' | 'World ID' | 'Libsodium'
  desc: string
  actionHint: string
  codeSnippet: string
}

export const STORYBOARD_STEPS: StoryboardStep[] = [
  {
    id: 1,
    title: '1. Source Submission & Public Key Discovery',
    partner: 'ENSv2',
    desc: 'The whistleblower selects jornal-livre.eth. Blind Report resolves the newsroom public encryption key and policy directly from Sepolia ENS text records.',
    actionHint: 'Click "⚡ 1-Click Load Scenario" in the demo, then "Continue to ZKP Proof".',
    codeSnippet: 'ensClient.resolveNewsroom("jornal-livre.eth") // Returns libsodium public key v1',
  },
  {
    id: 2,
    title: '2. Sybil-Resistant World ID ZKP & Arkiv Custody',
    partner: 'World ID',
    desc: 'World ID generates a zero-knowledge proof of humanity bound to action "submit:jornal-livre.eth:202611". The relayer sponsors gas and stores the encrypted entity on Arkiv with block expiration.',
    actionHint: 'Click "Verify and submit" to generate the ZKP and anchor on Arkiv.',
    codeSnippet: 'gate.admit({ newsroom: "jornal-livre.eth", epoch: 202611, payload: idkitPayload })',
  },
  {
    id: 3,
    title: '3. Editorial Desk Triage & Subname Delegation',
    partner: 'ENSv2',
    desc: 'The journalist connects as reporter.jornal-livre.eth (delegated subname). The journalist decrypts the tip and downloads the evidence using their shared keyring.',
    actionHint: 'Switch role to "⚡ Demo Reporter" or "⚡ Demo Owner" and open "Newsroom Desk".',
    codeSnippet: 'ensAuthority.isAuthorized("reporter.jornal-livre.eth") // Verified on Sepolia',
  },
  {
    id: 4,
    title: '4. Sealed Reply to Ephemeral Anonymous Mailbox',
    partner: 'Arkiv',
    desc: 'The journalist writes an official reply, seals it exclusively for the whistleblower\'s receipt mailbox, and publishes it to Arkiv without ever seeing the source\'s IP or wallet.',
    actionHint: 'In the Newsroom Desk, type a message in "Send Sealed Reply" and click Dispatch.',
    codeSnippet: 'arkivStore.publishReply({ mailboxId, sealed: sealReply(mailboxPub, replyBytes) })',
  },
  {
    id: 5,
    title: '5. Zero-Knowledge Authorship Proof',
    partner: 'Libsodium',
    desc: 'Months later, the whistleblower can prove in court or to an oversight body that they were the original author by revealing their secret salt, mathematically matching the on-chain commitment.',
    actionHint: 'Navigate to "Verify leak", click "Pre-fill with latest submission", and click "Prove Authorship".',
    codeSnippet: 'verifyCommitment(envelope, payload, salt) === true // Mathematical ZK proof',
  },
]

export function JuryStoryboard({
  currentStep = 1,
  onSelectStep,
}: {
  currentStep?: number
  onSelectStep?: (stepId: number) => void
}) {
  const [expandedStep, setExpandedStep] = useState<number>(currentStep)

  return (
    <div className="jury-storyboard" aria-label="Interactive Storyboard for Evaluators">
      <div className="jury-storyboard-header">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <h3 className="font-bold text-sm text-gray-100">Evaluator Storyboard & Partner Prize Checklist</h3>
        </div>
        <span className="text-xs text-gray-400">Target Demo Time: 2:30 min</span>
      </div>

      <div className="jury-steps-list">
        {STORYBOARD_STEPS.map((s) => {
          const isExpanded = expandedStep === s.id
          return (
            <div
              key={s.id}
              className={`jury-step-item ${isExpanded ? 'expanded' : ''}`}
              onClick={() => {
                setExpandedStep(s.id)
                onSelectStep?.(s.id)
              }}
            >
              <div className="jury-step-title-row">
                <span className="jury-step-number">0{s.id}</span>
                <span className="jury-step-name">{s.title}</span>
                <span className={`partner-tag partner-${s.partner.toLowerCase().replace(/[^a-z0-9]/g, '')}`}>
                  {s.partner}
                </span>
              </div>

              {isExpanded && (
                <div className="jury-step-body">
                  <p className="jury-step-desc">{s.desc}</p>
                  <div className="jury-step-hint">
                    <strong>Try it now:</strong> {s.actionHint}
                  </div>
                  <pre className="jury-step-code">
                    <code>{s.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
