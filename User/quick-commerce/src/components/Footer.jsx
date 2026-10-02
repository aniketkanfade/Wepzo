import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { CheckCircle2, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { shop } from '../api';
import { useSiteSettings } from '../store/siteSettings';

export default function Footer({ componentEnabled = () => true }) {
  const business = useSiteSettings(s => s.business);
  const setBusiness = useSiteSettings(s => s.setBusiness);
  const name = business.businessName || 'WEPZO';
  const logo = business.businessLogo;
  const contact = <>
    {business.businessPhone && <span>{business.businessPhone}</span>}
    {business.businessEmail && <span>{business.businessEmail}</span>}
    {business.businessAddress && <span>{business.businessAddress}</span>}
  </>;
  useEffect(() => {
    if (!business.businessName) shop.home().then(data => setBusiness(data.business || {})).catch(() => {});
  }, [business.businessName, setBusiness]);
  if (!componentEnabled('quick-commerce-footer')) return null;
  return <footer className="qc-footer">
    <div className="qc-footer-top"><div className="qc-footer-inner">
      <div><Link to="/" className="qc-logo">{logo ? <img src={logo} alt={name} /> : name}</Link><p>Get {name} on your phone<br/>Shop from your favorite local stores.</p><div className="qc-app-buttons"><a href="#google-play">Google Play</a><a href="#app-store">App Store</a></div></div>
      <div><b>Company</b><Link to="/c">About Us</Link><Link to="/c">Careers</Link><Link to="/c">Partner with us</Link><Link to="/c">Delivery Partner</Link></div>
      <div><b>Help</b><Link to="/track">Help &amp; Support</Link><Link to="/track">FAQs</Link><Link to="/track">Returns &amp; Refunds</Link><Link to="/track">Terms &amp; Conditions</Link></div>
      <div><b>Contact Us</b>{contact}</div>
      <div className="qc-footer-benefits"><span><CheckCircle2/>Fast &amp; Easy Shopping</span><span><CheckCircle2/>Exclusive App Offers</span><span><CheckCircle2/>Real-Time Order Tracking</span></div>
    </div></div>
    <div className="qc-footer-bottom"><div><Link to="/" className="qc-logo">{logo ? <img src={logo} alt={name} /> : name}</Link>{business.copyrightText && <span>{business.copyrightText}</span>}</div><div><b>Company</b><Link to="/c">About Us</Link><Link to="/c">Careers</Link></div><div><b>Help</b><Link to="/track">Help &amp; Support</Link><Link to="/track">Returns &amp; Refunds</Link></div><div><b>Contact Us</b>{contact}</div><div className="qc-social"><b>Follow Us</b><span><Facebook/><Instagram/><Youtube/><Linkedin/></span></div></div>
  </footer>;
}