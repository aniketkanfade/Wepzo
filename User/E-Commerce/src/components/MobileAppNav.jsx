import { useState } from 'react'

const navItems = [
  ['For You', 'home', <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></>],
  ['Categories', 'categories', <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>],
  ['Cart', 'cart', <><path d="M3 4h2l2.2 11h11.4L21 8H6"/><circle cx="9" cy="19" r="1"/><circle cx="18" cy="19" r="1"/></>],
  ['Profile', 'profile', <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>],
]

export default function MobileAppNav({ activePage, selectedModule, modules = [], cartCount, onHome, onCategories, onSelectModule, onCart, onProfile, showCategories, showCart, showProfile }) {
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)
  const actions = { home: onHome, categories: onCategories, cart: onCart, profile: onProfile }
  const enabled = { home: true, categories: showCategories, cart: showCart, profile: showProfile }
  return <nav className="mobile-app-nav" aria-label="Mobile app navigation">
    {navItems.filter(([, key]) => enabled[key]).map(([label, key, icon]) => {
      const active = key === 'home' ? activePage === 'home' && !selectedModule : key === 'categories' ? Boolean(selectedModule) : activePage === key
      const badge = key === 'cart' ? cartCount : 0
      const action = key === 'categories' && modules.length > 1 ? () => setCategoryMenuOpen(true) : actions[key]
      return <button type="button" key={key} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={action}>
        <span className="mobile-app-nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>{badge > 0 && <i>{badge}</i>}</span>
        <span>{label}</span>
      </button>
    })}
    {categoryMenuOpen && <div className="mobile-category-picker" onMouseDown={event => { if (event.target === event.currentTarget) setCategoryMenuOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-label="Choose a category">
        <header><strong>Shop by category</strong><button type="button" aria-label="Close categories" onClick={() => setCategoryMenuOpen(false)}>×</button></header>
        {modules.map(module => <button type="button" key={module._id || module.slug} className={selectedModule === module.slug ? 'selected' : ''} onClick={() => {
          setCategoryMenuOpen(false)
          onSelectModule?.(module.slug)
        }}>{module.name}</button>)}
      </section>
    </div>}
  </nav>
}

