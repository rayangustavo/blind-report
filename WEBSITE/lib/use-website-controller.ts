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

export function useWebsiteController(initialDeps?: WebsiteDeps) {
  const controller = useMemo(() => getGlobalWebsiteController(initialDeps), [initialDeps])
  const [state, setState] = useState<WebsiteControllerState>(controller.state)

  useEffect(() => {
    return controller.subscribe((s) => setState({ ...s }))
  }, [controller])

  const filteredReports = useMemo(() => {
    return state.filter === 'Todos os status'
      ? state.reports
      : state.reports.filter((r) => STATUS_LABELS[r.status] === state.filter)
  }, [state.filter, state.reports])

  return {
    state,
    filteredReports,
    controller,
    navigate: controller.navigate,
    startReport: controller.startReport,
    setReportStep: controller.setReportStep,
    selectNewsroom: controller.selectNewsroom,
    selectCategory: controller.selectCategory,
    setMessage: controller.setMessage,
    setFilter: controller.setFilter,
    selectReport: controller.selectReport,
    submitReport: controller.submitReport,
    openEditorialDesk: controller.openEditorialDesk,
    decryptSelectedReport: controller.decryptSelectedReport,
    saveInternalNote: controller.saveInternalNote,
    updateReportStatus: controller.updateReportStatus,
    replyToReport: controller.replyToReport,
    readRepliesWithReceipt: controller.readRepliesWithReceipt,
  }
}
