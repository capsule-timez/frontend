import './Logo.css'

interface LogoProps {
  withText?: boolean
}

export function Logo({ withText = true }: LogoProps) {
  return (
    <span className="logo">
      <span className="logo__mark">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7 3h10M7 21h10M8 3v3.5a4 4 0 0 0 1.6 3.2L12 12l-2.4 2.3A4 4 0 0 0 8 17.5V21m8-18v3.5a4 4 0 0 1-1.6 3.2L12 12l2.4 2.3a4 4 0 0 1 1.6 3.2V21"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </span>
      {withText && <span className="logo__text">Cápsula do Tempo</span>}
    </span>
  )
}
