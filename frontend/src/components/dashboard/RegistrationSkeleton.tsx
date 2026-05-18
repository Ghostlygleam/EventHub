import styles from './RegistrationSkeleton.module.css'

interface RegistrationSkeletonProps {
  index?: number
}

export default function RegistrationSkeleton({ index = 0 }: RegistrationSkeletonProps) {
  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${index * 70}ms` }}
      role="presentation"
      aria-hidden="true"
    >
      <div className={styles.main}>
        <div className={styles.date} />
        <div className={styles.body}>
          <div className={styles.row} style={{ width: '38%', height: 14 }} />
          <div className={styles.row} style={{ width: '78%', height: 22 }} />
          <div className={styles.row} style={{ width: '52%', height: 12 }} />
          <div className={styles.metaRow}>
            <div className={styles.row} style={{ width: 70, height: 12 }} />
            <div className={styles.row} style={{ width: 110, height: 12 }} />
          </div>
        </div>
      </div>

      <div className={styles.perforation}>
        <span className={styles.notchTop} />
        <span className={styles.perfLine} />
        <span className={styles.notchBottom} />
      </div>

      <div className={styles.stub}>
        <div className={styles.stubBlock} />
      </div>
    </div>
  )
}
