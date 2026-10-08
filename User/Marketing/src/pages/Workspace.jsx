import React, { useEffect, useMemo, useState } from 'react'
import Brand from '../components/Brand.jsx'
import { marketingRequest, resolveLogo } from '../BrandingContext.jsx'

const navItems = [
  ['Dashboard', '◫'], ['Content Calendar', '▦'], ['My Content', '▤'], ['Reels', '▷'], ['Campaigns', '◉'],
  ['Social Accounts', '◎'], ['Meta Ads', 'f'], ['Google Ads', 'G'], ['Analytics', '↗'], ['Subscription', '◇'], ['Notifications', '♧'], ['Settings', '⚙'],
]
const dateText = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
const hourText = value => value ? new Date(`2000-01-01T${value}`).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''
const toPost = item => { const platforms = Array.isArray(item.platforms) && item.platforms.length ? item.platforms : [item.platform]; return { ...item, id: item._id, platforms, primaryPlatform: item.platform || platforms[0], platform: platforms.join(', '), type: item.contentType || 'Post', color: ['Instagram','YouTube'].includes(item.platform || platforms[0]) ? 'peach' : (item.platform || platforms[0]) === 'LinkedIn' ? 'blue' : 'violet', date: item.publishDate ? `${dateText(item.publishDate)}${hourText(item.publishTime) ? `, ${hourText(item.publishTime)}` : ''}` : 'Not scheduled' } }

function Metric({ label, value, note, icon, tone }) { return <article className="ws-metric"><span className={`ws-metric-icon ${tone}`}>{icon}</span><span className="ws-metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article> }

function PostsTable({ posts, onSchedule, onPublish, loading }) {
  const [preview, setPreview] = useState(null)
  if (!loading && !posts.length) return <div className="ws-empty"><span>Content</span><b>No content assigned yet</b><p>Your Marketing team will add posts and reels to your workspace.</p></div>
  return <>
    <div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>CONTENT</th><th>PLATFORM</th><th>TYPE</th><th>PUBLISH TIME</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{posts.map(post=><tr key={post.id}><td><div className="ws-post-cell">{post.mediaUrl?<button type="button" className={`ws-thumb ws-thumb-button ${post.color}`} onClick={()=>setPreview(post)} aria-label={`Preview ${post.title}`}><img src={resolveLogo(post.mediaUrl)} alt="" onError={event=>{event.currentTarget.style.display='none'}}/><span className="ws-thumb-fallback">{post.type==='Reel'?'▶':'▧'}</span></button>:<span className={`ws-thumb ${post.color}`}>{post.type==='Reel'?'Reel':'Post'}</span>}<span><b>{post.title}</b><small>{post.caption || 'No caption provided'}</small>{post.lastPublishError&&<small className="publish-error">{post.lastPublishError}</small>}</span></div></td><td>{post.platform}</td><td>{post.type}</td><td>{post.date}</td><td><span className={`ws-status ${String(post.status).toLowerCase()}`}>{String(post.status).replaceAll('_',' ')}</span></td><td>{['AVAILABLE','FAILED'].includes(post.status)?<><button className="ws-text-button" onClick={()=>onSchedule(post)}>Schedule</button><br/><button className="ws-text-button" onClick={()=>onPublish(post)}>{post.status==='FAILED'?'Retry publish':'Publish now'}</button></>:post.status==='SCHEDULED'?<button className="ws-text-button" onClick={()=>onSchedule(post)}>Cancel schedule</button>:<span className="ws-read-only">{post.status==='LOCKED'?'Locked':'?'}</span>}</td></tr>)}</tbody></table></div>
    {preview&&<div className="ws-preview-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&setPreview(null)}><section className="ws-preview-dialog" role="dialog" aria-modal="true" aria-label={`${preview.type} preview`}><button className="ws-preview-close" onClick={()=>setPreview(null)} aria-label="Close preview">×</button>{preview.mediaType==='video'?<video src={resolveLogo(preview.mediaUrl)} controls autoPlay playsInline/>:<img src={resolveLogo(preview.mediaUrl)} alt={preview.title}/>}<div><b>{preview.title}</b><span>{preview.platform} · {preview.type}</span>{preview.caption&&<p>{preview.caption}</p>}</div></section></div>}
  </>
}

function Overview({ user, posts, loading, select, onSchedule, onPublish }) {
  const today = posts.filter(post=>post.status==='AVAILABLE').length
  const scheduled = posts.filter(post=>post.status==='SCHEDULED').length
  const published = posts.filter(post=>post.status==='PUBLISHED').length
  const locked = posts.filter(post=>post.status==='LOCKED').length
  return <><div className="ws-welcome"><div><div className="ws-eyebrow">YOUR MARKETING OVERVIEW</div><h1>Good morning, {user?.name?.split(' ')[0] || 'there'} <span>✦</span></h1><p>Here is the content your Wepzo Marketing team has assigned to you.</p></div><button className="ws-primary" onClick={()=>select('My Content')}>View my content →</button></div>
    <div className="ws-metrics"><Metric label="Ready today" value={loading?'—':today} note="Content available to schedule" icon="▤" tone="orange"/><Metric label="Scheduled" value={loading?'—':scheduled} note="Posts in your schedule" icon="◷" tone="blue"/><Metric label="Published" value={loading?'—':published} note="Completed content" icon="✓" tone="green"/><Metric label="Locked" value={loading?'—':locked} note="Unlocks on the release date" icon="◇" tone="purple"/></div>
    <article className="ws-card ws-recent"><div className="ws-card-head"><div><h3>Today and upcoming</h3><p>Admin-assigned content for your account</p></div><button className="ws-text-button" onClick={()=>select('Content Calendar')}>Open calendar →</button></div><PostsTable posts={posts.filter(post=>['AVAILABLE','SCHEDULED','LOCKED'].includes(post.status)).slice(0,5)} loading={loading} onSchedule={onSchedule} onPublish={onPublish}/></article>
  </>
}

function Calendar({ posts, onSchedule }) {
  const [view,setView]=useState('Month')
  const now=new Date()
  const firstDay=new Date(now.getFullYear(),now.getMonth(),1).getDay()
  const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()
  const datePosts=posts.filter(post=>post.publishDate || post.releaseDate)
  return <><div className="ws-page-heading"><div><div className="ws-eyebrow">PLAN AHEAD</div><h1>Content calendar</h1><p>View and schedule the content assigned to you.</p></div><div className="calendar-views">{['Month','Week','Day'].map(item=><button key={item} className={view===item?'selected':''} onClick={()=>setView(item)}>{item}</button>)}</div></div><div className="ws-card calendar-card"><div className="calendar-toolbar"><b>{now.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</b><span className="ws-muted-note">{datePosts.length} assigned items</span></div><div className="calendar-grid"><div className="calendar-days">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span key={day}>{day}</span>)}</div><div className="calendar-dates">{Array.from({length:Math.ceil((firstDay+days)/7)*7},(_,i)=>{const day=i-firstDay+1;const active=day>0&&day<=days;const dayStr=active?`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';const matches=datePosts.filter(post=>(post.publishDate||post.releaseDate)===dayStr);return <div key={i} className={`${active?'':'faded'} ${day===now.getDate()?'today':''}`}><span>{active?day:''}</span>{matches.map(post=><button key={post.id} className={`calendar-event ${post.color}`} onClick={()=>onSchedule(post)}><b>{post.platform==='Instagram'?'◎':post.platform==='Facebook'?'f':post.platform==='YouTube'?'▶':'in'}</b> {post.title}</button>)}</div>})}</div></div></div><p className="ws-integration-note">Calendar items show dates provided by your Marketing admin. Only assigned content appears here.</p></>
}

function ContentPage({ page, posts, loading, onSchedule, onPublish }) {
  const [query,setQuery]=useState('')
  const list=useMemo(()=>posts.filter(post=>(page!=='Reels'||post.type==='Reel')&&`${post.title} ${post.platform} ${post.status}`.toLowerCase().includes(query.toLowerCase())),[posts,page,query])
  return <><div className="ws-page-heading"><div><div className="ws-eyebrow">YOUR ASSIGNED CONTENT</div><h1>{page}</h1><p>{page==='Reels'?'Review and schedule reels assigned to you.':'Review, preview and schedule content assigned to your account.'}</p></div><input className="ws-search" placeholder="Search content…" value={query} onChange={event=>setQuery(event.target.value)}/></div><article className="ws-card ws-recent"><div className="ws-card-head"><div><h3>{page==='Reels'?'Your reels':'Content library'}</h3><p>{loading?'Loading…':`${list.length} items assigned to your account`}</p></div></div><PostsTable posts={list} loading={loading} onSchedule={onSchedule} onPublish={onPublish}/></article></>
}

function SubscriptionPage() {
  const [subscription,setSubscription]=useState(null)
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;marketingRequest('/marketing/subscription').then(data=>{if(active)setSubscription(data)}).catch(err=>{if(active)setError(err.message||'Could not load subscription details.')});return()=>{active=false}},[])
  if(!subscription&&!error)return <div className="ws-card subscription-loading">Loading subscription details...</div>
  return <><div className="ws-page-heading"><div><div className="ws-eyebrow">YOUR PLAN</div><h1>Subscription</h1><p>Your Marketing plan, renewal information, and available upgrades.</p></div><a className="ws-primary" href="#pricing">Compare plans</a></div>{error&&<div className="ws-api-error" role="alert">{error}</div>}<div className="subscription-layout"><article className="ws-card subscription-card"><div className="subscription-summary"><span className="ws-plan-icon">W</span><span><small>MARKETING SUBSCRIPTION</small><h2>{subscription?.planName||'No active plan'}</h2><p>{subscription?.websiteName?`Plan for ${subscription.websiteName}`:'Subscription details for your Wepzo account.'}</p></span><span className={`ws-status ${subscription?.active?'connected':'not-connected'}`}>{subscription?.active?'Active':subscription?.status||'No active subscription'}</span></div>{subscription?.planName?<div className="subscription-details"><div><span>Billing cycle</span><b>{subscription.billingCycle||subscription.purchaseType||'?'}</b></div><div><span>Next renewal</span><b>{subscription.renewalDate?new Date(subscription.renewalDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'Not set'}</b></div><div><span>Amount</span><b>{subscription.amount?new Intl.NumberFormat('en-IN',{style:'currency',currency:subscription.currency||'INR',maximumFractionDigits:0}).format(subscription.amount):'Not set'}</b></div></div>:<div className="subscription-empty"><b>Your workspace is ready to use.</b><p>Browse the Wepzo Marketing plans to see available features. Billing details will appear here after a plan is assigned.</p><a className="button button-primary" href="#pricing">View plans <span aria-hidden="true">&rarr;</span></a></div>}</article><aside className="ws-card subscription-help"><span className="ws-plan-icon">?</span><h3>Need help with billing?</h3><p>Our team can help with plan changes, invoices, and account access.</p><a className="ws-secondary" href="mailto:hello@wepzo.com">Contact support</a></aside></div></>
}

function IntegrationPage({ page }) {
  const platforms=page==='Social Accounts'?['Instagram','Facebook','YouTube','LinkedIn']:page==='Meta Ads'?['Meta Business']:page==='Google Ads'?['Google Ads']:[]
  const [connections,setConnections]=useState([])
  const [connecting,setConnecting]=useState('')
  const [connectionMessage,setConnectionMessage]=useState('')
  const platformKeys={'Instagram':'instagram','Facebook':'facebook','YouTube':'youtube','LinkedIn':'linkedin','Meta Business':'meta-business','Google Ads':'google-ads'}
  useEffect(()=>{
    if(!platforms.length)return
    let active=true
    marketingRequest('/marketing/integrations').then(data=>{if(active)setConnections(Array.isArray(data)?data:[])}).catch(err=>{if(active)setConnectionMessage(err.message||'Could not load connected accounts.')})
    const query=window.location.hash.includes('?')?window.location.hash.slice(window.location.hash.indexOf('?')+1):''
    const result=new URLSearchParams(query).get('connection')
    if(result)setConnectionMessage(result==='success'?'Account connected successfully.':result==='denied'?'Account authorization was cancelled.':result==='failed'?'The platform could not complete authorization. Check server logs and OAuth settings.':'The authorization request expired or could not be verified.')
    return()=>{active=false}
  },[page])
  const connect=async name=>{
    const key=platformKeys[name];setConnecting(key);setConnectionMessage('')
    try{const data=await marketingRequest(`/marketing/integrations/${key}/connect`,{method:'POST'});if(data.authorizationUrl)window.location.assign(data.authorizationUrl)}catch(err){setConnectionMessage(err.message||`Could not connect ${name}.`);setConnecting('')}
  }
  const selectTarget=async (name,targetId)=>{
    const key=platformKeys[name];setConnecting(key);setConnectionMessage('')
    try{const data=await marketingRequest(`/marketing/integrations/${key}/account`,{method:'PUT',body:JSON.stringify({targetId})});setConnections(items=>items.map(item=>item.platform===key?{...item,selectedTargetId:data.selectedTargetId}:item));setConnectionMessage(`${name} account is ready for publishing.`)}catch(err){setConnectionMessage(err.message||'Could not select this account.')}finally{setConnecting('')}
  }
  const disconnect=async name=>{
    const key=platformKeys[name];setConnecting(key);setConnectionMessage('')
    try{await marketingRequest(`/marketing/integrations/${key}`,{method:'DELETE'});setConnections(items=>items.map(item=>item.platform===key?{...item,connected:false}:item));setConnectionMessage(`${name} disconnected.`)}catch(err){setConnectionMessage(err.message||`Could not disconnect ${name}.`)}finally{setConnecting('')}
  }
  if (page==='Subscription') return <SubscriptionPage />
  if (page==='Notifications') return <><div className="ws-page-heading"><div><div className="ws-eyebrow">UPDATES</div><h1>Notifications</h1><p>Recent updates from your assigned Marketing content.</p></div></div><div className="ws-card notification-list"><div><span>▤</span><section><b>Content updates</b><p>Your workspace only shows notifications for items assigned to your account.</p><small>Connected to Marketing</small></section></div></div></>
  if (page==='Settings') {let user={};try{user=JSON.parse(localStorage.getItem('user')||'{}')}catch{};return <><div className="ws-page-heading"><div><div className="ws-eyebrow">ACCOUNT</div><h1>Settings</h1><p>Your Wepzo account details.</p></div></div><div className="ws-card settings-user"><i>{user.name?.split(' ').map(part=>part[0]).join('').slice(0,2)||'W'}</i><div><b>{user.name||'Wepzo user'}</b><small>{user.email}</small></div><span className="ws-status connected">Marketing user</span></div></>}
  if (!platforms.length) return <><div className="ws-page-heading"><div><div className="ws-eyebrow">YOUR MARKETING WORKSPACE</div><h1>{page}</h1><p>{page==='Campaigns'?'Campaign information will appear here when the Wepzo Marketing team assigns it to your account.':'Connect an approved platform to make your analytics available here.'}</p></div></div><div className="ws-card integration-empty"><span>{page==='Campaigns'?'◉':'↗'}</span><h3>{page==='Campaigns'?'No campaign data assigned yet':'Analytics integrations are not connected'}</h3><p>{page==='Campaigns'?'Your content and schedule are available in My Content and Content Calendar.':'Wepzo will show real performance data after an authorized social or ads account is connected.'}</p></div></>
  const copy=page==='Social Accounts'?'Click Connect account to open the platform login and approve Wepzo. The Wepzo server must be configured once with that platform’s OAuth app credentials; Wepzo will never ask for your social password.':`Click Connect account to open ${page} login and authorize Wepzo. The Wepzo server needs the provider OAuth app credentials configured first.`
  return <><div className="ws-page-heading"><div><div className="ws-eyebrow">ACCOUNT CONNECTIONS</div><h1>{page}</h1><p>{copy}</p></div></div>{connectionMessage&&<div className="ws-notice" role="status">{connectionMessage}<button onClick={()=>setConnectionMessage('')}>Dismiss</button></div>}<div className="ws-social-grid">{platforms.map((name,index)=>{const key=platformKeys[name];const connection=connections.find(item=>item.platform===key);const connected=Boolean(connection?.connected);const targets=connection?.targets||[];return <article className="ws-card ws-social-card" key={name}><div className="ws-social-top"><span className={`ws-platform-logo ${['peach','blue','red','sky'][index]}`}>{name==='Facebook'?'f':name==='YouTube'?'YT':name==='LinkedIn'?'in':name==='Instagram'?'IG':'AD'}</span><span className={`ws-status ${connected?'connected':'not-connected'}`}>{connected?'Connected':'Not connected'}</span></div><h3>{name}</h3><p>{connected?'Authorized account. Choose the channel that should receive your posts.':'Connect your account through the platform consent page.'}</p>{connected&&targets.length>0&&<label className="ws-account-picker">Publish to<select value={connection.selectedTargetId||''} disabled={connecting===key} onChange={event=>selectTarget(name,event.target.value)}><option value="">Choose an account</option>{targets.map(target=><option value={target.id} key={target.id}>{target.label}</option>)}</select></label>}{connected&&targets.length===0&&<p className="ws-connect-hint">No publishable account was returned. Confirm app permissions, then disconnect and connect again.</p>}<button className="ws-secondary" disabled={connecting===key} onClick={()=>connected?disconnect(name):connect(name)}>{connecting===key?'Please wait...':connected?'Disconnect account':'Connect account'}</button></article>})}</div><p className="ws-integration-note">Select the exact Page, channel, or profile that should receive scheduled content. Wepzo never asks for your social password.</p></>
}

export default function Workspace() {
  const [page,setPage]=useState(()=>{const slug=window.location.hash.split('?')[0].split('/').pop();return ({'social-accounts':'Social Accounts','meta-ads':'Meta Ads','google-ads':'Google Ads','subscription':'Subscription','content-calendar':'Content Calendar','my-content':'My Content','settings':'Settings','analytics':'Analytics','campaigns':'Campaigns','notifications':'Notifications','reels':'Reels'}[slug]||'Dashboard')})
  const [mobileOpen,setMobileOpen]=useState(false)
  const [posts,setPosts]=useState([])
  const [user]=useState(()=>{try{return JSON.parse(localStorage.getItem('user')||'null')}catch{return null}})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [scheduleTarget,setScheduleTarget]=useState(null)
  const [scheduleDate,setScheduleDate]=useState('')
  const [scheduleTime,setScheduleTime]=useState('10:00')
  const [savingSchedule,setSavingSchedule]=useState(false)

  useEffect(()=>{
    let active=true
    const loadContent=()=>marketingRequest('/marketing/content').then(data=>{if(active){setPosts((Array.isArray(data)?data:[]).map(toPost));setError('')}}).catch(err=>{if(active)setError(err.message||'Could not load your assigned content.')}).finally(()=>{if(active)setLoading(false)})
    loadContent()
    const interval=window.setInterval(loadContent,20000)
    window.addEventListener('focus',loadContent)
    return()=>{active=false;window.clearInterval(interval);window.removeEventListener('focus',loadContent)}
  },[])

  const select=name=>{setPage(name);setMobileOpen(false);setNotice('');const slug={'Social Accounts':'social-accounts','Meta Ads':'meta-ads','Google Ads':'google-ads','Content Calendar':'content-calendar','My Content':'my-content'}[name]||name.toLowerCase().replaceAll(' ','-');window.location.hash=`/app/${slug}`}
  const schedule=post=>{
    if(post.status==='SCHEDULED'){
      marketingRequest(`/marketing/content/${post.id}`,{method:'PUT',body:JSON.stringify({status:'CANCELLED'})}).then(updated=>{setPosts(current=>current.map(item=>item.id===post.id?toPost(updated):item));setNotice('Schedule cancelled.')}).catch(err=>setNotice(err.message||'Could not cancel the schedule.'))
      return
    }
    const date=new Date();date.setMinutes(date.getMinutes()+60)
    const localDate=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    setScheduleTarget(post);setScheduleDate(post.publishDate||post.releaseDate||localDate);setScheduleTime(post.publishTime||post.releaseTime||`${String(date.getHours()).padStart(2,'0')}:00`);setNotice('')
  }
  const publishNow=async post=>{
    setNotice(`Sending ${post.type.toLowerCase()} to ${post.platform}...`)
    try{const updated=await marketingRequest(`/marketing/content/${post.id}/publish`,{method:'POST'});setPosts(current=>current.map(item=>item.id===post.id?toPost(updated):item));setNotice('Publishing started. The status will update after the platform responds.')}
    catch(err){setNotice(err.message||`Could not publish to ${post.platform}.`)}
  }
  const confirmSchedule=async event=>{
    event.preventDefault();if(!scheduleTarget)return
    if(new Date(`${scheduleDate}T${scheduleTime}:00`)<=new Date()){setNotice('Choose a publish time in the future.');return}
    setSavingSchedule(true)
    try {const updated=await marketingRequest(`/marketing/content/${scheduleTarget.id}`,{method:'PUT',body:JSON.stringify({status:'SCHEDULED',publishDate:scheduleDate,publishTime:scheduleTime})});setPosts(current=>current.map(item=>item.id===scheduleTarget.id?toPost(updated):item));setNotice('Scheduled. Wepzo will publish to the selected connected account at that time.');setScheduleTarget(null)} catch(err){setNotice(err.message||'Could not schedule this content.')} finally{setSavingSchedule(false)}
  }
  const logout=()=>{localStorage.removeItem('token');localStorage.removeItem('user');localStorage.removeItem('wepzo-website-id');window.location.hash='/login'}

  return <div className="workspace-shell"><aside className={`ws-sidebar ${mobileOpen?'open':''}`}><div className="ws-brand"><Brand href="#/app/dashboard"/><button className="ws-close-sidebar" onClick={()=>setMobileOpen(false)} aria-label="Close menu">×</button></div><div className="ws-workspace-switch"><span className="ws-avatar">{user?.name?.slice(0,1)||'W'}</span><span><b>{user?.name||'Wepzo Marketing'}</b><small>Marketing workspace</small></span><span className="switch-caret">⌄</span></div><div className="ws-nav-label">YOUR WORKSPACE</div><nav className="ws-nav">{navItems.map(([name,icon])=><button key={name} className={(page===name||page==='Dashboard'&&name==='Overview')?'active':''} onClick={()=>select(name)}><span className="ws-nav-icon">{icon}</span>{name}{name==='Notifications'&&posts.some(post=>post.status==='AVAILABLE')&&<i className="ws-nav-badge">!</i>}</button>)}</nav><div className="ws-sidebar-bottom"><div className="ws-profile"><i>{user?.name?.split(' ').map(part=>part[0]).join('').slice(0,2)||'W'}</i><span><b>{user?.name||'Wepzo user'}</b><small>{user?.email||'Marketing account'}</small></span><button title="Sign out" onClick={logout}>↪</button></div></div></aside>
    <main className="ws-main"><header className="ws-topbar"><button className="ws-mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Open menu">☰</button><div className="ws-breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="ws-top-actions"><a className="ws-top-icon" href="mailto:hello@wepzo.com" aria-label="Help">?</a><button className="ws-top-icon has-notice" aria-label="Notifications" onClick={()=>select('Notifications')}>♧</button><button className="ws-top-profile" onClick={()=>select('Settings')} aria-label="Open profile settings"><i className="ws-user-avatar">{user?.name?.split(' ').map(part=>part[0]).join('').slice(0,2)||'W'}</i><span><b>{user?.name||'Wepzo user'}</b><small>Marketing profile</small></span></button></div></header><div className="ws-content"><div className="ws-mode-switch"><span>Signed in to Wepzo Marketing</span><button onClick={logout}>Sign out</button><a href="#/">← Back to website</a></div>{error&&<div className="ws-api-error" role="alert">{error}<button onClick={()=>window.location.reload()}>Retry</button></div>}{notice&&<div className="ws-notice">{notice}<button onClick={()=>setNotice('')}>Dismiss</button></div>}{page==='Dashboard'?<Overview user={user} posts={posts} loading={loading} select={select} onSchedule={schedule} onPublish={publishNow}/>:page==='Content Calendar'?<Calendar posts={posts} onSchedule={schedule}/>:['My Content','Reels'].includes(page)?<ContentPage page={page} posts={posts} loading={loading} onSchedule={schedule} onPublish={publishNow}/>:<IntegrationPage page={page}/>}</div></main>{scheduleTarget&&<div className="auth-backdrop" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&setScheduleTarget(null)}><section className="ws-schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="schedule-title"><button className="auth-close" aria-label="Close" onClick={()=>setScheduleTarget(null)}>×</button><span className="auth-kicker">CONTENT SCHEDULE</span><h2 id="schedule-title">Schedule {scheduleTarget.type.toLowerCase()}</h2><p>{scheduleTarget.title} · {scheduleTarget.platform}</p><form onSubmit={confirmSchedule}><label>Publish date<input type="date" required value={scheduleDate} onChange={event=>setScheduleDate(event.target.value)}/></label><label>Publish time<input type="time" required value={scheduleTime} onChange={event=>setScheduleTime(event.target.value)}/></label><button className="button button-primary auth-submit" disabled={savingSchedule}>{savingSchedule?'Saving…':'Add to schedule →'}</button></form><small>Wepzo will track this schedule. Auto-publishing needs an authorized platform connection.</small></section></div>}</div>
}
