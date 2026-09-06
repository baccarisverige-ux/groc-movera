import { Suspense, useEffect, useMemo, useState } from 'react'
import { GuestLayout } from '../layouts/GuestLayout.jsx'
import { AuthRequiredPage } from '../../features/auth/AuthRequiredPage.jsx'
import { useAuthSession } from '../../features/auth/authSession.js'
import { routeDefinitions, NotFoundPage } from './routes.jsx'
import { toBrowserPath, toInternalPath } from './basePath.js'

const SCROLL_STATE_KEY = '__moveraScrollY'

function readDocumentScrollY() {
  const body = document.body
  if (body?.dataset.moveraSearchLock === 'true' && body.style.position === 'fixed') {
    const lockedTop = Number.parseFloat(body.style.top)
    if (Number.isFinite(lockedTop)) return Math.max(0, -lockedTop)
  }
  return Math.max(0, window.scrollY || window.pageYOffset || 0)
}

function currentHistoryState() {
  return window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
}

function saveCurrentScrollPosition() {
  const state = { ...currentHistoryState(), [SCROLL_STATE_KEY]: readDocumentScrollY() }
  window.history.replaceState(state, '', window.location.href)
}

function restoreScrollPosition(state, fallback = 0) {
  const saved = Number(state?.[SCROLL_STATE_KEY])
  const top = Number.isFinite(saved) ? Math.max(0, saved) : Math.max(0, fallback)
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    window.scrollTo({ top, left: 0, behavior: 'auto' })
  }))
}

function compilePattern(pattern){const keys=[];const source=pattern.split('/').map(segment=>{if(!segment)return'';if(segment.startsWith(':')){keys.push(segment.slice(1));return'([^/]+)'}return segment.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}).join('/');return{regex:new RegExp(`^${source||'/'}$`),keys}}
const compiledRoutes=routeDefinitions.map(route=>({...route,...compilePattern(route.path)}))
function resolveRoute(pathname){for(const route of compiledRoutes){const match=pathname.match(route.regex);if(!match)continue;const params=Object.fromEntries(route.keys.map((key,index)=>[key,decodeURIComponent(match[index+1])]));return{route,params}}return null}

export function navigate(to){
  const browserPath=toBrowserPath(to)
  const currentPath=`${window.location.pathname}${window.location.search}${window.location.hash}`
  if(currentPath===browserPath){
    const state=currentHistoryState()
    window.dispatchEvent(new PopStateEvent('popstate',{state}))
    return
  }
  saveCurrentScrollPosition()
  const nextState = { [SCROLL_STATE_KEY]: 0 }
  window.history.pushState(nextState,'',browserPath)
  window.dispatchEvent(new PopStateEvent('popstate', { state: nextState }))
}

function RouteFallback(){return <section className="route-page" data-testid="route-loading" aria-live="polite"><p>Chargement…</p></section>}

export function AppRouter(){
 const [locationKey,setLocationKey]=useState(()=>`${window.location.pathname}${window.location.search}`)
 const { isAuthenticated } = useAuthSession()
 useEffect(()=>{
  const previousRestoration = 'scrollRestoration' in window.history ? window.history.scrollRestoration : null
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  if (!Number.isFinite(Number(currentHistoryState()[SCROLL_STATE_KEY]))) {
    window.history.replaceState({ ...currentHistoryState(), [SCROLL_STATE_KEY]: readDocumentScrollY() }, '', window.location.href)
  }
  const onPopState=(event)=>{
    setLocationKey(`${window.location.pathname}${window.location.search}`)
    restoreScrollPosition(event.state, 0)
  }
  window.addEventListener('popstate',onPopState)
  return()=>{
    saveCurrentScrollPosition()
    window.removeEventListener('popstate',onPopState)
    if (previousRestoration) window.history.scrollRestoration = previousRestoration
  }
 },[])
 const internalPath=toInternalPath(window.location.pathname)
 const resolved=useMemo(()=>resolveRoute(internalPath),[locationKey,internalPath])
 if(new URLSearchParams(window.location.search).get('__testError')==='1')throw new Error('Phase 4 error-boundary verification')
 if(!resolved)return <GuestLayout currentPath={internalPath} onNavigate={navigate}><NotFoundPage onNavigate={navigate}/></GuestLayout>
 const {route,params}=resolved
 const Page=route.requiresAuth && !isAuthenticated ? AuthRequiredPage : route.component
 const returnTo = `${internalPath}${window.location.search}`
 const pageProps = route.requiresAuth && !isAuthenticated
   ? { feature: route.authFeature || 'cet espace', returnTo, onNavigate: navigate }
   : { params, onNavigate: navigate }
 return <GuestLayout currentPath={internalPath} onNavigate={navigate}><Suspense fallback={<RouteFallback/>}><Page {...pageProps}/></Suspense></GuestLayout>
}
