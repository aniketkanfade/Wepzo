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

  ]);

  console.log('Seed completed!');
  console.log('Admin login: admin@wepzo.com / admin123');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
