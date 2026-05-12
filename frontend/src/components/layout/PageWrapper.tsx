import type { ReactNode } from 'react'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import styles from './PageWrapper.module.css'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export default function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={styles.root}>
      <Navbar />
      <main className={[styles.main, className].filter(Boolean).join(' ')}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
