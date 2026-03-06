import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/authOptions'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
