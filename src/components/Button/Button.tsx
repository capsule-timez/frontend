import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon, type IconName } from '../Icon/Icon'
import './Button.css'

interface ButtonStyleProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'dark'
  size?: 'md' | 'sm'
  fullWidth?: boolean
  icon?: IconName
}

function buttonClassName(
  { variant = 'primary', size = 'md', fullWidth }: ButtonStyleProps,
  className?: string,
) {
  return [
    'btn',
    `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    fullWidth && 'btn--full',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

interface ButtonProps extends ButtonStyleProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

export function Button({
  variant,
  size,
  fullWidth,
  icon,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends ButtonStyleProps, LinkProps {}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  icon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, fullWidth }, className)} {...props}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  )
}
