import type { HTMLAttributes } from 'react'
import './Card.css'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'li' | 'article' | 'section'
}

export function Card({ as: Tag = 'div', className, ...props }: CardProps) {
  return <Tag className={className ? `card ${className}` : 'card'} {...props} />
}
