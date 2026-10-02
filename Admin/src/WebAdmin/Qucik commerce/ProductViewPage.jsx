import { useState, useEffect, useMemo, useCallback } from 'react';

import { useParams, useNavigate, Link } from 'react-router-dom';

import { ArrowLeft, MapPin, Star, Pencil, Loader2, ShoppingBag, Package, Tag, BarChart3 } from 'lucide-react';

import api from '../../api/axios';

import ViewableImage from './components/ViewableImage';

import ProductStockUpdateModal from './components/ProductStockUpdateModal';



const RATING_LABELS = [

  { stars: 5, label: 'Excellent' },

  { stars: 4, label: 'Good' },

  { stars: 3, label: 'Average' },

  { stars: 2, label: 'Below average' },

  { stars: 1, label: 'Poor' },

];



function variantLabel(v) {

  if (!v?.attributes) return 'Variant';

  return Object.values(v.attributes).join(' / ');

}



export default function ProductViewPage() {

  const { productId } = useParams();

  const navigate = useNavigate();

  const [product, setProduct] = useState(null);

  const [storeInfo, setStoreInfo] = useState(null);

  const [stats, setStats] = useState({ unitsSold: 0, revenue: 0, orderCount: 0, reviewCount: 0 });

  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);

  const [stockOpen, setStockOpen] = useState(false);



  const load = useCallback(() => {

    setLoading(true);

    Promise.all([

      api.get(`/product-items/${productId}`),

      api.get(`/product-items/${productId}/stats`).catch(() => ({ data: { unitsSold: 0, revenue: 0, orderCount: 0, reviewCount: 0 } })),

      api.get('/product-reviews').catch(() => ({ data: [] })),

      api.get('/stores', { params: { filter: 'list' } }).catch(() => ({ data: [] })),

    ])

      .then(([prodRes, statsRes, revRes, storeRes]) => {

        const p = prodRes.data;

        setProduct(p);

        setStats(statsRes.data || {});

        const matched = (revRes.data || []).filter(r =>

          r.productSku === p.sku || r.productName === p.name

        );

        setReviews(matched);

        const store = (storeRes.data || []).find(s =>

          (p.storeId && String(s.storeId) === String(p.storeId)) || s.name === p.store

        );

        setStoreInfo(store || null);

      })

      .catch(() => navigate('/products/setup/list'))

      .finally(() => setLoading(false));

  }, [productId, navigate]);



  useEffect(() => { load(); }, [load]);



  const ratingStats = useMemo(() => {

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach(r => {

      if (counts[r.rating] !== undefined) counts[r.rating] += 1;

    });

    const total = reviews.length;

    const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);

    const avg = total ? (sum / total).toFixed(1) : '0.0';

    const max = Math.max(...Object.values(counts), 1);

    return { counts, total, avg, max };

  }, [reviews]);



  if (loading) {

    return (

      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">

        <Loader2 size={28} className="animate-spin text-primary-500" />

        <p className="text-sm">Product load ho raha hai...</p>

      </div>

    );

  }



  if (!product) return null;



  const variants = product.hasVariants && product.variants?.length ? product.variants : [];

  const tags = Array.isArray(product.tags) ? product.tags.join(' / ') : (product.tags || '—');

  const shortDesc = product.shortDesc || product.shortDescEn || `${product.name} — ${product.mainCategory || ''} product from ${product.store || 'store'}.`;



  return (

    <div className="space-y-4 pb-8">

      <div className="flex items-center gap-2 text-sm text-gray-500">

        <button type="button" onClick={() => navigate('/products/setup/list')}

          className="inline-flex items-center gap-1 hover:text-primary-600 transition">

          <ArrowLeft size={14} /> Back to Item List

        </button>

      </div>



      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">

          <div className="flex items-start gap-3 min-w-0 flex-1">

            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">

              <ShoppingBag size={18} className="text-slate-600" />

            </div>

            <div>

              <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">{product.name}</h1>

              <p className="text-xs text-gray-400 mt-0.5">

                ID: {product.productId} · SKU: {product.sku || '—'} · Store ID: {product.storeId || storeInfo?.storeId || '—'}

              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 shrink-0">

            <button type="button" onClick={() => setStockOpen(true)}

              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg shadow-sm transition">

              Update Stock

            </button>

            <Link to={`/products/setup/add?edit=${product._id}`}

              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition">

              <Pencil size={14} /> Edit Info

            </Link>

          </div>

        </div>



        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-b border-gray-100 bg-slate-50/40">

          {[

            { label: 'Units Sold', value: stats.unitsSold, icon: BarChart3 },

            { label: 'Revenue', value: `₹ ${(stats.revenue || 0).toLocaleString('en-IN')}`, icon: Tag },

            { label: 'Orders', value: stats.orderCount, icon: Package },

            { label: 'Reviews', value: stats.reviewCount || ratingStats.total, icon: Star },

          ].map(c => (

            <div key={c.label} className="p-4 text-center">

              <c.icon size={16} className="text-primary-500 mx-auto mb-1" />

              <p className="text-xs text-gray-500">{c.label}</p>

              <p className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{c.value}</p>

            </div>

          ))}

        </div>



        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

          <div className="p-5">

            <div className="flex flex-col sm:flex-row gap-5">

              <ViewableImage

                src={product.image}

                images={[product.image, ...(product.images || [])].filter(Boolean)}

                title={product.name}

                alt={product.name}

                className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover border border-gray-200 shrink-0 shadow-sm"

              />

              <div className="flex-1 min-w-0">

                <div className="flex flex-wrap items-end gap-4">

                  <div>

                    <p className="text-3xl font-bold text-slate-900">{ratingStats.avg}<span className="text-lg text-gray-400 font-medium">/5</span></p>

                    <div className="flex gap-0.5 mt-1">

                      {[1, 2, 3, 4, 5].map(n => (

                        <Star key={n} size={16}

                          className={n <= Math.round(Number(ratingStats.avg)) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}

                        />

                      ))}

                    </div>

                    <p className="text-xs text-gray-500 mt-1">Of {ratingStats.total} Reviews</p>

                  </div>

                </div>

                <div className="mt-4 space-y-2 max-w-md">

                  {RATING_LABELS.map(({ stars, label }) => (

                    <div key={stars} className="flex items-center gap-3 text-xs">

                      <span className="w-24 text-gray-500 shrink-0">{label}</span>

                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">

                        <div

                          className="h-full bg-amber-400 rounded-full transition-all"

                          style={{ width: `${(ratingStats.counts[stars] / ratingStats.max) * 100}%` }}

                        />

                      </div>

                      <span className="w-6 text-right text-gray-500 tabular-nums">{ratingStats.counts[stars]}</span>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          </div>



          <div className="p-5 bg-slate-50/50">

            <div className="flex items-start gap-3">

              <img

                src={storeInfo?.logoImage || `https://placehold.co/56x56/1e3a5f/fff?text=${(product.store || 'S').charAt(0)}`}

                alt=""

                className="w-14 h-14 rounded-xl object-cover border border-white shadow-sm shrink-0"

              />

              <div className="min-w-0">

                <Link to={storeInfo ? `/stores/view/${storeInfo.storeId}` : '#'} className="font-bold text-slate-800 hover:text-primary-600">

                  {product.store || '—'}

                </Link>

                <p className="text-xs text-gray-400 mt-0.5">Store ID: {product.storeId || storeInfo?.storeId || '—'}</p>

                <p className="text-xs text-gray-500 mt-2 flex items-start gap-1.5 leading-relaxed">

                  <MapPin size={13} className="text-primary-500 shrink-0 mt-0.5" />

                  {storeInfo?.address || storeInfo?.addressEn || `${storeInfo?.zone || storeInfo?.area || 'Nagpur'}, Maharashtra`}

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>



      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">

          <div className="p-5 lg:col-span-1">

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Short Description</p>

            <p className="text-sm text-gray-700 leading-relaxed">{shortDesc}</p>

          </div>

          <div className="p-5">

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Stock</p>

            <p className={`text-2xl font-bold ${product.stock <= product.lowStockLimit ? 'text-red-500' : 'text-slate-800'}`}>

              {product.stock ?? 0}

            </p>

            <p className="text-xs text-gray-400 mt-1">Low limit: {product.lowStockLimit ?? 10}</p>

          </div>

          <div className="p-5">

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Price</p>

            <p className="text-sm text-gray-800">

              <span className="text-gray-500">Price :</span>{' '}

              <span className="font-bold text-lg">₹ {product.price?.toLocaleString('en-IN')}</span>

            </p>

            {product.discount > 0 && (

              <p className="text-xs text-gray-500 mt-1">

                Discount : <span className="font-semibold text-emerald-600">{product.discount} {product.discountType === 'Percent' ? '%' : '₹'}</span>

              </p>

            )}

          </div>

          <div className="p-5">

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Variations</p>

            {variants.length ? (

              <ul className="space-y-1.5 text-sm text-gray-700">

                {variants.map(v => (

                  <li key={v.id} className="capitalize">

                    <span className="font-medium">{variantLabel(v)}</span>

                    <span className="text-gray-400"> : </span>

                    <span className="font-semibold">₹ {(v.price || product.price)?.toLocaleString('en-IN')}</span>

                    <span className="text-xs text-gray-400 ml-1">({v.stock ?? 0} stock)</span>

                  </li>

                ))}

              </ul>

            ) : (

              <p className="text-sm text-gray-500">No variations</p>

            )}

          </div>

          <div className="p-5">

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tags</p>

            <p className="text-sm text-gray-600 break-words leading-relaxed">{tags}</p>

          </div>

        </div>

      </div>



      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">

        <h2 className="text-sm font-bold text-slate-800 mb-4">Product Details</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">

          {[

            { label: 'Product Code', value: product.productCode },

            { label: 'Barcode', value: product.barcode },

            { label: 'Category', value: product.mainCategory },

            { label: 'Sub Category', value: product.subCategory },

            { label: 'Brand', value: product.brand },

            { label: 'Unit', value: product.unit },

            { label: 'Delivery', value: product.deliveryMode },

            { label: 'Status', value: product.status === false ? 'Inactive' : 'Active' },

          ].map(row => (

            <div key={row.label}>

              <p className="text-xs text-gray-400">{row.label}</p>

              <p className="font-semibold text-slate-800 mt-0.5">{row.value || '—'}</p>

            </div>

          ))}

        </div>

      </div>



      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">

        <h2 className="text-sm font-bold text-slate-800 mb-4">Warranty, Guarantee, Return & Exchange</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {[

            { label: 'Warranty', on: product.warranty },

            { label: 'Guarantee', on: product.guarantee },

            { label: 'Exchange', on: product.exchange },

            { label: 'Return', on: product.return ?? false },

          ].map(item => (

            <div key={item.label} className={`rounded-lg border px-4 py-3 text-center text-sm font-medium

              ${item.on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>

              {item.label}

              <p className="text-xs font-normal mt-0.5">{item.on ? 'Available' : 'Not available'}</p>

            </div>

          ))}

        </div>

        {product.licenceNumber && (

          <p className="text-xs text-gray-500 mt-3">Licence No: <span className="font-mono text-gray-700">{product.licenceNumber}</span></p>

        )}

      </div>



      {reviews.length > 0 && (

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100">

            <h2 className="text-sm font-bold text-slate-800">Customer Reviews ({reviews.length})</h2>

          </div>

          <div className="divide-y divide-gray-50">

            {reviews.slice(0, 5).map(r => (

              <div key={r._id} className="p-4 flex gap-3">

                <div className="flex-1">

                  <div className="flex items-center gap-2">

                    <span className="font-semibold text-sm text-slate-800">{r.customerName}</span>

                    <span className="text-amber-500 text-xs">{'★'.repeat(r.rating)}</span>

                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>

                  </div>

                  <p className="text-sm text-gray-600 mt-1">{r.reviewText || r.comment}</p>

                  <p className="text-xs text-gray-400 mt-1">{r.reviewDate || r.date}</p>

                </div>

              </div>

            ))}

          </div>

        </div>

      )}



      {stockOpen && (

        <ProductStockUpdateModal

          product={product}

          onClose={() => setStockOpen(false)}

          onSaved={(updated) => { setProduct(updated); setStockOpen(false); }}

        />

      )}

    </div>

  );

}


