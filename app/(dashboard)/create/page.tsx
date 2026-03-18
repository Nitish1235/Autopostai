import { CreateWizard } from '@/components/create/CreateWizard'
import { Suspense } from 'react'

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="flex w-full h-[60vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <CreateWizard />
    </Suspense>
  )
}
