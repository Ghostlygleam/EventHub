import styles from './EventDetailSkeleton.module.css'

export default function EventDetailSkeleton() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <div className={styles.hero}>
        <div className={styles.pillRow}>
          <span className={styles.pill} />
          <span className={styles.pill} />
        </div>
        <div className={styles.heroBottom}>
          <span className={styles.day} />
          <div className={styles.titleStack}>
            <span className={styles.titleLine} />
            <span className={styles.titleLineShort} />
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.main}>
          <span className={styles.line} />
          <span className={styles.line} />
          <span className={styles.lineShort} />
          <span className={styles.gap} />
          <span className={styles.line} />
          <span className={styles.line} />
          <span className={styles.line} />
          <span className={styles.lineShort} />
        </div>

        <aside className={styles.aside}>
          <span className={styles.asideBlock} />
          <span className={styles.asideBlock} />
          <span className={styles.asideCta} />
        </aside>
      </div>
    </div>
  )
}
