const productCards = `
  <article style="border:1px solid #e7ece8;border-radius:10px;padding:10px"><span style="float:right;color:#d94f64;font-size:20px">&hearts;</span><img src="https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=360&auto=format&fit=crop" alt="Apples" style="width:100%;height:105px;object-fit:contain"><b>Red Apples</b><p style="color:#69756c;font-size:12px">4 pcs</p><b>&#8377;120</b> <button type="button" style="float:right;border:1px solid #16834b;background:white;color:#16834b;border-radius:5px;padding:5px 12px">Add</button></article>
  <article style="border:1px solid #e7ece8;border-radius:10px;padding:10px"><span style="float:right;color:#d94f64;font-size:20px">&hearts;</span><img src="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=360&auto=format&fit=crop" alt="Bananas" style="width:100%;height:105px;object-fit:contain"><b>Fresh Bananas</b><p style="color:#69756c;font-size:12px">6 pcs</p><b>&#8377;48</b> <button type="button" style="float:right;border:1px solid #16834b;background:white;color:#16834b;border-radius:5px;padding:5px 12px">Add</button></article>
  <article style="border:1px solid #e7ece8;border-radius:10px;padding:10px"><span style="float:right;color:#d94f64;font-size:20px">&hearts;</span><img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=360&auto=format&fit=crop" alt="Bakery bread" style="width:100%;height:105px;object-fit:contain"><b>Fresh Bakery Bread</b><p style="color:#69756c;font-size:12px">400 g</p><b>&#8377;55</b> <button type="button" style="float:right;border:1px solid #16834b;background:white;color:#16834b;border-radius:5px;padding:5px 12px">Add</button></article>
`;

const createComponent = (name, slug, type, group, price, description, htmlTemplate) => ({
  name, slug, type, group, moduleType: 'ecommerce', price, description, htmlTemplate
});

const QUICK_COMMERCE_COMPONENTS = [
  createComponent('Store Logo', 'quick-commerce-header', 'header', 'Header', 50, 'Your storefront name and logo',
    '<a href="#" style="font:700 22px Arial,sans-serif;color:#16834b;text-decoration:none">FreshCart</a>'),
  createComponent('Delivery Location', 'quick-commerce-location', 'custom', 'Header', 100, 'Delivery address selector with ETA dropdown',
    '<details style="font:13px Arial,sans-serif;min-width:130px"><summary style="cursor:pointer;list-style:none"><b style="color:#e65340">15-20 min</b><br><small>Deliver to: Home, Nagpur &#9662;</small></summary><div style="position:absolute;z-index:2;background:white;padding:14px;border:1px solid #ddd;border-radius:8px">Use current location<br><br>Home address<br><br>Work address</div></details>'),
  createComponent('Product Search Bar', 'quick-commerce-search', 'custom', 'Header', 120, 'Search products, brands, and categories',
    '<form style="display:flex;flex:1;min-width:180px;border:1px solid #dce5dd;border-radius:9px;overflow:hidden"><input aria-label="Search products" placeholder="Search groceries, brands and more..." style="flex:1;min-width:0;padding:11px;border:0;background:#f8faf8"><button type="button" style="padding:0 14px;border:0;background:#16834b;color:white">Search</button></form>'),
  createComponent('Category Navigation', 'quick-commerce-categories', 'navbar', 'Header', 120, 'Quick links to store categories',
    '<nav style="display:flex;gap:14px;overflow:auto;padding:10px 0;font:13px Arial,sans-serif;white-space:nowrap"><a href="#home">Home</a><a href="#grocery">Grocery</a><a href="#fruits">Fresh Fruits</a><a href="#dairy">Dairy</a><a href="#snacks">Snacks</a><a href="#offers">Offers</a></nav>'),
  createComponent('Favorites Button', 'quick-commerce-favorites', 'custom', 'Header', 70, 'Link to saved products with count',
    '<a href="#favorites" style="font:13px Arial,sans-serif;color:#374151;text-decoration:none;white-space:nowrap">&#9825; Favorites <b style="color:#d94f64">0</b></a>'),
  createComponent('Cart Button', 'quick-commerce-cart', 'cart', 'Header', 80, 'Cart link with item count',
    '<a href="#cart" style="font:13px Arial,sans-serif;color:#16834b;text-decoration:none;white-space:nowrap">&#128722; Cart <b>0</b></a>'),
  createComponent('Profile Menu', 'quick-commerce-profile', 'custom', 'Header', 80, 'Account menu with sign-in and profile actions',
    '<details style="font:13px Arial,sans-serif"><summary style="cursor:pointer;list-style:none;white-space:nowrap">&#9786; Account &#9662;</summary><div style="position:absolute;z-index:2;background:white;padding:12px;border:1px solid #ddd;border-radius:8px">Sign in<br><br>My profile<br><br>My orders</div></details>'),
  createComponent('Quick Delivery Offer Banner', 'quick-commerce-offer-banner', 'banner', 'Storefront', 180, 'Promotional banner for quick delivery offers',
    '<section style="display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:24px;background:#f0f7ec;border-radius:12px;font-family:Arial,sans-serif"><div><small style="color:#16834b;font-weight:bold">FRESH PICKS, FAST DELIVERY</small><h1 style="font-size:clamp(24px,4vw,38px);margin:8px 0">Good food, right on time.</h1><p>Everyday essentials delivered in minutes.</p><button type="button" style="padding:10px 16px;border:0;border-radius:6px;background:#16834b;color:white">Shop groceries</button></div><img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=640&auto=format&fit=crop" alt="Fresh produce" style="width:min(38%,320px);min-width:160px;height:160px;object-fit:cover;border-radius:9px"></section>'),
  createComponent('Shop Categories', 'quick-commerce-category-tiles', 'custom', 'Storefront', 150, 'Category tiles for grocery departments',
    '<section style="font-family:Arial,sans-serif"><h2>Shop by category</h2><div style="display:flex;gap:10px;overflow:auto"><a href="#fruits" style="padding:14px;background:#f1f8ef;border-radius:9px;white-space:nowrap">Fresh produce</a><a href="#dairy" style="padding:14px;background:#f1f8ef;border-radius:9px;white-space:nowrap">Dairy & eggs</a><a href="#bakery" style="padding:14px;background:#f1f8ef;border-radius:9px;white-space:nowrap">Bakery</a><a href="#snacks" style="padding:14px;background:#f1f8ef;border-radius:9px;white-space:nowrap">Snacks</a></div></section>'),
  createComponent('Nearby Stores', 'quick-commerce-nearby-stores', 'custom', 'Storefront', 180, 'Local stores with estimated delivery time',
    '<section style="font-family:Arial,sans-serif"><h2>Popular near you</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px"><article style="padding:12px;border:1px solid #e5e7eb;border-radius:10px"><img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop" alt="Fresh vegetables" style="width:100%;height:100px;object-fit:cover;border-radius:7px"><b>Farm Fresh Vegetables</b><br><small>Fresh picks | 15 min</small></article><article style="padding:12px;border:1px solid #e5e7eb;border-radius:10px"><img src="https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&auto=format&fit=crop" alt="Dairy products" style="width:100%;height:100px;object-fit:cover;border-radius:7px"><b>Daily Dairy Store</b><br><small>Milk, eggs & more | 20 min</small></article></div></section>'),
  createComponent('Quick Commerce Product Grid', 'quick-commerce-product-grid', 'product_grid', 'Storefront', 250, 'Product cards with favorites, prices, and add-to-cart buttons',
    `<section style="font-family:Arial,sans-serif"><h2>Best sellers</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px">${productCards}</div></section>`),
  createComponent('Flash Deals', 'quick-commerce-flash-deals', 'product_grid', 'Storefront', 180, 'Quick Commerce deals carousel from the live product catalog',
    '<section><h2>Best deals for you</h2><p>Live flash deals from your catalog</p></section>'),
  createComponent('Brand Section', 'quick-commerce-brand-section', 'custom', 'Storefront', 120, 'Brand directory from the live catalog',
    '<section><h2>Top brands</h2><p>Showcase brands from your product catalog</p></section>'),
  createComponent('Product Listing Page', 'quick-commerce-product-listing', 'product_grid', 'Shopping', 300, 'Product browsing, filters, category search, and sorting page',
    '<section><h2>Product listing</h2><p>Opens the live product catalog page</p></section>'),
  createComponent('Product Details Page', 'quick-commerce-product-details', 'custom', 'Shopping', 220, 'Product details, reviews, wishlist, and add-to-cart page',
    '<section><h2>Product details</h2><p>Opens the live product details page</p></section>'),
  createComponent('Cart Page', 'quick-commerce-cart-page', 'cart', 'Shopping', 180, 'Full cart page with quantities and order summary',
    '<section><h2>Shopping cart</h2><p>Opens the live cart page</p></section>'),
  createComponent('Checkout Page', 'quick-commerce-checkout', 'checkout', 'Shopping', 250, 'Address, delivery, payment, and order placement flow',
    '<section><h2>Checkout</h2><p>Opens the live checkout flow</p></section>'),
  createComponent('Order Tracking', 'quick-commerce-order-tracking', 'custom', 'Shopping', 150, 'Order status and delivery tracking pages',
    '<section><h2>Order tracking</h2><p>Opens live order tracking</p></section>'),
  createComponent('Customer Account', 'quick-commerce-account', 'custom', 'Customer', 150, 'Customer sign-in, registration, and profile access',
    '<section><h2>Customer account</h2><p>Opens sign-in and account routes</p></section>'),
  createComponent('Wishlist Page', 'quick-commerce-wishlist', 'custom', 'Customer', 120, 'Saved products and wishlist listing',
    '<section><h2>Wishlist</h2><p>Opens the live saved products list</p></section>'),
  createComponent('Store Footer', 'quick-commerce-footer', 'footer', 'Footer', 100, 'Store contact, help, and policy links',
    '<footer style="padding:22px;background:#f5f8f5;color:#657168;font:13px Arial,sans-serif"><b style="font-size:18px;color:#16834b">FreshCart</b><p>About us &nbsp; Help &nbsp; Contact &nbsp; Privacy</p></footer>'),
  createComponent('Flash Deals', 'quick-commerce-flash-deals', 'product_grid', 'Storefront', 180, 'Live deals carousel from the product catalog',
    '<section><h2>Best deals for you</h2><p>Live flash deals from your catalog</p></section>'),
  createComponent('Brand Section', 'quick-commerce-brand-section', 'custom', 'Storefront', 120, 'Brand directory from the live catalog',
    '<section><h2>Top brands</h2><p>Showcase brands from your product catalog</p></section>'),
  createComponent('Product Listing Page', 'quick-commerce-product-listing', 'product_grid', 'Shopping', 300, 'Product browsing, filters, category search, and sorting page',
    '<section><h2>Product listing</h2><p>Opens the live product catalog page</p></section>'),
  createComponent('Product Details Page', 'quick-commerce-product-details', 'custom', 'Shopping', 220, 'Product details, reviews, wishlist, and add-to-cart page',
    '<section><h2>Product details</h2><p>Opens the live product details page</p></section>'),
  createComponent('Cart Page', 'quick-commerce-cart-page', 'cart', 'Shopping', 180, 'Full cart page with quantities and order summary',
    '<section><h2>Shopping cart</h2><p>Opens the live cart page</p></section>'),
  createComponent('Checkout Page', 'quick-commerce-checkout', 'checkout', 'Shopping', 250, 'Address, delivery, payment, and order placement flow',
    '<section><h2>Checkout</h2><p>Opens the live checkout flow</p></section>'),
  createComponent('Order Tracking', 'quick-commerce-order-tracking', 'custom', 'Shopping', 150, 'Order status and delivery tracking pages',
    '<section><h2>Order tracking</h2><p>Opens live order tracking</p></section>'),
  createComponent('Customer Account', 'quick-commerce-account', 'custom', 'Customer', 150, 'Customer sign-in, registration, and profile access',
    '<section><h2>Customer account</h2><p>Opens sign-in and account routes</p></section>'),
  createComponent('Wishlist Page', 'quick-commerce-wishlist', 'custom', 'Customer', 120, 'Saved products and wishlist listing',
    '<section><h2>Wishlist</h2><p>Opens the live saved products list</p></section>')
];

module.exports = { QUICK_COMMERCE_COMPONENTS };