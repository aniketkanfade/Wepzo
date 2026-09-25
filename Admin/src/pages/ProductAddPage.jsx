import { useState, useEffect, useCallback } from 'react';
import {
  PackagePlus, Tag, Store, DollarSign, Ruler, Layers, Trash2, Plus, Info, Lock
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Toggle from '../components/Toggle';
import SectionCard from '../components/SectionCard';
import SearchableSelect from '../components/SearchableSelect';
import SearchableMultiSelect from '../components/SearchableMultiSelect';
import SearchableCreatableSelect from '../components/SearchableCreatableSelect';
import ProductMediaUpload from '../components/ProductMediaUpload';
import ImageAddGallery from '../components/ImageAddGallery';
import ViewableImage from '../components/ViewableImage';
import AttributeValueChips from '../components/AttributeValueChips';
import { PageCard, PageCardHeader } from '../components/PageCard';
import { capitalizeWords } from '../utils/mediaUtils';
import { isColorAttribute, getColorHex, hashColor } from '../utils/colorMap';
import { buildVariantSpecs } from '../components/VariantSpecPanel';

const ATTRIBUTE_PRESETS = {
  color: ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Pink', 'Grey', 'Brown', 'Navy', 'Maroon', 'Beige'],
  size: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40'],
  weight: ['250g', '500g', '1kg', '2kg', '5kg'],
  width: ['6 Inch', '8 Inch', '10 Inch', '12 Inch'],
  height: ['6 Inch', '8 Inch', '10 Inch', '12 Inch'],
  length: ['12 Inch', '24 Inch', '36 Inch', '48 Inch'],
  material: ['Cotton', 'Polyester', 'Leather', 'Silk', 'Wool', 'Plastic', 'Metal'],
  pattern: ['Solid', 'Printed', 'Striped', 'Checked', 'Floral'],
  capacity: ['32GB', '64GB', '128GB', '256GB', '500ml', '1L', '2L'],
  gb: ['4GB', '8GB', '16GB', '32GB', '64GB'],
  ram: ['4GB', '6GB', '8GB', '12GB', '16GB'],
  fit: ['Regular', 'Slim', 'Loose', 'Oversized'],
  style: ['Casual', 'Formal', 'Sporty', 'Ethnic'],
  sleeve: ['Full Sleeve', 'Half Sleeve', 'Sleeveless'],
  neck: ['Round Neck', 'V-Neck', 'Collar', 'Boat Neck'],
  occasion: ['Casual', 'Party', 'Wedding', 'Office'],
};

function variantKey(attrs) {
  return Object.entries(attrs).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join('|');
}

function getVariantImages(variant) {
  if (!variant) return [];
  if (variant.images?.length) return variant.images;
  if (variant.image) return [variant.image];
  return [];
}

function buildVariants(attrs, attributeValues, existing = [], excluded = []) {
  const active = attrs.filter(a => (attributeValues[a] || []).length > 0);
  if (active.length === 0) return [];

  const combos = [];
  const walk = (i, cur) => {
    if (i === active.length) { combos.push({ ...cur }); return; }
    for (const v of attributeValues[active[i]]) walk(i + 1, { ...cur, [active[i]]: v });
  };
  walk(0, {});

  const map = new Map(existing.map(v => [variantKey(v.attributes), v]));
  return combos
    .filter(a => !excluded.includes(variantKey(a)))
    .map(a => {
      const key = variantKey(a);
      const existing = map.get(key);
      const attrSpecs = Object.fromEntries(Object.entries(a));
      if (existing) {
        const imgs = getVariantImages(existing);
        return {
          ...existing, attributes: a,
          specifications: { ...attrSpecs, ...(existing.specifications || {}) },
          images: imgs, image: imgs[0] || '',
        };
      }
      return {
        id: crypto.randomUUID(), attributes: a, specifications: attrSpecs,
        extraSpecFields: [], images: [], image: '', price: '', stock: '', sku: '',
        discount: 0, discountType: 'Percent',
        licenceNumber: '', warranty: false, guarantee: false, exchange: false,
      };
    });
}

const empty = {
  name: '', nameEn: '', shortDesc: '', shortDescEn: '', image: '', images: [], video: '',
  storeId: '', store: '', mainCategory: '', subCategory: '', childCategory: '', brand: '', unit: '', productCode: '', sku: '', barcode: '', deliveryMode: 'Home Delivery',
  tags: '', licenceNumber: '', warranty: false, guarantee: false, exchange: false,
  price: '', discount: 0, discountType: 'Percent', maxPurchaseQty: 10, stock: 0,
  status: 'Pending',
  quickCommerce: true,
  hasSpecifications: false, specifications: {},
  extraSpecFields: [],
  hasVariants: false, selectedAttributes: [], attributeValues: {}, variants: [], excludedVariants: [],
  extraVariantAttributes: [],
};

function mapItemToForm(item) {
  return {
    ...empty,
    ...item,
    tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
    price: item.price ?? '',
    stock: item.stock ?? 0,
    discount: item.discount ?? 0,
    images: item.images || [],
    video: item.video || '',
    image: item.image || '',
    status: item.status || 'Pending',
    hasSpecifications: item.hasSpecifications || false,
    specifications: item.specifications || {},
    extraSpecFields: item.extraSpecFields || [],
    hasVariants: item.hasVariants || false,
    selectedAttributes: item.selectedAttributes || [],
    attributeValues: item.attributeValues || {},
    variants: (item.variants || []).map(v => {
      const imgs = v.images?.length ? v.images : (v.image ? [v.image] : []);
      return { ...v, images: imgs, image: imgs[0] || '' };
    }),
    excludedVariants: item.excludedVariants || [],
    extraVariantAttributes: item.extraVariantAttributes || [],
    quickCommerce: true,
  };
}

function CapInput({ value, onChange, className = '', ...props }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={e => onChange(capitalizeWords(e.target.value))}
      className={className}
      {...props}
    />
  );
}

function CapTextarea({ value, onChange, className = '', ...props }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={e => onChange(capitalizeWords(e.target.value))}
      className={className}
      {...props}
    />
  );
}

export default function ProductAddPage() {
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [childCategories, setChildCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [stores, setStores] = useState([]);
  const [catSpecFields, setCatSpecFields] = useState([]);
  const [catVariantAttrs, setCatVariantAttrs] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('edit');
  const requestEditId = searchParams.get('requestEdit');
  const presetStoreId = searchParams.get('storeId');
  const isRequestEdit = !!requestEditId;

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/sub-categories').then(r => setSubCategories(r.data)).catch(() => {});
    api.get('/child-categories').then(r => setChildCategories(r.data)).catch(() => {});
    api.get('/brands').then(r => setBrands(r.data)).catch(() => {});
    api.get('/units').then(r => setUnits(r.data)).catch(() => {});
    api.get('/stores', { params: { filter: 'list' } }).then(r => setStores(r.data)).catch(() => {});
    if (requestEditId) {
      api.get('/product-requests').then(r => {
        const item = r.data.find(p => p._id === requestEditId);
        if (item) setForm(mapItemToForm(item));
      });
    } else if (editId) {
      api.get('/product-items').then(r => {
        const item = r.data.find(p => p._id === editId);
        if (item) setForm(mapItemToForm(item));
      });
    }
  }, [editId, requestEditId]);

  useEffect(() => {
    if (!stores.length) return;
    if (presetStoreId && !editId && !requestEditId) {
      const s = stores.find(x => String(x.storeId) === String(presetStoreId));
      if (s) setForm(f => ({ ...f, storeId: s.storeId, store: s.name }));
      return;
    }
    if (form.storeId) return;
    const s = stores.find(x => x.name === form.store);
    if (s) setForm(f => ({ ...f, storeId: s.storeId }));
  }, [stores, form.store, form.storeId, presetStoreId, editId, requestEditId]);

  useEffect(() => {
    if (!form.mainCategory) { setCatSpecFields([]); setCatVariantAttrs([]); return; }
    const cat = form.mainCategory;
    Promise.all([
      api.get('/category-specifications', { params: { mainCategory: cat } }),
      api.get('/category-variants', { params: { mainCategory: cat } }),
    ]).then(([specRes, varRes]) => {
      const fields = specRes.data[0]?.fields || [];
      const attrs = varRes.data[0]?.attributes || [];
      setCatSpecFields(fields);
      setCatVariantAttrs(attrs);
      setForm(f => {
        if (f.mainCategory !== cat) return f;
        const attrNames = attrs.map(a => a.name);
        const shouldInitVariants = attrNames.length > 0 && f.selectedAttributes.length === 0 && !editId;
        return {
          ...f,
          hasSpecifications: fields.length > 0 ? true : f.hasSpecifications,
          hasVariants: attrs.length > 0 ? true : f.hasVariants,
          ...(shouldInitVariants ? {
            selectedAttributes: attrNames,
            attributeValues: Object.fromEntries(attrNames.map(n => [n, []])),
            variants: [],
            excludedVariants: [],
          } : {}),
        };
      });
    }).catch(() => { setCatSpecFields([]); setCatVariantAttrs([]); });
  }, [form.mainCategory, editId]);

  const handleCategoryChange = (v) => setForm(f => ({
    ...f, mainCategory: v, subCategory: '', childCategory: '',
    specifications: {}, selectedAttributes: [], attributeValues: {},
    variants: [], excludedVariants: [], extraSpecFields: [], extraVariantAttributes: [],
  }));

  const addProductSpecField = () => {
    const raw = prompt('Custom specification name (only for this product):');
    if (!raw?.trim()) return;
    const label = capitalizeWords(raw.trim());
    const key = `custom_${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    setForm(f => ({ ...f, extraSpecFields: [...f.extraSpecFields, { key, label, options: [], productOnly: true }] }));
  };

  const addProductVariantAttr = () => {
    const raw = prompt('Custom variant attribute (only for this product):');
    if (!raw?.trim()) return;
    const name = capitalizeWords(raw.trim());
    setForm(f => ({ ...f, extraVariantAttributes: [...f.extraVariantAttributes, { name, options: [], productOnly: true }] }));
  };

  const regenVariants = useCallback((attrs, attrVals, existing, excluded) =>
    buildVariants(attrs, attrVals, existing, excluded), []);

  const getActiveAttrs = (f) => [
    ...catVariantAttrs.map(a => a.name),
    ...f.extraVariantAttributes.map(a => a.name),
  ];

  const setSelectedAttributes = (attrs) => {
    setForm(f => {
      const attributeValues = Object.fromEntries(attrs.map(a => [a, f.attributeValues[a] || []]));
      const variants = regenVariants(attrs, attributeValues, f.variants, f.excludedVariants);
      return { ...f, selectedAttributes: attrs, attributeValues, variants };
    });
  };

  const setAttrValues = (attr, vals) => {
    setForm(f => {
      const attributeValues = { ...f.attributeValues, [attr]: vals };
      const attrs = getActiveAttrs(f);
      const variants = regenVariants(attrs, attributeValues, f.variants, f.excludedVariants);
      return { ...f, attributeValues, variants, selectedAttributes: attrs };
    });
  };

  const selectVariant = (variant) => {
    setSelectedVariantId(variant.id);
    setForm(f => ({ ...f, hasSpecifications: true }));
  };

  const selectedVariant = form.variants.find(v => v.id === selectedVariantId);

  useEffect(() => {
    if (form.variants.length > 0 && !selectedVariantId) {
      setSelectedVariantId(form.variants[0].id);
      setForm(f => ({ ...f, hasSpecifications: true }));
    }
  }, [form.variants.length, selectedVariantId]);

  const updateVariantSpec = (variantId, key, val) => {
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => v.id === variantId
        ? { ...v, specifications: { ...v.specifications, [key]: val } }
        : v),
    }));
  };

  const addVariantExtraSpec = () => {
    if (!selectedVariantId) return alert('Pehle variant select karein');
    const raw = prompt('Extra specification name (is variant ke liye):');
    if (!raw?.trim()) return;
    const label = capitalizeWords(raw.trim());
    const key = `extra_${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => v.id === selectedVariantId
        ? { ...v, extraSpecFields: [...(v.extraSpecFields || []), { key, label, options: [] }] }
        : v),
    }));
  };

  const getVariantAdditionalFields = (variant) => {
    if (!variant) return [];
    const attrKeys = new Set(Object.keys(variant.attributes).map(k => k.toLowerCase()));
    const fromCat = catSpecFields.filter(f => !attrKeys.has(f.key.toLowerCase()) && !attrKeys.has(f.label.toLowerCase()));
    return [...fromCat, ...(variant.extraSpecFields || [])];
  };

  const removeVariant = (id) => {
    setForm(f => {
      const variant = f.variants.find(v => v.id === id);
      if (!variant) return f;
      const key = variantKey(variant.attributes);
      return {
        ...f,
        variants: f.variants.filter(v => v.id !== id),
        excludedVariants: [...f.excludedVariants, key],
      };
    });
  };

  const updateVariant = (id, patch) => {
    setForm(f => ({ ...f, variants: f.variants.map(v => v.id === id ? { ...v, ...patch } : v) }));
  };

  const updateVariantImages = (variantId, images) => {
    updateVariant(variantId, { images, image: images[0] || '' });
  };

  const handleMediaChange = (patch) => {
    const { thumbnail, ...rest } = patch;
    setForm(f => ({ ...f, ...rest, ...(thumbnail !== undefined ? { image: thumbnail } : {}) }));
  };

  const updateSpec = (key, val) => setForm(f => ({
    ...f, specifications: { ...f.specifications, [key]: val },
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const selectedStore = stores.find(s => String(s.storeId) === String(form.storeId));
    const payload = {
      ...form,
      storeId: selectedStore?.storeId ?? (form.storeId ? parseInt(form.storeId, 10) : undefined),
      store: selectedStore?.name || form.store,
      name: capitalizeWords(form.name.trim()),
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0,
      tags: form.tags ? form.tags.split(',').map(t => capitalizeWords(t.trim())) : [],
      variants: form.variants.map(v => {
        const imgs = getVariantImages(v);
        return {
          ...v,
          images: imgs,
          image: imgs[0] || '',
          price: parseFloat(v.price) || 0,
          stock: parseInt(v.stock) || 0,
          discount: parseFloat(v.discount) || 0,
          discountType: v.discountType || 'Percent',
          sku: capitalizeWords(v.sku || ''),
          specifications: buildVariantSpecs(v),
          licenceNumber: v.licenceNumber || '',
          warranty: !!v.warranty,
          guarantee: !!v.guarantee,
          exchange: !!v.exchange,
        };
      }),
    };
    if (form.hasVariants && form.variants.length > 0) {
      const prices = form.variants.map(v => parseFloat(v.price) || 0).filter(p => p > 0);
      payload.price = prices.length ? Math.min(...prices) : 0;
      payload.stock = form.variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0);
      payload.discount = 0;
      const first = form.variants[0];
      payload.licenceNumber = first.licenceNumber || '';
      payload.warranty = !!first.warranty;
      payload.guarantee = !!first.guarantee;
      payload.exchange = !!first.exchange;
    }
    if (!form.hasSpecifications && (!form.hasVariants || form.variants.length === 0)) {
      payload.specifications = {}; payload.extraSpecFields = [];
    }
    if (form.hasVariants && form.variants.length > 0) payload.hasSpecifications = true;
    if (!form.hasVariants) {
      payload.selectedAttributes = [];
      payload.attributeValues = {};
      payload.variants = [];
      payload.excludedVariants = [];
      payload.extraVariantAttributes = [];
    }
    payload.quickCommerce = true;
    try {
      if (isRequestEdit) {
        const status = form.status || 'Pending';
        if (status === 'Approved') {
          await api.put(`/product-requests/${requestEditId}`, { ...payload, status: 'Approved' });
          navigate('/products/setup/list');
        } else if (status === 'Rejected') {
          await api.put(`/product-requests/${requestEditId}`, { ...payload, status: 'Rejected' });
          navigate('/products/setup/requests?tab=rejected');
        } else {
          await api.put(`/product-requests/${requestEditId}`, { ...payload, status: 'Pending' });
          navigate(`/products/setup/requests?view=${requestEditId}`);
        }
      } else if (editId) {
        await api.put(`/product-items/${editId}`, payload);
        navigate('/products/setup/list');
      } else {
        await api.post('/product-items', payload);
        navigate('/products/setup/list');
      }
    } catch (err) { console.error(err); }
  };

  const subs = subCategories.filter(s => !form.mainCategory || s.mainCategory === form.mainCategory);
  const children = childCategories.filter(c =>
    (!form.mainCategory || c.mainCategory === form.mainCategory) &&
    (!form.subCategory || c.subCategory === form.subCategory)
  );

  const allSpecFields = [...catSpecFields, ...form.extraSpecFields];
  const attrOptions = [
    ...catVariantAttrs.map(a => a.name),
    ...form.extraVariantAttributes.map(a => a.name),
  ];
  const getVariantOptions = (attr) => {
    const fromCat = catVariantAttrs.find(a => a.name === attr)?.options;
    const fromExtra = form.extraVariantAttributes.find(a => a.name === attr)?.options;
    return fromCat || fromExtra || ATTRIBUTE_PRESETS[attr.toLowerCase()] || [];
  };
  const getSpecOptions = (key) => {
    const fromCat = catSpecFields.find(f => f.key === key)?.options;
    const fromExtra = form.extraSpecFields.find(f => f.key === key)?.options;
    return fromCat || fromExtra || [];
  };
  const isProductOnlySpec = (key) => form.extraSpecFields.some(f => f.key === key);
  const isProductOnlyAttr = (name) => form.extraVariantAttributes.some(a => a.name === name);

  const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition';
  const compactInputCls = 'w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500/30 bg-white transition';
  const tableSkuCls = 'w-full px-2.5 py-2 border border-gray-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-primary-500/30 bg-white';
  const tableNumCls = 'w-full px-2.5 py-2 border border-gray-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary-500/30 bg-white text-right';
  const tableSelectCls = 'w-full px-2 py-2 border border-gray-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-primary-500/30 bg-white';
  const thCls = 'px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold border-r border-gray-200 last:border-r-0 whitespace-nowrap';
  const tdCls = 'px-3 py-2.5 border-r border-gray-100 border-b border-gray-100 align-middle last:border-r-0';
  const hasVariantPricing = form.hasVariants && form.variants.length > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Dashboard &gt; Product Setup &gt;
        {isRequestEdit ? (
          <><span className="text-gray-500"> New Item Requests &gt; </span><span className="text-gray-700">Edit Request</span></>
        ) : (
          <span className="text-gray-700"> {editId ? 'Edit Item' : 'Add New Item'}</span>
        )}
      </p>

      <PageCard>
        <PageCardHeader icon={PackagePlus} iconBg="bg-blue-50" iconColor="text-blue-600"
          title={isRequestEdit ? 'Edit Item Request' : editId ? 'Edit Item' : 'Add New Item'}
          description={isRequestEdit ? 'Request ko poora edit karein — Add Item page jaisa.' : 'Add product item with all necessary details.'} />

        {isRequestEdit && (
          <div className="mx-6 mb-4 flex flex-wrap items-center gap-4 p-3 bg-orange-50 border border-orange-100 rounded-lg">
            <div className="flex-1 min-w-[140px]">
              <p className="text-xs font-semibold text-orange-800">Item Request</p>
              <p className="text-[10px] text-orange-600">Save ke baad preview dikhega</p>
            </div>
            <div className="w-44">
              <label className="text-[10px] font-medium text-gray-600 mb-1 block">Request Status</label>
              <SearchableSelect
                value={form.status}
                onChange={v => setForm({ ...form, status: v })}
                options={['Pending', 'Approved', 'Rejected']}
                placeholder="Status"
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Item Info + Media */}
          <SectionCard title="Item Information" icon={Tag} className="!p-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4 items-start">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Name (English) <span className="text-red-500">*</span>
                  </label>
                  <CapInput value={form.name} onChange={v => setForm({ ...form, name: v })} required className={compactInputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Short Description (English)</label>
                  <CapTextarea value={form.shortDesc} onChange={v => setForm({ ...form, shortDesc: v })} rows={2} className={compactInputCls} />
                </div>
              </div>
              <ProductMediaUpload
                thumbnail={form.image}
                images={form.images}
                video={form.video}
                onChange={handleMediaChange}
              />
            </div>
          </SectionCard>

          {/* Store & Category */}
          <SectionCard title="Store & Category Info" icon={Store}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Store</label>
                <SearchableSelect
                  value={form.storeId ? String(form.storeId) : ''}
                  onChange={v => {
                    const s = stores.find(x => String(x.storeId) === String(v));
                    setForm({ ...form, storeId: v, store: s?.name || '' });
                  }}
                  options={stores.map(s => ({ value: String(s.storeId), label: `${s.name} (ID: ${s.storeId})` }))}
                  placeholder="Select Store"
                />
              </div>
              {[
                { label: 'Main Category', key: 'mainCategory', opts: categories.map(c => c.name), ph: 'Select Main Category',
                  onChange: handleCategoryChange },
                { label: 'Sub Category', key: 'subCategory', opts: subs.map(s => s.name), ph: 'Select Sub Category',
                  disabled: !form.mainCategory, onChange: v => setForm({ ...form, subCategory: v, childCategory: '' }) },
                { label: 'Child Category', key: 'childCategory', opts: children.map(c => c.name), ph: 'Select Child Category',
                  disabled: !form.subCategory },
                { label: 'Brand', key: 'brand', opts: brands.map(b => b.name), ph: 'Select Brand' },
                { label: 'Unit', key: 'unit', opts: units.map(u => u.name), ph: 'Select Unit' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">{f.label}</label>
                  <SearchableSelect
                    value={form[f.key]}
                    onChange={f.onChange || (v => setForm({ ...form, [f.key]: v }))}
                    options={f.opts}
                    placeholder={f.ph}
                    disabled={f.disabled}
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Delivery Mode</label>
                <SearchableSelect value={form.deliveryMode} onChange={v => setForm({ ...form, deliveryMode: v })}
                  options={['Home Delivery', 'Pickup']} placeholder="Select Delivery Mode" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Product Code <span className="text-gray-400 font-normal">(Govt. — optional)</span>
                </label>
                <input
                  value={form.productCode}
                  onChange={e => setForm({ ...form, productCode: e.target.value })}
                  placeholder="e.g. HSN / Govt. product code"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">SKU</label>
                <CapInput value={form.sku} onChange={v => setForm({ ...form, sku: v })} placeholder="Internal SKU" className={inputCls} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Barcode</label>
                <input
                  value={form.barcode}
                  onChange={e => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Scannable barcode number"
                  className={inputCls}
                />
              </div>
            </div>
          </SectionCard>

          {/* Variants */}
          <SectionCard title="Product Variants" icon={Layers}>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 via-blue-50 to-indigo-50 rounded-xl border border-violet-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Enable Variants</p>
                <p className="text-xs text-gray-500 mt-0.5">Select Attributes & Values — Variants Auto-Create</p>
              </div>
              <Toggle checked={form.hasVariants} onChange={v => setForm({ ...form, hasVariants: v })} />
            </div>

            {form.hasVariants && !form.mainCategory && (
              <div className="mt-4 flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                <Info size={16} /> Select Main Category first to load category variants
              </div>
            )}

            {form.hasVariants && form.mainCategory && (
              <div className="space-y-5 mt-5">
                {catVariantAttrs.length > 0 ? (
                  <p className="text-xs text-gray-500 bg-violet-50 px-3 py-2 rounded-lg border border-violet-100">
                    Loaded {catVariantAttrs.length} attribute(s) for <b>{form.mainCategory}</b> — select values below
                  </p>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                    No variants for this category. Add from <b>Categories → Variants</b> or add custom below.
                  </div>
                )}

                {catVariantAttrs.length > 0 && (
                  <div className="space-y-3">
                    {catVariantAttrs.map(attr => (
                      <AttributeValueChips
                        key={attr.name}
                        label={attr.name}
                        options={attr.options || []}
                        selected={form.attributeValues[attr.name] || []}
                        onChange={vals => setAttrValues(attr.name, vals)}
                      />
                    ))}
                  </div>
                )}

                {form.extraVariantAttributes.length > 0 && (
                  <div className="space-y-3">
                    {form.extraVariantAttributes.map(attr => (
                      <div key={attr.name}>
                        <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded mb-1 inline-block">Product Only</span>
                        <AttributeValueChips
                          label={attr.name}
                          options={attr.options || []}
                          selected={form.attributeValues[attr.name] || []}
                          onChange={vals => setAttrValues(attr.name, vals)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Add / Remove Attributes</label>
                  <SearchableMultiSelect values={form.selectedAttributes} onChange={setSelectedAttributes}
                    options={attrOptions} placeholder="Search & Select Attributes..." />
                </div>
                <button type="button" onClick={addProductVariantAttr}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition">
                  <Plus size={14} /> Add Custom Attribute (This Product Only)
                </button>

                {form.variants.length > 0 && (
                  <div className="rounded-lg border border-gray-300 overflow-hidden shadow-sm">
                    <div className="px-3 py-2 bg-gradient-to-r from-violet-600 to-primary-600 flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">
                        Variant Combinations — {form.variants.length} Ready
                      </p>
                      <p className="text-[10px] text-violet-100">Row click = specs select</p>
                    </div>
                    <div className="overflow-x-auto max-h-[440px] overflow-y-auto dropdown-scroll bg-white">
                      <table className="w-full border-collapse table-fixed min-w-[940px]">
                        <colgroup>
                          <col style={{ width: '40px' }} />
                          <col style={{ width: '56px' }} />
                          <col style={{ width: '190px' }} />
                          <col style={{ width: '120px' }} />
                          <col style={{ width: '100px' }} />
                          <col style={{ width: '108px' }} />
                          <col style={{ width: '92px' }} />
                          <col style={{ width: '84px' }} />
                          <col style={{ width: '44px' }} />
                        </colgroup>
                        <thead className="bg-gray-100 border-b-2 border-gray-200 sticky top-0 z-10">
                          <tr>
                            <th className={`${thCls} text-center`}>#</th>
                            <th className={`${thCls} text-center`}>Img</th>
                            <th className={`${thCls} text-left`}>Variant</th>
                            <th className={`${thCls} text-center`}>SKU</th>
                            <th className={`${thCls} text-right`}>Price (₹)</th>
                            <th className={`${thCls} text-center`}>Disc. Type</th>
                            <th className={`${thCls} text-right`}>Discount</th>
                            <th className={`${thCls} text-right`}>Stock</th>
                            <th className={`${thCls} text-center`}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.variants.map((variant, idx) => {
                            const label = Object.values(variant.attributes).join(' / ');
                            const isSelected = selectedVariantId === variant.id;
                            return (
                              <tr
                                key={variant.id}
                                onClick={() => selectVariant(variant)}
                                className={`cursor-pointer transition-colors
                                  ${isSelected
                                    ? 'bg-primary-50 border-l-[3px] border-l-primary-500'
                                    : `${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-slate-100 border-l-[3px] border-l-transparent`
                                  }`}
                              >
                                <td className={`${tdCls} text-center`}>
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-violet-100 text-violet-700 font-bold text-[10px]">
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className={`${tdCls} text-center`}>
                                  {(() => {
                                    const imgs = getVariantImages(variant);
                                    return imgs.length > 0 ? (
                                      <div className="relative mx-auto w-9 h-9">
                                        <ViewableImage
                                          src={imgs[0]}
                                          images={imgs}
                                          title={label}
                                          alt=""
                                          className="w-9 h-9 object-cover rounded border border-gray-200"
                                        />
                                        {imgs.length > 1 && (
                                          <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-primary-600 text-white px-1 rounded">
                                            {imgs.length}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="inline-flex w-9 h-9 items-center justify-center text-[9px] text-gray-400 border border-dashed border-gray-300 rounded bg-white">
                                        0/6
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className={`${tdCls} max-w-[190px]`}>
                                  <p className="text-xs font-semibold text-gray-800 capitalize truncate leading-tight" title={label}>{label}</p>
                                  <div className="flex flex-wrap gap-0.5 mt-1">
                                    {Object.entries(variant.attributes).map(([k, v]) => (
                                      <span key={k} className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 bg-violet-50 text-violet-700 border border-violet-100 rounded capitalize">
                                        {isColorAttribute(k) && (
                                          <span className="w-2 h-2 rounded-full border border-gray-300 shrink-0"
                                            style={{ backgroundColor: getColorHex(v) || hashColor(v) }} />
                                        )}
                                        {v}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className={tdCls} onClick={e => e.stopPropagation()}>
                                  <CapInput value={variant.sku} onChange={v => updateVariant(variant.id, { sku: v })}
                                    placeholder="SKU" className={tableSkuCls} />
                                </td>
                                <td className={tdCls} onClick={e => e.stopPropagation()}>
                                  <input type="number" value={variant.price} onChange={e => updateVariant(variant.id, { price: e.target.value })}
                                    placeholder="0" className={tableNumCls} />
                                </td>
                                <td className={tdCls} onClick={e => e.stopPropagation()}>
                                  <select value={variant.discountType || 'Percent'}
                                    onChange={e => updateVariant(variant.id, { discountType: e.target.value })}
                                    className={tableSelectCls}>
                                    <option value="Percent">Percent %</option>
                                    <option value="Flat">Flat ₹</option>
                                  </select>
                                </td>
                                <td className={tdCls} onClick={e => e.stopPropagation()}>
                                  <input type="number" value={variant.discount ?? 0}
                                    onChange={e => updateVariant(variant.id, { discount: e.target.value })}
                                    placeholder="0" className={tableNumCls} />
                                </td>
                                <td className={tdCls} onClick={e => e.stopPropagation()}>
                                  <input type="number" value={variant.stock} onChange={e => updateVariant(variant.id, { stock: e.target.value })}
                                    placeholder="0" className={tableNumCls} />
                                </td>
                                <td className={`${tdCls} text-center`} onClick={e => e.stopPropagation()}>
                                  <button type="button" onClick={() => { removeVariant(variant.id); if (selectedVariantId === variant.id) setSelectedVariantId(null); }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition" title="Delete">
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Specifications — variant ke neeche, upar select variant ke hisaab se */}
                {form.variants.length > 0 && selectedVariant && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/30">
                    <div className="px-3 py-2 border-b border-amber-100 bg-white/70 flex items-center gap-2">
                      <Ruler size={14} className="text-amber-600" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">Specifications</p>
                        <p className="text-[10px] text-gray-500 capitalize">
                          {Object.values(selectedVariant.attributes).join(' / ')}
                        </p>
                      </div>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_1fr] gap-4 pb-3 border-b border-amber-100">
                        <div onClick={e => e.stopPropagation()}>
                          <ImageAddGallery
                            label="Variant Images"
                            hint="Add Image — ek ke baad ek, max 6"
                            images={getVariantImages(selectedVariant)}
                            onChange={imgs => updateVariantImages(selectedVariant.id, imgs)}
                            max={6}
                            size="sm"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 self-center lg:self-start lg:pt-6">
                          Is variant ke liye alag images add karein. Pehli image table mein preview dikhegi.
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Lock size={10} /> From Variant (Locked)
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(selectedVariant.attributes).map(([k, v]) => (
                            <div key={k} className="px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-md cursor-not-allowed">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-500 capitalize">{k}</span>
                                <Lock size={9} className="text-gray-400" />
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isColorAttribute(k) && (
                                  <span className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0"
                                    style={{ backgroundColor: getColorHex(v) || hashColor(v) }} />
                                )}
                                <span className="text-xs font-semibold text-gray-700 capitalize">{v}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 border border-dashed border-amber-300 rounded-lg bg-white/80">
                        <p className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                          <Plus size={13} className="text-amber-600" /> Additional Specifications
                        </p>
                        {getVariantAdditionalFields(selectedVariant).length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                            {getVariantAdditionalFields(selectedVariant).map(f => (
                              <div key={f.key} className={`p-2 bg-white border rounded-lg ${(selectedVariant.extraSpecFields || []).some(e => e.key === f.key) ? 'border-orange-200' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <label className="text-xs font-semibold text-gray-700">{f.label}</label>
                                  {(selectedVariant.extraSpecFields || []).some(e => e.key === f.key) && (
                                    <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 px-1 py-0.5 rounded">Extra</span>
                                  )}
                                </div>
                                <SearchableCreatableSelect
                                  value={selectedVariant.specifications?.[f.key] || ''}
                                  onChange={v => updateVariantSpec(selectedVariant.id, f.key, v)}
                                  options={f.options || getSpecOptions(f.key)}
                                  placeholder={`Select ${f.label}...`}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 mb-2">Category se aur fields add kar sakte hain</p>
                        )}
                        <button type="button" onClick={addVariantExtraSpec}
                          className="flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 transition">
                          <Plus size={12} /> Add Extra Specification
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {form.variants.length > 0 && !selectedVariant && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                    <Info size={16} /> Variant list mein kisi variant pe click karein — specifications neeche dikhenge
                  </div>
                )}

                {form.selectedAttributes.length > 0 && form.variants.length === 0 && (
                  <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-dashed border-gray-200">
                    <Layers size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium text-gray-600">Select Values Above</p>
                    <p className="text-xs text-gray-400 mt-1">Variants Will Appear Automatically</p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Search Tags" icon={Tag}>
            <CapInput value={form.tags} onChange={v => setForm({ ...form, tags: v })}
              placeholder="Search Tags (Comma Separated)" className={inputCls} />
          </SectionCard>

          {!hasVariantPricing && (
            <SectionCard title="Warranty, Guarantee, Return & Exchange">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Licence Number</label>
                  <CapInput value={form.licenceNumber} onChange={v => setForm({ ...form, licenceNumber: v })} className={inputCls} />
                </div>
                {['warranty', 'guarantee', 'exchange'].map(key => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-sm font-medium text-gray-700 capitalize">{key}</span>
                    <Toggle checked={form[key]} onChange={v => setForm({ ...form, [key]: v })} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {!hasVariantPricing && (
            <SectionCard title="Price Information" icon={DollarSign}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unit Price (₹)</label>
                  <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Discount Type</label>
                  <SearchableSelect value={form.discountType} onChange={v => setForm({ ...form, discountType: v })}
                    options={['Percent', 'Flat']} placeholder="Select Type" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Discount</label>
                  <input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Total Stock</label>
                  <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className={inputCls} />
                </div>
              </div>
            </SectionCard>
          )}

          {hasVariantPricing && (
            <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700">
              <Info size={14} className="shrink-0" />
              Price, discount aur stock ab har variant ke table row mein set karein — specifications mein images aur specs.
            </div>
          )}

          {/* Specifications — sirf jab variants nahi hain */}
          {(!form.hasVariants || form.variants.length === 0) && (
          <SectionCard title="Product Specifications" icon={Ruler}>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 rounded-xl border border-amber-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Add Specifications</p>
                <p className="text-xs text-gray-500 mt-0.5">Search, Select Or Type Custom Values For Each Field</p>
              </div>
              <Toggle checked={form.hasSpecifications} onChange={v => setForm({ ...form, hasSpecifications: v })} />
            </div>

            {form.hasSpecifications && !form.mainCategory && (
              <div className="mt-4 flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                <Info size={16} /> Select Main Category first to load category specifications
              </div>
            )}

            {form.hasSpecifications && form.mainCategory && (
              <div className="mt-5 space-y-4">
                {catSpecFields.length > 0 && (
                  <p className="text-xs text-gray-500 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                    Loaded {catSpecFields.length} specification(s) for <b>{form.mainCategory}</b>
                  </p>
                )}
                {allSpecFields.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Ruler size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No specifications defined for this category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allSpecFields.map(f => (
                      <div key={f.key} className={`p-3 bg-white border rounded-xl hover:shadow-sm transition ${isProductOnlySpec(f.key) ? 'border-orange-200' : 'border-gray-100 hover:border-amber-200'}`}>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">{f.label}</label>
                        <SearchableCreatableSelect
                          value={form.specifications[f.key] || ''}
                          onChange={v => updateSpec(f.key, v)}
                          options={getSpecOptions(f.key)}
                          placeholder={`Select or type ${f.label}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={addProductSpecField}
                  className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-800 transition">
                  <Plus size={14} /> Add Custom Specification (This Product Only)
                </button>
              </div>
            )}
          </SectionCard>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate(isRequestEdit ? '/products/setup/requests' : '/products/setup/list')}
              className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
              {isRequestEdit ? 'Back to Requests' : 'Reset'}
            </button>
            <button type="submit" className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm transition">
              {isRequestEdit ? 'Update Request' : editId ? 'Update Item' : 'Submit'}
            </button>
          </div>
        </form>
      </PageCard>
    </div>
  );
}
