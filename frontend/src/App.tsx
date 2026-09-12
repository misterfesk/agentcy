import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/overlays'
import { AppShell } from '@/components/shell'
import { EntityDetailSheet } from '@/components/inspector'
import { ApiError } from '@/demo/store'
import { CommandCenterPage } from '@/pages/command-center'
import { WorkPage } from '@/pages/work'
import { LeadsPage } from '@/pages/leads'
import { TicketsPage } from '@/pages/tickets'
import { PeoplePage } from '@/pages/people'
import { RunsPage } from '@/pages/runs'
import { ReportsPage } from '@/pages/reports'
import { SettingsPage } from '@/pages/settings'
import { WorkbenchPage } from '@/pages/workbench'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
    },
    mutations: {
      retry: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<CommandCenterPage />} />
              <Route path="/work" element={<WorkPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/people" element={<PeoplePage />} />
              <Route path="/runs" element={<RunsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/workbench" element={<WorkbenchPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
          <EntityDetailSheet />
        </BrowserRouter>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
