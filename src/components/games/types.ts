import type { ReactNode } from 'react'

export type Page = 'dashboard' | 'collection' | 'watchlist' | 'analytics' | 'settings'

export interface GamePlugin {
  counts: { collection: number; watchlist: number }
  showSearch: boolean
  topbarActions: ReactNode | null
  railActions: ReactNode
  content: ReactNode
  overlays: ReactNode
  closeAll: () => void
}
