'use client'

import { toast } from 'sonner'

export function ContinueToConfigButton() {
  return (
    <button
      type="button"
      onClick={() => toast.info('Council configuration coming in step 5.')}
      className="rounded-full bg-accent-copper text-white px-6 py-2.5 text-sm font-sans font-medium hover:opacity-90 transition-opacity duration-150"
    >
      Continue → Configure council
    </button>
  )
}
