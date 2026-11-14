import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('scrollbar-thin w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-slate-50/70">
      <tr>{children}</tr>
    </thead>
  )
}

export function TH({
  children,
  className,
  align = 'left',
}: {
  children?: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-slate-500 uppercase',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}

export function TR({
  children,
  onClick,
  className,
  selected,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  selected?: boolean
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-brand-50/40',
        selected && 'bg-brand-50/60',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function TD({
  children,
  className,
  align = 'left',
  colSpan,
}: {
  children?: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 py-3 align-middle text-[13px] text-slate-600',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  )
}
