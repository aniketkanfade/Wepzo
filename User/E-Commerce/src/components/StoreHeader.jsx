import { imageOf } from '../lib/storefront'

export default function StoreHeader({ business, customer, category, categories, query, setCategory, setQuery, location, onOpenLocation, onOpenAccount, onOpenCart, onSearch, count, showLogo, showSearch, showLocation, showProfile, showCart, showFavorites }) {
  if (!showLogo && !showSearch && !showLocation && !showProfile && !showCart && !showFavorites) return null

  return <header className="header sticky top-0 z-10 bg-white shadow-sm">
    {showLogo && <a className="brand" href="#top" aria-label={business.businessName || 'Home'}>
      {business.businessLogo
        ? <img className="brand-logo" src={imageOf({ image: business.businessLogo })} alt={business.businessName || 'Logo'} />
        : <><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 14h20l2 20H8l2-20Z"/><path d="M14 15V9a6 6 0 0 1 12 0v6M14 23l5 5 9-10"/></svg></span><span>{business.businessName || 'WEPZO'}</span></>}
    </a>}
    {showSearch && <label className="search flex items-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 transition-colors focus-within:border-orange-500">
      <select aria-label="Choose category" value={category} onChange={event => setCategory(event.target.value)}>
        <option value="">All Categories</option>{categories.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search for products, brands and more..." />
      <button type="button" aria-label="Search" onClick={onSearch}>Search</button>
    </label>}
    <div className="header-actions">
      {showLocation && <button className="location-button" onClick={onOpenLocation}>⌖ {location.pincode || 'Choose location'}</button>}
      {showProfile && <button className="account-button" onClick={onOpenAccount}>Hi, {customer?.name || 'User'}<small>My Account</small></button>}
      {showFavorites && <button className="header-icon" onClick={() => document.getElementById('wishlist')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Wishlist">♥</button>}
      {showCart && <button className="cart-button" onClick={onOpenCart}>Cart <i>{count}</i></button>}
    </div>
  </header>
}
