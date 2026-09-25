const { v4: uuidv4 } = require('uuid');

function seedCategorySpecifications() {
  const configs = [
    {
      mainCategory: "Women's Fashion",
      fields: [
        { key: 'size', label: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        { key: 'fabric', label: 'Fabric', options: ['Cotton', 'Silk', 'Rayon', 'Georgette', 'Chiffon'] },
        { key: 'color', label: 'Color', options: ['Red', 'Blue', 'Black', 'White', 'Pink', 'Maroon'] },
        { key: 'fit', label: 'Fit', options: ['Regular', 'Slim', 'Loose', 'Anarkali'] },
        { key: 'pattern', label: 'Pattern', options: ['Solid', 'Printed', 'Embroidered', 'Floral'] },
        { key: 'sleeve', label: 'Sleeve', options: ['Full Sleeve', 'Half Sleeve', 'Sleeveless'] },
        { key: 'neck', label: 'Neck', options: ['Round Neck', 'V-Neck', 'Boat Neck', 'Collar'] },
        { key: 'occasion', label: 'Occasion', options: ['Casual', 'Party', 'Wedding', 'Office'] },
      ],
    },
    {
      mainCategory: "Men's Fashion",
      fields: [
        { key: 'size', label: 'Size', options: ['S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36'] },
        { key: 'fabric', label: 'Fabric', options: ['Cotton', 'Polyester', 'Linen', 'Denim'] },
        { key: 'color', label: 'Color', options: ['Black', 'White', 'Blue', 'Grey', 'Navy'] },
        { key: 'fit', label: 'Fit', options: ['Regular', 'Slim', 'Loose'] },
        { key: 'pattern', label: 'Pattern', options: ['Solid', 'Striped', 'Checked'] },
        { key: 'sleeve', label: 'Sleeve', options: ['Full Sleeve', 'Half Sleeve'] },
      ],
    },
    {
      mainCategory: 'Electronics',
      fields: [
        { key: 'model', label: 'Model', options: [] },
        { key: 'warranty', label: 'Warranty', options: ['6 Months', '1 Year', '2 Years', '3 Years'] },
        { key: 'color', label: 'Color', options: ['Black', 'White', 'Silver', 'Grey'] },
        { key: 'connectivity', label: 'Connectivity', options: ['WiFi', 'Bluetooth', 'USB', 'HDMI', 'Aux'] },
        { key: 'power', label: 'Power', options: ['50W', '100W', '200W', '500W'] },
        { key: 'voltage', label: 'Voltage', options: ['110V', '220V', '240V'] },
      ],
    },
    {
      mainCategory: 'Mobiles & Tablets',
      fields: [
        { key: 'ram', label: 'RAM', options: ['4GB', '6GB', '8GB', '12GB', '16GB'] },
        { key: 'storage', label: 'Storage', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
        { key: 'display', label: 'Display', options: ['5.5"', '6.1"', '6.4"', '6.7"', '10.9"', '12.9"'] },
        { key: 'battery', label: 'Battery', options: ['4000mAh', '5000mAh', '6000mAh'] },
        { key: 'camera', label: 'Camera', options: ['12MP', '48MP', '50MP', '108MP'] },
        { key: 'os', label: 'OS', options: ['Android', 'iOS', 'iPadOS'] },
      ],
    },
    {
      mainCategory: 'Groceries',
      fields: [
        { key: 'weight', label: 'Weight', options: ['250g', '500g', '1kg', '2kg', '5kg'] },
        { key: 'pack_type', label: 'Pack Type', options: ['Pouch', 'Box', 'Bottle', 'Jar'] },
        { key: 'expiry', label: 'Shelf Life', options: ['3 Months', '6 Months', '1 Year'] },
        { key: 'organic', label: 'Organic', options: ['Yes', 'No'] },
      ],
    },
    {
      mainCategory: 'Footwear',
      fields: [
        { key: 'size', label: 'Size', options: ['5', '6', '7', '8', '9', '10', '11'] },
        { key: 'material', label: 'Material', options: ['Leather', 'Canvas', 'Mesh', 'Synthetic'] },
        { key: 'color', label: 'Color', options: ['Black', 'White', 'Brown', 'Blue', 'Red'] },
        { key: 'type', label: 'Type', options: ['Casual', 'Sports', 'Formal', 'Sandals'] },
      ],
    },
    {
      mainCategory: 'Accessories',
      fields: [
        { key: 'color', label: 'Color', options: ['Black', 'Brown', 'Gold', 'Silver'] },
        { key: 'material', label: 'Material', options: ['Leather', 'Metal', 'Plastic', 'Fabric'] },
        { key: 'type', label: 'Type', options: ['Belt', 'Bag', 'Watch', 'Sunglasses'] },
      ],
    },
    {
      mainCategory: "Kids' Fashion",
      fields: [
        { key: 'size', label: 'Size', options: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y'] },
        { key: 'color', label: 'Color', options: ['Red', 'Blue', 'Pink', 'Yellow', 'Green'] },
        { key: 'fabric', label: 'Fabric', options: ['Cotton', 'Polyester', 'Denim'] },
      ],
    },
    {
      mainCategory: 'Home & Living',
      fields: [
        { key: 'material', label: 'Material', options: ['Wood', 'Metal', 'Plastic', 'Glass', 'Fabric'] },
        { key: 'color', label: 'Color', options: ['White', 'Brown', 'Black', 'Grey', 'Beige'] },
        { key: 'dimension', label: 'Dimension', options: ['Small', 'Medium', 'Large'] },
      ],
    },
    {
      mainCategory: 'Beauty & Health',
      fields: [
        { key: 'volume', label: 'Volume', options: ['50ml', '100ml', '200ml', '500ml'] },
        { key: 'skin_type', label: 'Skin Type', options: ['Oily', 'Dry', 'Combination', 'Sensitive'] },
        { key: 'brand_line', label: 'Brand Line', options: ['Premium', 'Regular', 'Organic'] },
      ],
    },
    {
      mainCategory: 'Sports & Fitness',
      fields: [
        { key: 'size', label: 'Size', options: ['S', 'M', 'L', 'XL'] },
        { key: 'color', label: 'Color', options: ['Black', 'Blue', 'Red', 'Grey'] },
        { key: 'weight', label: 'Weight', options: ['Light', 'Medium', 'Heavy'] },
      ],
    },
    {
      mainCategory: 'Books & Stationery',
      fields: [
        { key: 'pages', label: 'Pages', options: ['100', '200', '300', '500'] },
        { key: 'type', label: 'Type', options: ['Notebook', 'Pen', 'Marker', 'File'] },
        { key: 'size', label: 'Size', options: ['A4', 'A5', 'B5'] },
      ],
    },
    {
      mainCategory: 'Computers & Laptops',
      fields: [
        { key: 'ram', label: 'RAM', options: ['8GB', '16GB', '32GB'] },
        { key: 'storage', label: 'Storage', options: ['256GB', '512GB', '1TB'] },
        { key: 'processor', label: 'Processor', options: ['Intel i5', 'Intel i7', 'Ryzen 5', 'Ryzen 7'] },
        { key: 'display', label: 'Display', options: ['13"', '14"', '15.6"', '16"'] },
      ],
    },
  ];

  return configs.map((c, i) => ({ _id: uuidv4(), configId: i + 1, ...c }));
}

function seedCategoryVariants() {
  const configs = [
    {
      mainCategory: "Women's Fashion",
      attributes: [
        { name: 'Color', options: ['Red', 'Blue', 'Black', 'White', 'Pink', 'Maroon', 'Green'] },
        { name: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      ],
    },
    {
      mainCategory: "Men's Fashion",
      attributes: [
        { name: 'Color', options: ['Black', 'White', 'Blue', 'Grey', 'Navy'] },
        { name: 'Size', options: ['S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '36'] },
      ],
    },
    {
      mainCategory: 'Electronics',
      attributes: [
        { name: 'Color', options: ['Black', 'White', 'Silver'] },
        { name: 'Model', options: ['Standard', 'Pro', 'Max', 'Plus'] },
      ],
    },
    {
      mainCategory: 'Mobiles & Tablets',
      attributes: [
        { name: 'Color', options: ['Black', 'White', 'Blue', 'Green', 'Purple'] },
        { name: 'RAM', options: ['4GB', '6GB', '8GB', '12GB'] },
        { name: 'Storage', options: ['64GB', '128GB', '256GB', '512GB'] },
      ],
    },
    {
      mainCategory: 'Footwear',
      attributes: [
        { name: 'Color', options: ['Black', 'White', 'Brown', 'Blue'] },
        { name: 'Size', options: ['6', '7', '8', '9', '10', '11'] },
      ],
    },
    {
      mainCategory: 'Groceries',
      attributes: [
        { name: 'Weight', options: ['250g', '500g', '1kg', '2kg'] },
        { name: 'Pack', options: ['Single', 'Combo', 'Family Pack'] },
      ],
    },
    {
      mainCategory: 'Accessories',
      attributes: [
        { name: 'Color', options: ['Black', 'Brown', 'Gold', 'Silver'] },
        { name: 'Size', options: ['S', 'M', 'L', 'Free Size'] },
      ],
    },
    {
      mainCategory: "Kids' Fashion",
      attributes: [
        { name: 'Color', options: ['Red', 'Blue', 'Pink', 'Yellow'] },
        { name: 'Size', options: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'] },
      ],
    },
    {
      mainCategory: 'Home & Living',
      attributes: [
        { name: 'Color', options: ['White', 'Brown', 'Black', 'Grey'] },
        { name: 'Size', options: ['Small', 'Medium', 'Large'] },
      ],
    },
    {
      mainCategory: 'Beauty & Health',
      attributes: [
        { name: 'Volume', options: ['50ml', '100ml', '200ml'] },
        { name: 'Type', options: ['Cream', 'Serum', 'Lotion', 'Oil'] },
      ],
    },
    {
      mainCategory: 'Sports & Fitness',
      attributes: [
        { name: 'Color', options: ['Black', 'Blue', 'Red', 'Grey'] },
        { name: 'Size', options: ['S', 'M', 'L', 'XL'] },
      ],
    },
    {
      mainCategory: 'Books & Stationery',
      attributes: [
        { name: 'Size', options: ['A4', 'A5', 'B5'] },
        { name: 'Type', options: ['Ruled', 'Plain', 'Grid'] },
      ],
    },
    {
      mainCategory: 'Computers & Laptops',
      attributes: [
        { name: 'RAM', options: ['8GB', '16GB', '32GB'] },
        { name: 'Storage', options: ['256GB', '512GB', '1TB'] },
      ],
    },
  ];

  return configs.map((c, i) => ({ _id: uuidv4(), configId: i + 1, ...c }));
}

module.exports = { seedCategorySpecifications, seedCategoryVariants };
