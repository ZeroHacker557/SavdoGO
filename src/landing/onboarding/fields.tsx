import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'

type FieldProps = {
  label: string
  optional?: boolean
  hint?: ReactNode
  error?: string | null
  full?: boolean
  children: ReactNode
}

export function Field({ label, optional, hint, error, full, children }: FieldProps) {
  return (
    <label className={`wz-field${full ? ' wz-grid--full' : ''}`}>
      <span className="wz-field__label">
        {label}
        {optional && <em>ixtiyoriy</em>}
      </span>
      {children}
      {error ? (
        <span className="wz-error"><AlertCircle size={14} /> {error}</span>
      ) : hint ? (
        <span className="wz-hint">{hint}</span>
      ) : null}
    </label>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon
  invalid?: boolean
  suffix?: ReactNode
}

export function Input({ icon: Icon, invalid, suffix, className = '', ...rest }: InputProps) {
  return (
    <span className="wz-input-wrap">
      {Icon && <Icon size={18} />}
      <input className={`wz-input${invalid ? ' is-invalid' : ''} ${className}`} {...rest} />
      {suffix && <span className="wz-input-suffix">{suffix}</span>}
    </span>
  )
}

type ToggleProps = {
  icon: LucideIcon
  title: string
  text: string
  on: boolean
  onChange: (next: boolean) => void
}

export function Toggle({ icon: Icon, title, text, on, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`wz-toggle${on ? ' is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="wz-toggle__icon"><Icon size={20} /></span>
      <span className="wz-toggle__text">
        <b>{title}</b>
        <small>{text}</small>
      </span>
      <span className="wz-switch" aria-hidden="true" />
    </button>
  )
}
