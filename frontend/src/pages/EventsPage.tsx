import { useEffect, useMemo, useState } from 'react'
import PageWrapper from '@/components/layout/PageWrapper'
import {
  EventCard,
  EventFilters,
  EventSkeleton,
  EmptyState,
  ErrorState,
  Pagination,
} from '@/components/events'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useEvents } from '@/hooks/useEvents'
import { PAGE_SIZE, type EventStatus, type EventType } from '@/lib/events'
import styles from './EventsPage.module.css'

export default function EventsPage() {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  const isSearching = searchInput !== debouncedSearch

  const [type, setType] = useState<EventType | null>(null)
  const [status, setStatus] = useState<EventStatus>('upcoming')
  const [page, setPage] = useState(1)

  /* Reset to page 1 whenever a filter changes so the user sees a fresh list. */
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, type, status])

  const query = useMemo(
    () => ({
      event_type: type,
      status,
      search: debouncedSearch,
      page,
    }),
    [type, status, debouncedSearch, page]
  )

  const { data, isLoading, isError, error, refetch, isFetching } = useEvents(query)

  /* Public catalogue: hide unpublished events (the backend includes the caller's
     own drafts for organisers, which is useful on the desk but noise here). */
  const events = (data?.events ?? []).filter((e) => e.is_published)
  const total = events.length
  const hasActiveFilters = type !== null || debouncedSearch.trim().length > 0 || status !== 'upcoming'

  const resetFilters = () => {
    setSearchInput('')
    setType(null)
    setStatus('upcoming')
    setPage(1)
  }

  /* Show a friendly chip with upcoming-events count when we have data. */
  const liveCount = status === 'upcoming' && !debouncedSearch && type === null ? total : null

  return (
    <PageWrapper>
      <div className={styles.page}>
        <div className={styles.bg}>
          <div className={[styles.blob, styles.blob1].join(' ')} />
          <div className={[styles.blob, styles.blob2].join(' ')} />
          <div className={[styles.blob, styles.blob3].join(' ')} />
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.overline}>DMUK · EventHub</span>
              <h1 className={styles.title}>
                What's <em>happening</em> on campus
              </h1>
              <p className={styles.subtitle}>
                Lectures, club nights, workshops — every gathering at De Montfort University Kazakhstan,
                in one place. Pick what interests you and grab your seat.
              </p>
            </div>

            <div className={styles.headerRight}>
              <span className={styles.statChip}>
                <span className={styles.statDot} aria-hidden="true" />
                <span className={styles.statLabel}>
                  {liveCount != null ? (
                    <>
                      <strong>{liveCount}</strong> upcoming {liveCount === 1 ? 'event' : 'events'}
                    </>
                  ) : (
                    <>Live feed</>
                  )}
                </span>
              </span>
            </div>
          </header>

          <div className={styles.toolbarWrap}>
            <EventFilters
              search={searchInput}
              onSearchChange={setSearchInput}
              isSearching={isSearching}
              type={type}
              onTypeChange={setType}
              status={status}
              onStatusChange={setStatus}
            />
          </div>

          <div className={styles.gridShell}>
            {isError ? (
              <ErrorState error={error as Error | null} onRetry={() => refetch()} />
            ) : isLoading ? (
              <div className={styles.grid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <EventSkeleton key={i} />
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                onReset={hasActiveFilters ? resetFilters : undefined}
                resetLabel="Clear filters"
                title={
                  debouncedSearch
                    ? `No matches for "${debouncedSearch}"`
                    : status === 'past'
                      ? 'No past events yet'
                      : 'Nothing on the agenda'
                }
                message={
                  hasActiveFilters
                    ? 'Try a different category, drop the search query, or check back soon.'
                    : 'New events will appear here as soon as organisers publish them.'
                }
              />
            ) : (
              <div className={[styles.grid, isFetching ? styles.gridFetching : ''].join(' ')}>
                {events.map((evt, i) => (
                  <EventCard key={evt.id} event={evt} index={i} />
                ))}
              </div>
            )}

            <p className={styles.sr} aria-live="polite">
              {isLoading
                ? 'Loading events'
                : isError
                  ? 'Failed to load events'
                  : `Showing ${events.length} of ${total} events on page ${page} of ${Math.max(1, Math.ceil(total / PAGE_SIZE))}`}
            </p>

            {!isError && !isLoading && events.length > 0 && (
              <Pagination page={page} total={total} onPageChange={setPage} />
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
