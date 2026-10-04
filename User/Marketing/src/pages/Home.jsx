import React from 'react'
import { BrandingProvider } from '../BrandingContext.jsx'
import Header from '../components/Header.jsx'
import Hero from '../components/Hero.jsx'
import ServiceCards from '../components/ServiceCards.jsx'
import TrustedBrands from '../components/TrustedBrands.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import Footer from '../components/Footer.jsx'
export default function Home() {
  return <BrandingProvider><Header /><main><Hero /><ServiceCards /><TrustedBrands /><HowItWorks /></main><Footer /></BrandingProvider>
}
