export default function BrandLogo({ label = 'morrow', logo = '', imageOnly = false, className = '', href = '#top', children }) {
  if (imageOnly && !logo) return null
  return <a className={`brand-logo ${className}`.trim()} href={href} aria-label={`${label} home`}>
    {logo ? <img className="brand-logo-image" src={logo} alt=""/> : imageOnly ? null : <span className="brand-logo-word"><span className="brand-logo-name">{label}</span><span className="brand-logo-dot">.</span></span>}{children}
  </a>
}
