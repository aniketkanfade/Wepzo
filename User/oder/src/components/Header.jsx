import Icon from './Icon.jsx'
import BrandLogo from './BrandLogo.jsx'

export default function Header({ query, setQuery, cartCount, currentUser, storeName, storeLogo, onBagClick, onProfileClick }) {
  return <header className="site-header">
    <BrandLogo className="wordmark" label={storeName || 'morrow'} logo={storeLogo}/>
    <div className="search-box"><Icon name="search" size={18}/><input aria-label="Search products" placeholder="Search the collection" value={query} onChange={(event) => setQuery(event.target.value)}/><kbd>Ctrl K</kbd></div>
    <nav className="header-actions" aria-label="Account and bag">
      <button className="icon-button bag-button" aria-label={"Shopping bag, " + cartCount + " items"} onClick={onBagClick}><Icon name="bag"/><span>Bag</span>{cartCount > 0 && <b className="bag-count">{cartCount}</b>}</button>
      <button className="icon-button profile-button" aria-label={currentUser ? 'Open profile and order tracking' : 'Log in'} onClick={onProfileClick}><span className="profile-avatar">{currentUser ? (currentUser.name || 'C').slice(0, 1).toUpperCase() : 'J'}</span><span>{currentUser ? 'Profile' : 'Log in'}</span></button>
    </nav>
  </header>
}
