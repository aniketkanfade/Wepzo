export default function StoreNavigation({ modules, category, selectedModule, setSelectedModule, setCategory, setSubCategory, setChildCategory, visible }) {
  if (!visible) return null

  return <nav className="nav flex items-stretch gap-5 overflow-x-auto border-b border-slate-200 bg-white" aria-label="Store navigation">
    <button type="button" className={!selectedModule && !category ? 'nav-active' : ''} onClick={() => {
      setSelectedModule('')
      setCategory('')
      setSubCategory('')
      setChildCategory('')
      document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })
    }}>Home</button>
    {modules.map(module => <button type="button" key={module._id || module.slug} className={selectedModule === module.slug ? 'nav-selected' : ''} onClick={() => {
      setSelectedModule(selectedModule === module.slug ? '' : module.slug)
      setCategory('')
      setSubCategory('')
      setChildCategory('')
      document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })
    }}>{module.name}</button>)}
    <span className="nav-spacer" />
  </nav>
}
