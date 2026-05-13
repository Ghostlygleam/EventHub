import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZE } from '@/lib/events'
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  total: number
  onPageChange: (page: number) => void
}

/** Build a windowed page list: 1 … (page-1) page (page+1) … last */
function buildPageList(current: number, last: number): (number | 'ellipsis')[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1)
  }

  const result: (number | 'ellipsis')[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(last - 1, current + 1)

  if (left > 2) result.push('ellipsis')
  for (let i = left; i <= right; i++) result.push(i)
  if (right < last - 1) result.push('ellipsis')

  result.push(last)
  return result
}

export default function Pagination({ page, total, onPageChange }: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (lastPage <= 1) return null

  const pages = buildPageList(page, lastPage)
  const start = (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)

  return (
    <nav className={styles.pagination} aria-label="Events pagination">
      <div className={styles.summary}>
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.step}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>

        {pages.map((item, i) =>
          item === 'ellipsis' ? (
            <span key={`e-${i}`} className={styles.ellipsis}>···</span>
          ) : (
            <button
              key={item}
              type="button"
              className={[styles.page, item === page ? styles.active : ''].join(' ')}
              onClick={() => item !== page && onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Go to page ${item}`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          className={styles.step}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Next page"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  )
}
