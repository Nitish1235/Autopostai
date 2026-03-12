import { DashboardShell } from '@/components/dashboard/DashboardShell'


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return <DashboardShell>{children}</DashboardShell>
}
