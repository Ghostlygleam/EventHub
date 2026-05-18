import styles from './EventSkeleton.module.css'

export default function EventSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.cover} />
      <div className={styles.body}>
        <div className={[styles.line, styles.title1].join(' ')} />
        <div className={[styles.line, styles.title2].join(' ')} />
        <div className={styles.spacer} />
        <div className={[styles.line, styles.metaLine].join(' ')} />
        <div className={[styles.line, styles.metaLineShort].join(' ')} />
      </div>
    </div>
  )
}
