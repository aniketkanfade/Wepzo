require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Component = require('./models/Component');
const Module = require('./models/Module');
const Plan = require('./models/Plan');
const AccessSection = require('./models/AccessSection');
const Role = require('./models/Role');
const { QUICK_COMMERCE_COMPONENTS } = require('./lib/quickCommerceComponents');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}), Component.deleteMany({}), Module.deleteMany({}),
    Plan.deleteMany({}), AccessSection.deleteMany({}), Role.deleteMany({})
  ]);

  const admin = await User.create({
    name: 'Main Admin',
    email: 'admin@wepzo.com',
    password: 'admin123',
    role: 'main_admin',
    accessSections: ['all']
  });

  const accessSections = await AccessSection.insertMany([
    { name: 'Dashboard', slug: 'dashboard', category: 'report' },
    { name: 'Product Management', slug: 'products', category: 'product' },
    { name: 'Order Management', slug: 'orders', category: 'order' },
    { name: 'Promotion Management', slug: 'promotions', category: 'promotion' },
    { name: 'Store Management', slug: 'stores', category: 'store' },
    { name: 'Website Design', slug: 'website_design', category: 'website' },
    { name: 'Reports', slug: 'reports', category: 'report' },
    { name: 'Settings', slug: 'settings', category: 'settings' },
    { name: 'User Management', slug: 'users', category: 'settings' },
    { name: 'Component Management', slug: 'components', category: 'website' },
    { name: 'Plan Management', slug: 'plans', category: 'settings' }
  ]);

  const components = await Component.insertMany([
    {
      name: 'Basic Header', slug: 'basic-header', type: 'header', moduleType: 'general',
      price: 200, description: 'Simple navigation header',
      htmlTemplate: '<header style="background:#2563eb;color:white;padding:16px 32px;display:flex;justify-content:space-between;align-items:center"><h1>WEPZO Store</h1><nav><a href="#" style="color:white;margin:0 12px">Home</a><a href="#" style="color:white;margin:0 12px">Products</a><a href="#" style="color:white;margin:0 12px">Contact</a></nav></header>',
      createdBy: admin._id
    },
    {
      name: 'Hero Banner', slug: 'hero-banner', type: 'hero', moduleType: 'marketing',
      price: 350, description: 'Full-width hero section with CTA',
      htmlTemplate: '<section style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;padding:80px 32px;text-align:center"><h1 style="font-size:48px;margin-bottom:16px">Welcome to Our Store</h1><p style="font-size:20px;margin-bottom:32px">Discover amazing products at great prices</p><button style="background:white;color:#2563eb;padding:12px 32px;border:none;border-radius:8px;font-size:16px;cursor:pointer">Shop Now</button></section>',
      createdBy: admin._id
    },
    {
      name: 'Product Grid', slug: 'product-grid', type: 'product_grid', moduleType: 'ecommerce',
      price: 500, description: 'Grid layout for products',
      htmlTemplate: '<section style="padding:40px 32px"><h2 style="margin-bottom:24px">Featured Products</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px"><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center"><div style="background:#f3f4f6;height:120px;border-radius:4px;margin-bottom:12px"></div><h3>Product 1</h3><p style="color:#2563eb;font-weight:bold">₹999</p></div><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center"><div style="background:#f3f4f6;height:120px;border-radius:4px;margin-bottom:12px"></div><h3>Product 2</h3><p style="color:#2563eb;font-weight:bold">₹1,499</p></div><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center"><div style="background:#f3f4f6;height:120px;border-radius:4px;margin-bottom:12px"></div><h3>Product 3</h3><p style="color:#2563eb;font-weight:bold">₹799</p></div><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center"><div style="background:#f3f4f6;height:120px;border-radius:4px;margin-bottom:12px"></div><h3>Product 4</h3><p style="color:#2563eb;font-weight:bold">₹2,299</p></div></div></section>',
      createdBy: admin._id
    },
    {
      name: 'Footer', slug: 'footer', type: 'footer', moduleType: 'general',
      price: 150, description: 'Standard website footer',
      htmlTemplate: '<footer style="background:#1f2937;color:#9ca3af;padding:40px 32px;text-align:center"><p>&copy; 2026 WEPZO Store. All rights reserved.</p><div style="margin-top:12px"><a href="#" style="color:#9ca3af;margin:0 8px">Privacy</a><a href="#" style="color:#9ca3af;margin:0 8px">Terms</a><a href="#" style="color:#9ca3af;margin:0 8px">Contact</a></div></footer>',
      createdBy: admin._id
    },
    {
      name: 'Newsletter', slug: 'newsletter', type: 'newsletter', moduleType: 'marketing',
      price: 250, description: 'Email subscription section',
      htmlTemplate: '<section style="background:#f9fafb;padding:40px 32px;text-align:center"><h2>Subscribe to Newsletter</h2><p style="margin:12px 0 24px;color:#6b7280">Get latest updates and offers</p><div style="display:flex;justify-content:center;gap:8px"><input type="email" placeholder="Enter email" style="padding:10px 16px;border:1px solid #d1d5db;border-radius:6px;width:300px"><button style="background:#2563eb;color:white;padding:10px 24px;border:none;border-radius:6px">Subscribe</button></div></section>',
      createdBy: admin._id
    },
    {
      name: 'Testimonials', slug: 'testimonials', type: 'testimonial', moduleType: 'marketing',
      price: 300, description: 'Customer testimonials section',
      htmlTemplate: '<section style="padding:40px 32px"><h2 style="text-align:center;margin-bottom:32px">What Our Customers Say</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px"><div style="background:#f9fafb;padding:24px;border-radius:8px"><p>"Amazing products and fast delivery!"</p><p style="margin-top:12px;font-weight:bold">- Rahul S.</p></div><div style="background:#f9fafb;padding:24px;border-radius:8px"><p>"Best shopping experience ever!"</p><p style="margin-top:12px;font-weight:bold">- Priya M.</p></div><div style="background:#f9fafb;padding:24px;border-radius:8px"><p>"Great quality at affordable prices."</p><p style="margin-top:12px;font-weight:bold">- Amit K.</p></div></div></section>',
      createdBy: admin._id
    },
    {
      name: 'Shopping Cart', slug: 'shopping-cart', type: 'cart', moduleType: 'ecommerce',
      price: 400, description: 'Shopping cart component',
      htmlTemplate: '<section style="padding:40px 32px"><h2>Shopping Cart</h2><div style="margin-top:20px;border:1px solid #e5e7eb;border-radius:8px;padding:20px"><div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e5e7eb"><span>Product 1 x 2</span><span>₹1,998</span></div><div style="display:flex;justify-content:space-between;padding:12px 0;font-weight:bold"><span>Total</span><span>₹1,998</span></div><button style="background:#2563eb;color:white;padding:12px 32px;border:none;border-radius:6px;margin-top:16px;width:100%">Checkout</button></div></section>',
      createdBy: admin._id
    },
    {
      name: 'Contact Form', slug: 'contact-form', type: 'contact', moduleType: 'general',
      price: 200, description: 'Contact us form',
      htmlTemplate: '<section style="padding:40px 32px;max-width:600px;margin:0 auto"><h2>Contact Us</h2><form style="margin-top:20px"><input placeholder="Name" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid #d1d5db;border-radius:6px"><input placeholder="Email" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid #d1d5db;border-radius:6px"><textarea placeholder="Message" rows="4" style="width:100%;padding:10px;margin-bottom:12px;border:1px solid #d1d5db;border-radius:6px"></textarea><button style="background:#2563eb;color:white;padding:10px 32px;border:none;border-radius:6px">Send Message</button></form></section>',
      createdBy: admin._id
    },
    ...QUICK_COMMERCE_COMPONENTS.map(component => ({ ...component, createdBy: admin._id }))
  ]);

  await Module.insertMany([
    {
      name: 'Quick Commerce', slug: 'quick-commerce', type: 'quick-commerce',
      description: 'Ready-to-edit quick commerce storefront with location, search, favorites, cart, and product sections',
      components: components.filter(c => ['ecommerce', 'general'].includes(c.moduleType)).map(c => c._id)
    },
    {
      name: 'Marketing', slug: 'marketing', type: 'marketing',
      description: 'Landing pages, newsletters, and promotional sites',
      components: components.filter(c => ['marketing', 'general'].includes(c.moduleType)).map(c => c._id)
    },
    {
      name: 'General', slug: 'general', type: 'general',
      description: 'Basic website with header, footer, and contact',
      components: components.filter(c => c.moduleType === 'general').map(c => c._id)
    }
  ]);

  await Plan.insertMany([
    {
      name: 'Free', slug: 'free', price: 0, maxComponents: 3, maxWebsites: 1,
      subdomainAllowed: false, zipExportAllowed: true, features: ['3 Components', '1 Website', 'ZIP Export'],
      createdBy: admin._id
    },
    {
      name: 'Starter', slug: 'starter', price: 999, maxComponents: 10, maxWebsites: 2,
      subdomainAllowed: true, zipExportAllowed: true, features: ['10 Components', '2 Websites', 'Subdomain', 'ZIP Export'],
      createdBy: admin._id
    },
    {
      name: 'Pro', slug: 'pro', price: 2999, maxComponents: 50, maxWebsites: 5,
      subdomainAllowed: true, zipExportAllowed: true, customDomainAllowed: true,
      features: ['50 Components', '5 Websites', 'Subdomain', 'Custom Domain', 'ZIP Export', 'Priority Support'],
      createdBy: admin._id
    }
  ]);

  await Role.insertMany([
    { name: 'Main Admin', slug: 'main_admin', type: 'main_admin', accessSections: accessSections.map(s => s.slug), createdBy: admin._id },
    { name: 'Store Admin', slug: 'store_admin', type: 'store_admin', accessSections: ['dashboard', 'products', 'orders', 'website_design'], createdBy: admin._id },
    { name: 'Subdomain User', slug: 'subdomain_user', type: 'subdomain_user', accessSections: ['dashboard', 'website_design'], createdBy: admin._id },
    { name: 'Employee', slug: 'employee', type: 'employee', accessSections: ['dashboard', 'products', 'orders'], createdBy: admin._id }
  ]);

  console.log('Seed completed!');
  console.log('Admin login: admin@wepzo.com / admin123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
