export const PUBLIC_WELCOME_DEFAULTS = {
  brandName: 'WEPZO',
  brandLogo: '',
  heroEyebrow: 'Your Business  ·  Your Brand  ·  Your Customers',
  heroTitle: 'Create Your Own Online Store with WEPZO',
  heroDescription: 'Launch a branded eCommerce store in minutes, manage products, receive orders and grow your business — all from one powerful platform.',
  heroImage: '',
  primaryButton: 'Get Started Free',
  secondaryButton: 'Watch Demo',
  trustPoints: 'Easy Setup | Go live in minutes\nNo Technical Skills | Simple & Easy to Use\nYour Own Domain | Share your own domain\nGrow Your Business | Manage everything in one place',
  stepsTitle: 'How WEPZO Works',
  stepsSubtitle: 'Get your online store up and running in just a few simple steps',
  steps: 'Create Account | Sign up and register your business\nSet Up Store | Add store details, branding and address\nAdd Products | Manage products, categories and inventory\nStart Selling | Receive orders and grow your business',
  featuresTitle: 'Powerful Features for Your Store',
  featuresSubtitle: 'Everything you need to run and grow your business online',
  features: '🛍️ | Product Management | Add, edit and manage your products with ease\n📦 | Order Management | Track and manage orders all in one place\n🏪 | Inventory Control | Monitor stock and prevent overselling\n👥 | Customer Management | Manage your customers and build loyalty\n📊 | Reports & Analytics | Track sales, orders and business growth\n🌐 | Branded Storefront | Get your own website to sell online',
  ctaTitle: 'Ready to Take Your Business Online?',
  ctaDescription: 'Join WEPZO today and create your own branded online store in minutes.',
  ctaButton: 'Sign Up Now',
  footerTagline: 'Your Business, Online.',
  footerLinks: 'Home | #top\nFeatures | #features\nContact | mailto:support@wepzo.com',
  footerCopyright: '© 2026 WEPZO. All rights reserved.',
  primaryColor: '#ff5b1f',
  secondaryColor: '#173b8f',
  pageBackground: '#fffaf6',
  textColor: '#172033',
};

export function safeBrandLogo(value) {
  const logo = String(value || '').trim();
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)) return logo;
  try {
    const url = new URL(logo);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
