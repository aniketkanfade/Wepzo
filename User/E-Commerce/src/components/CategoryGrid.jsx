import { imageOf } from '../lib/storefront'

export default function CategoryGrid({ categories, categoryProduct, onSelect, visible, title, onBack, selectedCategory }) {
  if (!visible) return null

  return <section id="category-browser" aria-label={title || 'Shop by category'}>
    {(title || onBack) && <div className="mb-3 flex items-center gap-3">
      {onBack && <button type="button" className="category-grid-back-button text-sm font-semibold text-slate-600" onClick={onBack}>← Back</button>}
      {title && <h2 className="text-base font-bold">{title}</h2>}
    </div>}
    <div className="category-row grid grid-cols-10 gap-4 overflow-x-auto">
    {categories.slice(0, 10).map((name, index) => {
      const product = categoryProduct(name)
      return <button
        className="category-tile"
        key={name}
        aria-pressed={name === selectedCategory}
        onClick={() => onSelect(name)}
      >
        <span className={`category-image category-tone-${index % 5}`}>
          {imageOf(product) ? <img src={imageOf(product)} alt="" /> : <b>{name.slice(0, 1)}</b>}
        </span>
        <span>{name}</span>
      </button>
    })}
    </div>
  </section>
}
