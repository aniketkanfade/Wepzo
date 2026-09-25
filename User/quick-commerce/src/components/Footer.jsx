import { Link } from 'react-router-dom';
import { CheckCircle2, Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';

export default function Footer() {
  return <footer className="qc-footer">
    <div className="qc-footer-top"><div className="qc-footer-inner">
      <div><Link to="/" className="qc-logo">WEPZO</Link><p>Get WEPZO on your phone<br/>Shop from your favorite local stores.</p><div className="qc-app-buttons"><a href="#google-play">Google Play</a><a href="#app-store">App Store</a></div></div>
      <div><b>Company</b><Link to="/c">About Us</Link><Link to="/c">Careers</Link><Link to="/c">Partner with us</Link><Link to="/c">Delivery Partner</Link></div>
      <div><b>Help</b><Link to="/track">Help &amp; Support</Link><Link to="/track">FAQs</Link><Link to="/track">Returns &amp; Refunds</Link><Link to="/track">Terms &amp; Conditions</Link></div>
      <div><b>Contact Us</b><span>+91 95524 37869</span><span>info@wepzo.in</span><span>Nagpur, Maharashtra</span></div>
      <div className="qc-footer-benefits"><span><CheckCircle2/>Fast &amp; Easy Shopping</span><span><CheckCircle2/>Exclusive App Offers</span><span><CheckCircle2/>Real-Time Order Tracking</span></div>
    </div></div>
    <div className="qc-footer-bottom"><Link to="/" className="qc-logo">WEPZO</Link><div><b>Company</b><Link to="/c">About Us</Link><Link to="/c">Careers</Link></div><div><b>Help</b><Link to="/track">Help &amp; Support</Link><Link to="/track">Returns &amp; Refunds</Link></div><div><b>Contact Us</b><span>+91 95524 37869</span><span>Nagpur, Maharashtra</span></div><div className="qc-social"><b>Follow Us</b><span><Facebook/><Instagram/><Youtube/><Linkedin/></span></div></div>
  </footer>;
}