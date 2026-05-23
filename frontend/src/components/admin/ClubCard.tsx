import { type CSSProperties } from 'react'
import { Pencil, Ban, Calendar, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  clubInitials,
  clubSerial,
  deriveClubAccent,
  type Club,
} from '@/lib/clubs'
import StatusDot from './StatusDot'
import styles from './ClubCard.module.css'

interface ClubCardProps {
  club: Club
  index?: number
  onEdit: (club: Club) => void
  onDisband: (club: Club) => void
}

export default function ClubCard({ club, index = 0, onEdit, onDisband }: ClubCardProps) {
  const accent = deriveClubAccent(club.id)
  const serial = clubSerial(club.id)
  const initials = clubInitials(club.name)

  const style: CSSProperties & Record<'--club-accent', string> = {
    ['--club-accent']: accent,
    animationDelay: `${Math.min(index, 11) * 55}ms`,
  }

  const canDisband = club.is_active

  return (
    <article
      className={cn(styles.card, !club.is_active && styles.cardInactive)}
      style={style}
    >
      {/* Accent rail on the left edge */}
      <span className={styles.accentRail} aria-hidden="true" />

      {/* ─── HEAD ─── */}
      <header className={styles.head}>
        <span className={styles.kicker}>N° {serial}</span>
        <StatusDot
          variant={club.is_active ? 'active' : 'inactive'}
          pulse={club.is_active}
          label={club.is_active ? 'ACTIVE' : 'DISBANDED'}
          size="sm"
        />
      </header>

      {/* ─── BODY ─── */}
      <div className={styles.body}>
        <h3 className={styles.name}>{club.name}</h3>
        {club.description ? (
          <p className={styles.description}>{club.description}</p>
        ) : (
          <p className={cn(styles.description, styles.descriptionEmpty)}>
            <em>No description on file.</em>
          </p>
        )}
      </div>

      {/* ─── META ROW ─── */}
      <div className={styles.meta}>
        <span className={styles.ownerChip}>
          <span className={styles.ownerAvatar} aria-hidden="true">{initials}</span>
          <span className={styles.ownerText}>
            <span className={styles.ownerLabel}>OWNER</span>
            <span className={styles.ownerEmail}>{club.owner_email ?? '— unassigned —'}</span>
          </span>
        </span>

        <span className={styles.eventsChip}>
          <Calendar size={12} strokeWidth={2.4} />
          <strong>{club.events_count}</strong>
          <span>{club.events_count === 1 ? 'event' : 'events'}</span>
        </span>
      </div>

      {/* ─── ACTIONS ─── */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.editBtn}
          onClick={() => onEdit(club)}
        >
          <Pencil size={12} strokeWidth={2.4} />
          <span>Amend</span>
        </button>

        {canDisband ? (
          <button
            type="button"
            className={styles.disbandBtn}
            onClick={() => onDisband(club)}
          >
            <Ban size={12} strokeWidth={2.4} />
            <span>Disband</span>
          </button>
        ) : (
          <span className={styles.disbandedTag}>
            <ShieldOff size={12} strokeWidth={2.4} />
            Disbanded
          </span>
        )}
      </div>
    </article>
  )
}
