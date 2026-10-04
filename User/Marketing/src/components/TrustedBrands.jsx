import React from 'react'

const brands = ['TITAN', 'SAMSUNG', 'boAt', '◉ LG', 'hp', 'Lenovo', '◉ Logitech', 'ZEBRONICS', 'asianpaints', '◈ HAVELLS']
export default function TrustedBrands() {
  return <section className="trusted-brands" id="about"><h2>Trusted by Businesses Across India</h2><div className="brand-list">{brands.map(brand => <span key={brand}>{brand}</span>)}</div></section>
}
