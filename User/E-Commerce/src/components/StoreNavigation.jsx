import { imageOf } from '../lib/storefront'

const moduleGlyph = module => {
  const label = `${module.name || ''} ${module.slug || ''}`.toLowerCase()
  if (/fashion|cloth|footwear|ethnic/.test(label)) return <><path d="m7 4 5 2 5-2 4 4-3 3-2-2v11H8V9l-2 2-3-3 4-4Z"/></>
  if (/mobile|phone|tablet/.test(label)) return <><rect x="7" y="2.5" width="10" height="19" rx="1.5"/><path d="M10 5h4M11 18.5h2"/></>
  if (/electronic|computer|laptop|tech/.test(label)) return <><rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M2 20h20M9 17v3m6-3v3"/></>
  if (/beauty|health|personal/.test(label)) return <><path d="M9 3h6v4H9zM8 7h8v14H8zM10 11h4"/></>
  if (/grocery|food|fruit|vegetable/.test(label)) return <><path d="M4 9h16l-2 11H6L4 9Z"/><path d="m8 9 2-5m6 5-2-5M8 13v4m4-4v4m4-4v4"/></>
  if (/book|stationery/.test(label)) return <><path d="M4 4.5A3.5 3.5 0 0 1 7.5 1H20v19H7.5A3.5 3.5 0 0 0 4 23V4.5Z"/><path d="M4 5v18m4-18h8"/></>
  if (/vehicle|wheel|auto|bike/.test(label)) return <><circle cx="6" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="m6 17 4-7h5l4 7M10 10l-2-3h4"/></>
  if (/home|furniture|appliance/.test(label)) return <><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-7h6v7"/></>
  return <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v18m8-18v18"/></>
}

const ModuleGlyph = ({ module }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><g>{moduleGlyph(module)}</g></svg>
)

export default function StoreNavigation({ modules, category, selectedModule, activeModule = selectedModule, onHome, onSelectModule, setSelectedModule, setCategory, setSubCategory, setChildCategory, visible }) {
  if (!visible) return null

  return <nav className="nav flex items-stretch gap-5 overflow-x-auto border-b border-slate-200 bg-white" aria-label="Store navigation">
    <button type="button" className={!activeModule && !category ? 'nav-active' : ''} onClick={() => {
      if (onHome) onHome()
      else {
        setSelectedModule('')
        setCategory('')
        setSubCategory('')
        setChildCategory('')
      }
    }}><span className="module-tab-logo module-tab-logo-home" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg></span><span>For You</span></button>
    {modules.map(module => <button type="button" key={module._id || module.slug} className={activeModule === module.slug ? 'nav-selected' : ''} onClick={() => {
      if (onSelectModule) onSelectModule(module.slug)
      else {
        setSelectedModule(module.slug)
        setCategory('')
        setSubCategory('')
        setChildCategory('')
      }
    }}>{imageOf(module) ? <img className="module-tab-logo" src={imageOf(module)} alt="" /> : <span className="module-tab-logo module-tab-logo-placeholder" aria-hidden="true"><ModuleGlyph module={module} /></span>}<span>{module.name}</span></button>)}
  </nav>
}
