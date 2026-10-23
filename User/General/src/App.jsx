import { useEffect, useMemo, useState } from 'react'
import defaults from '../../../shared/webPageDefaults.json'
import './style.css'

const API = (import.meta.env.VITE_GENERAL_API_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
const query = new URLSearchParams(`${window.location.search.replace(/^\?/, '')}&${window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?') + 1) : ''}`)
const websiteId = import.meta.env.VITE_WEBSITE_ID || query.get('websiteId') || query.get('tenantId') || ''
const previewMode = query.get('preview') === '1'
const builderPreview = query.get('builderPreview') === '1'

function merge(defaultsValue, value) {
  if (Array.isArray(defaultsValue)) return Array.isArray(value) ? value : defaultsValue
  if (!defaultsValue || typeof defaultsValue !== 'object') return value === undefined ? defaultsValue : value
  return Object.fromEntries(Object.entries(defaultsValue).map(([key, child]) => [key, merge(child, value?.[key])]))
}

function imageUrl(value) {
  if (!value || /^(https?:|data:|blob:)/i.test(value)) return value
  const origin = API.replace(/\/api\/?$/, '')
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`
}

const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
const routeNow = () => window.location.hash.replace(/^#/, '') || '/home'

function SectionHeading({ eyebrow, title, text, centered = true }) {
  return <div className={`section-heading${centered ? ' centered' : ''}`}>
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    {title && <h2>{title}</h2>}
    {text && <p>{text}</p>}
  </div>
}

function ButtonLink({ href = '#/contact', children, secondary = false }) {
  return <a className={`button${secondary ? ' button-secondary' : ''}`} href={href}>{children}<span aria-hidden="true">↗</span></a>
}

function PageHero({ eyebrow, title, description }) {
  return <section className="page-hero"><div className="container"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p><div className="breadcrumbs"><a href="#/home">Home</a><span>/</span><span>{title}</span></div></div></section>
}

function Image({ src, alt, className = '' }) {
  return src ? <img className={className} src={imageUrl(src)} alt={alt || ''} loading="lazy" /> : <div className={`image-placeholder ${className}`} aria-hidden="true" />
}

function Header({ content, route, businessLogo }) {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => setMenuOpen(false), [route])
  const brand = content.brand || {}
  return <header className="site-header">
    <div className="container nav-wrap">
      <a className="brand" href="#/home" aria-label={`${brand.name} home`}>
        {businessLogo || brand.logo ? <Image src={businessLogo || brand.logo} alt={brand.name} className="brand-logo" /> : <span className="brand-mark">W</span>}
        <span>{brand.name}</span>
      </a>
      <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}><span /><span /><span /></button>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
        {(content.navigation || []).map(item => <a key={item.label} href={item.href} className={route === item.href.replace(/^#/, '') ? 'active' : ''}>{item.label}</a>)}
        <ButtonLink href="#/contact">Get in Touch</ButtonLink>
      </nav>
    </div>
  </header>
}

function Footer({ content, businessLogo }) {
  const brand = content.brand || {}
  const footer = content.footer || {}
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div className="footer-about"><a className="brand footer-brand" href="#/home">{businessLogo || brand.logo ? <Image src={businessLogo || brand.logo} alt={brand.name} className="brand-logo" /> : <span className="brand-mark">W</span>}<span>{brand.name}</span></a><p>{footer.description}</p><div className="social-links">{(footer.social || []).map(item => <a href={item.href} key={item.label} aria-label={item.label}>{item.label}</a>)}</div></div>
      <div><h3>Explore</h3>{(footer.quickLinks || []).map(item => <a className="footer-link" href={item.href} key={item.label}>{item.label}</a>)}</div>
      <div><h3>Expertise</h3>{(footer.serviceLinks || []).map(item => <a className="footer-link" href={item.href} key={item.label}>{item.label}</a>)}</div>
      <div><h3>Contact</h3><a className="footer-link" href={`mailto:${brand.email}`}>{brand.email}</a><a className="footer-link" href={`tel:${brand.phone}`}>{brand.phone}</a><p className="footer-address">{brand.address}</p></div>
    </div>
    <div className="container footer-bottom"><span>{String(footer.copyright || '').replace('{year}', new Date().getFullYear())}</span><div><a href="#/privacy">{footer.privacyLabel}</a><a href="#/terms">{footer.termsLabel}</a></div></div>
  </footer>
}

function CtaBanner({ title, text, label = 'Start a Conversation', href = '#/contact' }) {
  return <section className="cta-band"><div className="container cta-inner"><div><span className="eyebrow">Let’s make progress</span><h2>{title}</h2>{text && <p>{text}</p>}</div><ButtonLink href={href}>{label}</ButtonLink></div></section>
}

function HomePage({ content }) {
  const home = content.home || {}
  return <>
    <section className="hero-section"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow"><i />{home.eyebrow}</span><h1>{home.title}</h1><p>{home.description}</p><div className="hero-actions"><ButtonLink href={home.primaryHref}>{home.primaryLabel}</ButtonLink><ButtonLink href={home.secondaryHref} secondary>{home.secondaryLabel}</ButtonLink></div><div className="hero-proof"><div className="avatar-stack"><span>AM</span><span>PS</span><span>DK</span></div><p><b>Trusted by growing teams</b><small>Strategy, design & engineering in one partner</small></p></div></div><div className="hero-visual"><div className="hero-image-wrap"><Image src={home.image} alt="Technology team collaborating in a bright office" className="hero-image" /><div className="image-caption"><span className="caption-icon">✦</span><div><b>Built around your business</b><small>Thoughtful technology. Tangible results.</small></div></div></div><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/></div></div></section>
    <section className="client-strip"><div className="container"><p>{home.clientsTitle}</p><div className="client-logos">{(home.clients || []).map((name, index) => <span key={name} className={`client-logo client-logo-${index}`}>{name}</span>)}</div></div></section>
    <section className="section-block about-preview"><div className="container split-grid"><div className="about-visual"><Image src={home.aboutImage} alt="Wepzo team working together" className="about-image"/><div className="years-card"><b>5+</b><span>years building<br/>what’s next</span></div></div><div className="about-copy"><SectionHeading eyebrow="Who we are" title={home.aboutTitle} text={home.aboutText} centered={false}/><a className="text-link" href="#/about">Learn more about us <span>→</span></a><div className="mini-points"><span><i>✓</i> Senior, hands-on teams</span><span><i>✓</i> Clear, collaborative delivery</span></div></div></div></section>
    <section className="section-block section-muted"><div className="container"><SectionHeading eyebrow="What we do" title={home.servicesTitle} text="From a first product idea to the systems that power your next stage of growth."/><div className="card-grid three-col">{(content.services || []).slice(0, 6).map(service => <ServiceCard service={service} key={service.title}/>)}</div><div className="center-action"><ButtonLink href="#/services" secondary>View all services</ButtonLink></div></div></section>
    <section className="section-block"><div className="container"><SectionHeading eyebrow="Built for your goals" title={home.solutionsTitle} text="Practical, connected solutions shaped around the way your organization works."/><div className="solution-grid">{(content.solutions || []).slice(0, 4).map((solution, index) => <a className={`solution-card solution-card-${index}`} href="#/solutions" key={solution.title}><Image src={solution.image} alt=""/><span className="solution-overlay"/><span className="solution-content"><small>Solution {String(index + 1).padStart(2, '0')}</small><b>{solution.title}</b><span>{solution.description}</span><i>Explore solution ↗</i></span></a>)}</div></div></section>
    <section className="section-block benefits-section"><div className="container benefits-grid"><div><SectionHeading eyebrow="Why Wepzo" title={home.benefitsTitle} text="A steady partner who takes responsibility from first conversation through ongoing growth." centered={false}/><a className="text-link" href="#/about">How we work <span>→</span></a></div><div className="benefit-list">{(content.benefits || []).map((item, index) => <div className="benefit-item" key={item}><span>{String(index + 1).padStart(2, '0')}</span><b>{item}</b><i>↗</i></div>)}</div></div></section>
    <section className="stats-band"><div className="container stats-grid">{(home.stats || []).map(stat => <div className="stat-item" key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>)}</div></section>
    <section className="section-block"><div className="container"><SectionHeading eyebrow="A clear path forward" title={home.processTitle} text="A focused process keeps decisions clear and progress visible at every step."/><div className="process-row">{(home.process || []).map((item, index) => <div className="process-step" key={item}><span>{String(index + 1).padStart(2, '0')}</span><b>{item}</b>{index < home.process.length - 1 && <i>→</i>}</div>)}</div></div></section>
    <section className="section-block section-muted"><div className="container"><div className="section-heading-row"><SectionHeading eyebrow="Selected work" title={home.projectsTitle} text="A few examples of the progress we have helped our partners make." centered={false}/><a className="text-link" href="#/portfolio">Explore our work <span>→</span></a></div><div className="card-grid two-col">{(content.projects || []).slice(0, 2).map(project => <ProjectCard project={project} key={project.title}/>)}</div></div></section>
    <section className="section-block"><div className="container"><SectionHeading eyebrow="Partner perspectives" title={home.testimonialsTitle}/><div className="card-grid three-col">{(content.testimonials || []).map(item => <TestimonialCard item={item} key={item.name}/>)}</div></div></section>
    <section className="section-block team-preview"><div className="container"><div className="section-heading-row"><SectionHeading eyebrow="Good people, thoughtful work" title={home.teamTitle} centered={false}/><a className="text-link" href="#/about">Meet the company <span>→</span></a></div><div className="team-grid">{(content.team || []).map(person => <article className="team-card" key={person.name}><Image src={person.image} alt={person.name}/><b>{person.name}</b><span>{person.role}</span></article>)}</div></div></section>
    <CtaBanner title={home.ctaTitle} text={home.ctaText} label={home.ctaLabel} href={home.ctaHref}/>
  </>
}

function ServiceCard({ service }) {
  return <article className="service-card"><span className="service-icon">{service.icon || '✦'}</span><h3>{service.title}</h3><p>{service.description}</p><a className="text-link" href={`#/services/${slugify(service.title)}`}>Learn more <span>→</span></a></article>
}

function ProjectCard({ project }) {
  return <a className="project-card" href={`#/case-study/${slugify(project.title)}`}><div className="project-image"><Image src={project.image} alt={project.title}/><span className="project-arrow">↗</span></div><div className="project-meta"><span>{project.industry}</span><span>{project.category}</span></div><h3>{project.title}</h3><p>{project.description}</p><span className="text-link">View case study <span>→</span></span></a>
}

function TestimonialCard({ item }) {
  return <article className="testimonial-card"><div className="quote-mark">“</div><p>{item.quote}</p><div className="testimonial-person"><Image src={item.image} alt={item.name}/><div><b>{item.name}</b><span>{item.position}</span><small>{item.company}</small></div></div></article>
}

function AboutPage({ content }) {
  const about = content.about || {}
  return <><PageHero eyebrow="Who we are" title="About Our Company" description="A thoughtful technology partner for organizations ready to move forward."/><section className="section-block"><div className="container split-grid"><div><SectionHeading eyebrow={about.eyebrow} title={about.title} text={about.description} centered={false}/><p className="body-copy">{about.story}</p></div><Image src={about.image} alt="Our team collaborating" className="content-image"/></div></section><section className="section-block section-muted"><div className="container mission-grid"><article><span className="eyebrow">Our mission</span><h2>{about.mission}</h2></article><article><span className="eyebrow">Our vision</span><h2>{about.vision}</h2></article></div></section><section className="section-block"><div className="container"><SectionHeading eyebrow="What guides us" title="Our core values"/><div className="card-grid four-col">{(about.values || []).map(value => <article className="value-card" key={value.title}><span>✦</span><h3>{value.title}</h3><p>{value.description}</p></article>)}</div></div></section><section className="stats-band"><div className="container stats-grid">{(about.stats || []).map(stat => <div className="stat-item" key={stat.label}><b>{stat.value}</b><span>{stat.label}</span></div>)}</div></section><section className="section-block"><div className="container"><SectionHeading eyebrow="Meet the team" title="Leadership & team" text="A collaborative group of experienced people who care about the work and its impact."/><div className="team-grid">{(content.team || []).map(person => <article className="team-card" key={person.name}><Image src={person.image} alt={person.name}/><b>{person.name}</b><span>{person.role}</span></article>)}</div></div></section><CtaBanner title="Let’s build something meaningful." text="Bring us your challenge and we will help you find a clear next step."/></>
}

function ServicesPage({ content, route }) {
  const selected = route.startsWith('/services/') ? (content.services || []).find(item => slugify(item.title) === route.split('/')[2]) : null
  if (selected) return <><PageHero eyebrow="Our expertise" title={selected.title} description={selected.description}/><section className="section-block"><div className="container split-grid"><div><SectionHeading eyebrow="How we help" title={`A considered approach to ${selected.title.toLowerCase()}.`} text={selected.description} centered={false}/><h3>What we offer</h3><ul className="check-list">{(selected.features || []).map(item => <li key={item}><span>✓</span>{item}</li>)}</ul></div><Image src={selected.image} alt={selected.title} className="content-image"/></div></section><CtaBanner title={`Talk to us about ${selected.title.toLowerCase()}.`}/></>
  return <><PageHero eyebrow="What we do" title="Our Services" description="From early planning to ongoing support, our services help you build useful, dependable digital products."/><section className="section-block"><div className="container"><div className="card-grid three-col">{(content.services || []).map(service => <article className="service-detail-card" key={service.title}><Image src={service.image} alt={service.title}/><div><span className="service-icon">{service.icon || '✦'}</span><h3>{service.title}</h3><p>{service.description}</p><ul className="check-list">{(service.features || []).slice(0, 3).map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul><a className="text-link" href={`#/services/${slugify(service.title)}`}>Learn more <span>→</span></a></div></article>)}</div></div></section><CtaBanner title="Need a team for your next project?"/></>
}

function SolutionsPage({ content }) {
  return <><PageHero eyebrow="Solutions" title="Solutions Built Around Your Business" description="Bring the right people and technology together around your most important goals."/><section className="section-block"><div className="container card-grid three-col">{(content.solutions || []).map((item, index) => <article className="image-card" key={item.title}><Image src={item.image} alt={item.title}/><div><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.description}</p><a className="text-link" href="#/contact">Discuss this solution <span>→</span></a></div></article>)}</div></section><CtaBanner title="Let’s find the right solution for you."/></>
}

function IndustriesPage({ content }) {
  return <><PageHero eyebrow="Industries" title="Technology Solutions Across Industries" description="We combine proven digital experience with a close understanding of each industry's needs."/><section className="section-block"><div className="container card-grid four-col">{(content.industries || []).map(item => <article className="industry-card" key={item.title}><Image src={item.image} alt={item.title}/><div><h3>{item.title}</h3><p>{item.description}</p></div></article>)}</div></section><CtaBanner title="Your industry has its own challenges. Let’s talk."/></>
}

function PortfolioPage({ content, route }) {
  const [filter, setFilter] = useState('All')
  const selectedProject = route.startsWith('/case-study/') ? (content.projects || []).find(item => slugify(item.title) === route.split('/')[2]) : null
  if (selectedProject) return <><PageHero eyebrow={`${selectedProject.client} · ${selectedProject.industry}`} title={selectedProject.title} description={selectedProject.description}/><section className="section-block"><div className="container"><Image src={selectedProject.image} alt={selectedProject.title} className="case-hero-image"/><div className="case-details"><article><span className="eyebrow">The challenge</span><h2>Make a complex experience simpler and more useful.</h2><p>{selectedProject.description}</p></article><article><span className="eyebrow">Our approach</span><h2>Strategy, design and engineering working as one.</h2><p>We worked closely with the client team to understand the needs, shape a clear roadmap and deliver an adaptable solution with measurable outcomes.</p></article><article><span className="eyebrow">The result</span><h2>{selectedProject.result}</h2><p>Technology: {selectedProject.technology}. Services: {selectedProject.services}.</p></article></div></div></section><CtaBanner title="Could your project be next?"/></>
  const filters = ['All', 'Web', 'Mobile', 'Software', 'UI/UX', 'Other']
  const projects = (content.projects || []).filter(item => filter === 'All' || item.category === filter || (filter === 'Other' && !filters.slice(1, -1).includes(item.category)))
  return <><PageHero eyebrow="Selected work" title="Our Work" description="A collection of digital products and experiences built in close partnership with our clients."/><section className="section-block"><div className="container"><div className="filter-row" aria-label="Filter projects">{filters.map(item => <button className={filter === item ? 'filter-button active' : 'filter-button'} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="card-grid two-col">{projects.map(project => <ProjectCard project={project} key={project.title}/>)}</div></div></section><CtaBanner title="Let’s make your next project a success."/></>
}

function CareersPage({ content }) {
  const careers = content.careers || {}
  return <><PageHero eyebrow="Careers" title={careers.title} description={careers.description}/><section className="section-block"><div className="container"><SectionHeading eyebrow="Life at Wepzo" title="Good work starts with a good team." text="We value curiosity, thoughtful collaboration and the space to do your best work."/><div className="card-grid four-col">{(careers.benefits || []).map((item, index) => <article className="value-card" key={item}><span>0{index + 1}</span><h3>{item}</h3><p>Join a team that makes room for people to learn, contribute and grow.</p></article>)}</div></div></section><section className="section-block section-muted"><div className="container"><SectionHeading eyebrow="Open positions" title="Find your next opportunity"/><div className="job-list">{(careers.jobs || []).map(job => <article className="job-card" key={job.title}><div><h3>{job.title}</h3><p>{job.location} · {job.experience} · {job.type}</p></div><ButtonLink href={`mailto:${content.brand?.email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}>Apply now</ButtonLink></article>)}</div></div></section><CtaBanner title="Don’t see the right role?" text="Tell us what you do and what kind of work you want to be part of." label="Introduce yourself" href={`mailto:${content.brand?.email}`}/></>
}

function ContactPage({ content }) {
  const brand = content.brand || {}
  const contact = content.contact || {}
  const [sent, setSent] = useState(false)
  const submit = event => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const subject = encodeURIComponent(`Website enquiry from ${form.get('name')}`)
    const body = encodeURIComponent(`Name: ${form.get('name')}\nEmail: ${form.get('email')}\nPhone: ${form.get('phone')}\nCompany: ${form.get('company')}\nService: ${form.get('service')}\n\n${form.get('message')}`)
    window.location.href = `mailto:${brand.email}?subject=${subject}&body=${body}`
    setSent(true)
  }
  return <><PageHero eyebrow="Contact" title={contact.title} description={contact.description}/><section className="section-block"><div className="container contact-grid"><aside className="contact-info"><span className="eyebrow">Get in touch</span><h2>We’d love to hear what you’re working on.</h2><div className="contact-detail"><span>✉</span><div><small>Email</small><a href={`mailto:${brand.email}`}>{brand.email}</a></div></div><div className="contact-detail"><span>☎</span><div><small>Phone</small><a href={`tel:${brand.phone}`}>{brand.phone}</a></div></div><div className="contact-detail"><span>⌖</span><div><small>Office</small><p>{brand.address}</p></div></div><div className="contact-detail"><span>◷</span><div><small>Working hours</small><p>{brand.hours}</p></div></div></aside><form className="contact-form" onSubmit={submit}><div className="form-row"><label>Full name<input name="name" required placeholder="Your name"/></label><label>Email address<input type="email" name="email" required placeholder="you@company.com"/></label></div><div className="form-row"><label>Phone<input name="phone" placeholder="Your phone number"/></label><label>Company<input name="company" placeholder="Company name"/></label></div><label>Service required<select name="service"><option value="">Select a service</option>{(content.services || []).map(service => <option key={service.title}>{service.title}</option>)}</select></label><label>Message<textarea name="message" rows="5" required placeholder="Tell us a little about your project"/></label><button className="button" type="submit">Submit inquiry <span>↗</span></button>{sent && <p className="success-note">Your email app is opening with your enquiry.</p>}</form></div></section>{contact.mapEmbed && <section className="map-section"><iframe title="Office map" src={contact.mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/></section>}<section className="section-block section-muted"><div className="container narrow"><SectionHeading eyebrow="A few answers" title="Before you get in touch"/>{(contact.faq || []).map(item => <details className="faq-item" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section></>
}

function FaqPage({ content }) {
  const [category, setCategory] = useState('All')
  const categories = ['All', ...new Set((content.faqs || []).map(item => item.category))]
  const questions = (content.faqs || []).filter(item => category === 'All' || item.category === category)
  return <><PageHero eyebrow="Help center" title="Frequently Asked Questions" description="Answers to common questions about our services and how we work."/><section className="section-block"><div className="container narrow"><div className="filter-row">{categories.map(item => <button key={item} className={category === item ? 'filter-button active' : 'filter-button'} onClick={() => setCategory(item)}>{item}</button>)}</div>{questions.map(item => <details className="faq-item" key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section></>
}

function LegalPage({ page }) {
  return <><PageHero eyebrow="Company information" title={page.title} description={`Last updated ${page.updated || ''}`}/><section className="section-block"><div className="container narrow legal-copy">{(page.sections || []).map(section => <article key={section.title}><h2>{section.title}</h2><p>{section.body}</p></article>)}</div></section></>
}

function ContentPage({ content, route }) {
  if (route.startsWith('/about')) return <AboutPage content={content}/>
  if (route.startsWith('/services')) return <ServicesPage content={content} route={route}/>
  if (route === '/solutions') return <SolutionsPage content={content}/>
  if (route === '/industries') return <IndustriesPage content={content}/>
  if (route === '/portfolio' || route.startsWith('/case-study/')) return <PortfolioPage content={content} route={route}/>
  if (route === '/careers') return <CareersPage content={content}/>
  if (route === '/contact') return <ContactPage content={content}/>
  if (route === '/faq') return <FaqPage content={content}/>
  if (route === '/privacy') return <LegalPage page={content.privacy || {}}/>
  if (route === '/terms') return <LegalPage page={content.terms || {}}/>
  return <HomePage content={content}/>
}

export default function App() {
  const [content, setContent] = useState(defaults)
  const [theme, setTheme] = useState({})
  const [previewTheme, setPreviewTheme] = useState(null)
  const [route, setRoute] = useState(routeNow)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const onHashChange = () => { setRoute(routeNow()); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  useEffect(() => {
    if (!builderPreview) return undefined
    const receivePreview = event => {
      if (event.source !== window.parent || event.data?.type !== 'wepzo:builder-preview') return
      if (event.data.theme && typeof event.data.theme === 'object') setPreviewTheme(event.data.theme)
    }
    window.addEventListener('message', receivePreview)
    return () => window.removeEventListener('message', receivePreview)
  }, [])
  useEffect(() => {
    let active = true
    const refresh = () => {
      const headers = { 'X-Website-Module': 'general', ...(websiteId ? { 'X-Website-Id': websiteId } : {}) }
      const params = new URLSearchParams()
      if (websiteId) params.set('websiteId', websiteId)
      if (previewMode) params.set('preview', '1')
      fetch(`${API}/web-page/public/site-content${params.size ? `?${params}` : ''}`, { headers, cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .then(data => { if (active && data?.content) { setContent(merge(defaults, data.content)); setTheme(data.theme || {}) } })
        .catch(() => {})
        .finally(() => { if (active) setLoading(false) })
    }
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  useEffect(() => { document.title = content.brand?.name || 'Web Page' }, [content.brand?.name])
  const liveTheme = useMemo(() => {
    if (!previewTheme) return theme
    const cards = { ...(theme.storefrontCardStyles || {}), ...(previewTheme.storefrontCardStyles || {}) }
    for (const [type, style] of Object.entries(previewTheme.storefrontCardStyles || {})) {
      cards[type] = { ...(theme.storefrontCardStyles?.[type] || {}), ...style }
    }
    return { ...theme, ...previewTheme, storefrontCardStyles: cards }
  }, [previewTheme, theme])
  const page = useMemo(() => <ContentPage content={content} route={route}/>, [content, route])
  return <div className="web-page-app" style={{
    '--brand': liveTheme.primaryColor || content.brand?.primaryColor || '#1457d9',
    '--header-bg': liveTheme.headerBackground || '#ffffff', '--header-text': liveTheme.headerText || '#142238',
    '--search-bg': liveTheme.searchBackground || '#f8f9fb', '--search-button': liveTheme.searchButton || liveTheme.primaryColor || '#1457d9',
    '--button-bg': liveTheme.buttonBackground || liveTheme.primaryColor || content.brand?.primaryColor || '#1457d9',
    '--button-text': liveTheme.buttonText || '#ffffff', '--footer-bg': liveTheme.footerBackground || '#111f32',
    '--footer-text': liveTheme.footerText || '#ffffff', '--page-bg': liveTheme.pageBackground || '#ffffff',
    '--surface-bg': liveTheme.surfaceBackground || '#ffffff',
    '--storefront-product-border-radius': `${Math.max(0, Math.min(40, Number(liveTheme.storefrontCardStyles?.product?.borderRadius ?? 12)))}px`,
    '--storefront-product-border-width': `${Math.max(0, Math.min(8, Number(liveTheme.storefrontCardStyles?.product?.borderWidth ?? 1)))}px`,
    '--storefront-product-border-color': liveTheme.storefrontCardStyles?.product?.borderColor || '#e2e8f0',
    '--storefront-product-background': liveTheme.storefrontCardStyles?.product?.backgroundColor || liveTheme.productCardBackground || liveTheme.surfaceBackground || '#fff',
    '--storefront-category-border-radius': `${Math.max(0, Math.min(40, Number(liveTheme.storefrontCardStyles?.category?.borderRadius ?? 12)))}px`,
    '--storefront-category-border-width': `${Math.max(0, Math.min(8, Number(liveTheme.storefrontCardStyles?.category?.borderWidth ?? 1)))}px`,
    '--storefront-category-border-color': liveTheme.storefrontCardStyles?.category?.borderColor || '#e2e8f0',
    '--storefront-category-background': liveTheme.storefrontCardStyles?.category?.backgroundColor || liveTheme.surfaceBackground || '#fff',
    '--storefront-promo-border-radius': `${Math.max(0, Math.min(40, Number(liveTheme.storefrontCardStyles?.promo?.borderRadius ?? 12)))}px`,
    '--storefront-promo-border-width': `${Math.max(0, Math.min(8, Number(liveTheme.storefrontCardStyles?.promo?.borderWidth ?? 1)))}px`,
    '--storefront-promo-border-color': liveTheme.storefrontCardStyles?.promo?.borderColor || '#e2e8f0',
    '--storefront-promo-background': liveTheme.storefrontCardStyles?.promo?.backgroundColor || liveTheme.surfaceBackground || '#fff',
    '--storefront-account-border-radius': `${Math.max(0, Math.min(40, Number(liveTheme.storefrontCardStyles?.account?.borderRadius ?? 12)))}px`,
    '--storefront-account-border-width': `${Math.max(0, Math.min(8, Number(liveTheme.storefrontCardStyles?.account?.borderWidth ?? 1)))}px`,
    '--storefront-account-border-color': liveTheme.storefrontCardStyles?.account?.borderColor || '#e2e8f0',
    '--storefront-account-background': liveTheme.storefrontCardStyles?.account?.backgroundColor || liveTheme.surfaceBackground || '#fff',
    ...Object.fromEntries(['header', 'cart', 'profile', 'order', 'support', 'button'].flatMap(type => {
      const style = liveTheme.storefrontCardStyles?.[type] || {}
      return [
        [`--storefront-${type}-background`, style.backgroundColor || (type === 'header' ? liveTheme.headerBackground : type === 'product' ? liveTheme.productCardBackground : type === 'button' ? liveTheme.buttonBackground : liveTheme.surfaceBackground) || '#ffffff'],
        ...(type === 'button' ? [['--storefront-button-text-color', style.textColor || liveTheme.buttonText || '#ffffff']] : []),
        [`--storefront-${type}-border-radius`, `${Math.max(0, Math.min(40, Number(style.borderRadius ?? (type === 'button' ? 6 : 12))))}px`],
        [`--storefront-${type}-border-width`, `${Math.max(0, Math.min(8, Number(style.borderWidth ?? (type === 'button' ? 0 : 1))))}px`],
        [`--storefront-${type}-border-color`, style.borderColor || '#e2e8f0'],
      ]
    })),
  }}>
    <Header content={content} route={route} businessLogo={liveTheme.businessLogo}/>
    <main>{page}</main>
    <Footer content={content} businessLogo={liveTheme.businessLogo}/>
    {loading && <span className="sr-only" role="status">Loading website content</span>}
  </div>
}
