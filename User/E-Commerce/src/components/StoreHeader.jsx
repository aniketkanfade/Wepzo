import { imageOf } from '../lib/storefront'
import { useEffect, useMemo, useRef, useState } from 'react'
import './StoreHeader.css'

const Icon = ({ children }) => <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>

function highlightMatch(text, term) {
  const index = text.toLowerCase().indexOf(term)
  if (index < 0 || !term) return text
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + term.length)}</mark>{text.slice(index + term.length)}</>
}

export default function StoreHeader({ business, customer, query, setQuery, searchProducts = [], onSelectProduct, location, onOpenLocation, onOpenOrders, onOpenProfile, onOpenCart, onOpenWishlist, onEnableOrderNotifications, orderNotificationsEnabled, orderNotificationNotice, onSearch, count, showLogo, showSearch, showLocation, showProfile, showCart, showFavorites, favoriteCount = 0 }) {
  const isWepzo = String(business.businessName || 'WEPZO').trim().toLowerCase() === 'wepzo'
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const searchRef = useRef(null)
  const searchTerm = query.trim().toLowerCase()
  const suggestions = useMemo(() => {
    if (!searchTerm) return []
    return searchProducts
      .filter(product => `${product.name || ''} ${product.brand || ''} ${product.category || product.mainCategory || ''}`.toLowerCase().includes(searchTerm))
      .sort((a, b) => Number(String(b.name || '').toLowerCase().startsWith(searchTerm)) - Number(String(a.name || '').toLowerCase().startsWith(searchTerm)))
      .slice(0, 6)
  }, [searchProducts, searchTerm])

  useEffect(() => {
    if (!searchOpen) return undefined
    const closeOnOutsideClick = event => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [searchOpen])

  useEffect(() => setActiveSuggestion(-1), [searchTerm])

  const selectSuggestion = product => {
    setSearchOpen(false)
    onSelectProduct?.(product)
  }

  const handleSearchKeyDown = event => {
    if (event.key === 'Escape') {
      setSearchOpen(false)
      return
    }
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      setSearchOpen(true)
      setActiveSuggestion(index => Math.min(index + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      setSearchOpen(true)
      setActiveSuggestion(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (searchOpen && suggestions[activeSuggestion]) selectSuggestion(suggestions[activeSuggestion])
      else { setSearchOpen(false); onSearch?.() }
    }
  }

  if (!showLogo && !showSearch && !showLocation && !showProfile && !showCart && !showFavorites) return null

  return <header className="header sticky top-0 z-10 bg-white shadow-sm">
    {showLogo && <a className="brand" href="#top" aria-label={business.businessName || 'Home'}>
      {business.businessLogo
        ? <img className="brand-logo" src={imageOf({ image: business.businessLogo })} alt={business.businessName || 'Logo'} />
        : isWepzo ? <img className="brand-logo" src="/wepzo-logo.svg" alt="WEPZO" />
        : <><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 14h20l2 20H8l2-20Z"/><path d="M14 15V9a6 6 0 0 1 12 0v6M14 23l5 5 9-10"/></svg></span><span>{business.businessName || 'WEPZO'}</span></>}
    </a>}
    {showLocation && <button className="location-button" onClick={onOpenLocation}>
      <Icon><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></Icon>
      <span>Deliver to <b>{location.pincode || 'Choose location'}</b></span>
    </button>}
    {showSearch && <div className="search search-autocomplete flex items-center rounded-md border border-slate-200 bg-slate-100 transition-colors focus-within:border-orange-500" ref={searchRef}>
      <input
        value={query}
        onChange={event => { setQuery(event.target.value); setSearchOpen(true) }}
        onFocus={() => { if (query.trim()) setSearchOpen(true) }}
        onKeyDown={handleSearchKeyDown}
        placeholder="Search for products, brands and more..."
        aria-label="Search products"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={searchOpen && Boolean(searchTerm)}
        aria-controls="product-search-suggestions"
        aria-activedescendant={searchOpen && suggestions[activeSuggestion] ? `search-suggestion-${suggestions[activeSuggestion]._id || suggestions[activeSuggestion].id}` : undefined}
      />
      {searchOpen && searchTerm && <div id="product-search-suggestions" className="search-suggestions" role="listbox" aria-label="Matching products">
        {suggestions.length ? suggestions.map((product, index) => {
          const id = product._id || product.id
          const image = imageOf(product)
          const meta = [product.brand, product.category || product.mainCategory].filter(Boolean).join(' · ')
          return <button
            type="button"
            id={`search-suggestion-${id}`}
            key={id || `${product.name}-${index}`}
            className={`search-suggestion${index === activeSuggestion ? ' active' : ''}`}
            role="option"
            aria-selected={index === activeSuggestion}
            onMouseEnter={() => setActiveSuggestion(index)}
            onClick={() => selectSuggestion(product)}
          >
            <span className="search-suggestion-image">{image ? <img src={image} alt="" /> : <b>{product.name?.slice(0, 1)}</b>}</span>
            <span className="search-suggestion-copy"><strong>{highlightMatch(product.name || 'Product', searchTerm)}</strong>{meta && <small>{meta}</small>}</span>
          </button>
        }) : <div className="search-suggestions-empty">No matching products</div>}
      </div>}
    </div>}
    <div className="header-actions">
      {customer && showProfile && <button className="header-service" onClick={onEnableOrderNotifications} aria-label="Enable order notifications" title={orderNotificationNotice || 'Enable phone order notifications'}>
        <Icon><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></Icon><span>{orderNotificationsEnabled ? 'Alerts on' : 'Alerts'}</span>
      </button>}
      <button className="header-service" onClick={onOpenOrders} aria-label="Orders">
        <Icon><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3M9 13h6"/></Icon><span>Orders</span>
      </button>
      {showFavorites && <button className="header-icon" onClick={onOpenWishlist} aria-label={`Wishlist, ${favoriteCount} saved items`}>
        <Icon><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></Icon><span>Wishlist{favoriteCount > 0 ? ` (${favoriteCount})` : ''}</span>
      </button>}
      {showCart && <button className="cart-button" onClick={onOpenCart} aria-label={`Cart, ${count} items`}>
        <Icon><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></Icon><span>Cart</span><i>{count}</i>
      </button>}
      {showProfile && <div className="account-menu-wrap">
        <button className="account-button" onClick={onOpenProfile}>
          <Icon><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>
          <span>{customer?.name || 'User'}</span>
        </button>
      </div>}
    </div>
  </header>
}
