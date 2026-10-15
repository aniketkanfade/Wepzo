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
    }}>Home</button>
    {modules.map(module => <button type="button" key={module._id || module.slug} className={activeModule === module.slug ? 'nav-selected' : ''} onClick={() => {
      if (onSelectModule) onSelectModule(module.slug)
      else {
        setSelectedModule(module.slug)
        setCategory('')
        setSubCategory('')
        setChildCategory('')
      }
    }}>{module.name}</button>)}
    <span className="nav-spacer" />
  </nav>
}
