'use client'

import { useEffect, useState, useMemo } from 'react'
import { createWebsiteController, type WebsiteControllerState, type WebsiteDeps, STATUS_LABELS } from './website-controller'

// Instância singleton para uso no cliente se não fornecida
let globalController: ReturnType<typeof createWebsiteController> | null = null

export function getGlobalWebsiteController(deps?: WebsiteDeps) {
  if (!globalController) {
    globalController = createWebsiteController(deps)
  }
  return globalController
}

export function resetGlobalWebsiteController() {
  globalController = null
}

export function useWebsiteController(initialDeps?: WebsiteDeps) {
  const controller = useMemo(() => getGlobalWebsiteController(initialDeps), [initialDeps])
  const [state, setState] = useState<WebsiteControllerState>(controller.state)

  useEffect(() => {
    return controller.subscribe((s) => setState({ ...s }))
  }, [controller])

  const filteredReports = useMemo(() => {
    return state.filter === 'All statuses' || state.filter === 'Todos os status'
      ? state.reports
      : state.reports.filter((r) => STATUS_LABELS[r.status] === state.filter)
  }, [state.filter, state.reports])

  return {
    state,
    filteredReports,
    controller,
    navigate: controller.navigate.bind(controller),
    openEditorialDesk: controller.openEditorialDesk.bind(controller),
    startReport: controller.startReport.bind(controller),
    setReportStep: controller.setReportStep.bind(controller),
    selectNewsroom: controller.selectNewsroom.bind(controller),
    selectCategory: controller.selectCategory.bind(controller),
    setMessage: controller.setMessage.bind(controller),
    setAttachment: controller.setAttachment.bind(controller),
    setFilter: controller.setFilter.bind(controller),
    setSearchQuery: controller.setSearchQuery.bind(controller),
    selectReport: controller.selectReport.bind(controller),
    setActiveDeskTab: controller.setActiveDeskTab.bind(controller),
    clearAlerts: controller.clearAlerts.bind(controller),

    // Web3 / Carteira
    connectWallet: controller.connectWallet.bind(controller),
    switchDemoRole: controller.switchDemoRole.bind(controller),
    disconnectWallet: controller.disconnectWallet.bind(controller),

    // Owner (Admin)
    registerNewsroom: controller.registerNewsroom.bind(controller),
    rotateKey: controller.rotateKey.bind(controller),
    exportBackup: controller.exportBackup.bind(controller),
    importBackup: controller.importBackup.bind(controller),
    addJournalist: controller.addJournalist.bind(controller),
    revokeJournalist: controller.revokeJournalist.bind(controller),
    shareKeyring: controller.shareKeyring.bind(controller),
    renewSubmission: controller.renewSubmission.bind(controller),

    // Journalist
    newReaderKey: controller.newReaderKey.bind(controller),
    importSharedKeyring: controller.importSharedKeyring.bind(controller),
    decryptSelectedReport: controller.decryptSelectedReport.bind(controller),
    saveInternalNote: controller.saveInternalNote.bind(controller),
    updateReportStatus: controller.updateReportStatus.bind(controller),
    replyToReport: controller.replyToReport.bind(controller),

    // Whistleblower / Relayer
    submitReport: controller.submitReport.bind(controller),
    readRepliesWithReceipt: controller.readRepliesWithReceipt.bind(controller),
    verifyAuthorship: controller.verifyAuthorship.bind(controller),
    checkRelayerHealth: controller.checkRelayerHealth.bind(controller),
    setRelayerUrl: controller.setRelayerUrl.bind(controller),
  }
}
