import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { shop } from '../api';
import ProductCard from '../components/ProductCard';
import { useWishlist } from '../store/wishlist';
import { useLocationStore } from '../store/location';
import { clearVisualSearchImage, rankProductsByImage, readVisualSearchImage } from '../utils/visualSearch';

const sameId = (a, b) => String(a || '') === String(b || '');
const imageFallback = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=180&h=140&fit=crop';

function ChoiceButton({ item, active, onClick }) {
  return <button type="button" onClick={onClick} className={'qc-category-choice flex min-w-[94px] flex-col items-center gap-1 rounded-xl border px-3 py-2 text-center text-xs font-medium transition ' + (active ? 'is-active border-brand-500 bg-brand-50 text-slate-900 font-semibold' : 'border-slate-100 bg-white text-slate-600 hover:border-brand-200')}>
    <img src={item.image || imageFallback} alt="" className="h-12 w-14 rounded-md object-contain"/>
    <span>{item.name}</span>
  </button>;
}

export default function CategoryPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const moduleSlug = params.get('module') || '';
  const categoryId = params.get('categoryId') || '';
  const subCategoryId = params.get('subCategoryId') || '';
  const childCategoryId = params.get('childCategoryId') || '';
  const categoryText = params.get('category') || '';
  const brandId = params.get('brand') || '';
  const q = params.get('q') || '';
  const visualSearch = params.get('visualSearch') === '1';
  const storeId = params.get('storeId') || '';
  const storeName = params.get('store') || '';
  const sort = params.get('sort') || 'popularity';
  const wishlistOnly = params.get('wishlist') === '1';
  const wished = useWishlist(s => s.items);
  const location = useLocationStore(s => s.current);
  const [catalog, setCatalog] = useState({ modules: [], categories: [], subCategories: [], childCategories: [] });
  const [items, setItems] = useState([]);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualError, setVisualError] = useState('');
  const [visualImage, setVisualImage] = useState(() => visualSearch ? readVisualSearchImage() : '');

  useEffect(() => {
    shop.home({ lat: location?.lat, lng: location?.lng }).then(data => setCatalog({
      modules: data.modules || [],
      categories: data.categories || [],
      subCategories: data.subCategories || [],
      childCategories: data.childCategories || [],
    })).catch(() => {});
  }, [location?.lat, location?.lng]);
  const requestedModule = catalog.modules.find(item => item.slug === moduleSlug);
  const categories = catalog.categories.filter(item => item.status !== false && (!moduleSlug || String(item.moduleId) === String(requestedModule?._id)));
  const category = categories.find(item => sameId(item._id, categoryId)) || categories.find(item => item.name === categoryText);
  const module = requestedModule || catalog.modules.find(item => String(item._id) === String(category?.moduleId));
  const subCategories = catalog.subCategories.filter(item => item.status !== false && category && (sameId(item.categoryId, category._id) || item.mainCategory === category.name));
  const subCategory = subCategories.find(item => sameId(item._id, subCategoryId));
  const childCategories = catalog.childCategories.filter(item => item.status !== false && subCategory && (sameId(item.subCategoryId, subCategory._id) || (item.subCategory === subCategory.name && sameId(item.categoryId, category?._id))));
  const childCategory = childCategories.find(item => sameId(item._id, childCategoryId));
  const productCategory = childCategory?.name || subCategory?.name || category?.name || categoryText;
  const productPages = [];
  for (let index = 0; index < items.length; index += 9) {
    productPages.push(items.slice(index, index + 9));
  }

  useEffect(() => {
    if (visualSearch) {
      let cancelled = false;
      const image = readVisualSearchImage();
      setVisualImage(image);
      setVisualError('');
      if (!image) {
        setItems([]);
        setVisualError('Choose an image with the Lens button to start visual search.');
        return () => { cancelled = true; };
      }
      setVisualLoading(true);
      shop.products({ module: moduleSlug || undefined, lat: location?.lat, lng: location?.lng })
        .then(products => rankProductsByImage(products, image))
        .then(ranked => {
          if (cancelled) return;
          setItems(ranked.map(({ product, score }) => ({ ...product, visualSimilarity: score })));
          if (!ranked.length) setVisualError('No catalog images could be compared. Try another image.');
        })
        .catch(() => { if (!cancelled) { setItems([]); setVisualError('Could not compare this image with the product catalog.'); } })
        .finally(() => { if (!cancelled) setVisualLoading(false); });
      return () => { cancelled = true; };
    }
    setVisualLoading(false);
    setVisualError('');
    if (wishlistOnly) {
      shop.products({ lat: location?.lat, lng: location?.lng })
        .then(available => {
          const allowedIds = new Set(available.flatMap(item => [item.id, item.productId].filter(Boolean).map(String)));
          setItems(wished.filter(item => allowedIds.has(String(item.id)) || allowedIds.has(String(item.productId))));
        })
        .catch(() => setItems([]));
      return;
    }
    shop.products({ category: productCategory || undefined, brand: brandId || undefined, module: moduleSlug || undefined, q: q || undefined, storeId: storeId || undefined, store: storeName || undefined, sort, lat: location?.lat, lng: location?.lng })
      .then(setItems)
      .catch(() => setItems([]));
  }, [productCategory, brandId, moduleSlug, q, storeId, storeName, sort, wishlistOnly, wished, visualSearch, location?.lat, location?.lng]);

  const select = (updates, clearKeys = []) => {
    const next = new URLSearchParams(params);
    clearKeys.forEach(key => next.delete(key));
    Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next);
  };
  const chooseCategory = item => select({ categoryId: item._id, category: item.name }, ['subCategoryId', 'childCategoryId']);
  const chooseSubCategory = item => select({ subCategoryId: item._id, category: item.name }, ['childCategoryId']);
  const chooseChildCategory = item => select({ childCategoryId: item._id, category: item.name });
  const moduleHome = module ? '/?module=' + encodeURIComponent(module.slug) : '/';
  const resetVisualSearch = () => {
    clearVisualSearchImage();
    const next = new URLSearchParams();
    if (moduleSlug) next.set('module', moduleSlug);
    navigate(next.size ? `/c?${next.toString()}` : '/c');
  };
  const categoryPath = new URLSearchParams();
  if (module) categoryPath.set('module', module.slug);
  if (category) { categoryPath.set('categoryId', category._id); categoryPath.set('category', category.name); }
  const subCategoryPath = new URLSearchParams(categoryPath);
  if (subCategory) { subCategoryPath.set('subCategoryId', subCategory._id); subCategoryPath.set('category', subCategory.name); }
  const childCategoryPath = new URLSearchParams(subCategoryPath);
  if (childCategory) { childCategoryPath.set('childCategoryId', childCategory._id); childCategoryPath.set('category', childCategory.name); }
  const showBreadcrumb = Boolean(module || categoryId || subCategoryId || childCategoryId);
  const crumbs = [
    ...(module ? [{ label: module.name, to: moduleHome }] : []),
    ...(category ? [{ label: category.name, to: '/c?' + categoryPath.toString() }] : []),
    ...(subCategory ? [{ label: subCategory.name, to: '/c?' + subCategoryPath.toString() }] : []),
    ...(childCategory ? [{ label: childCategory.name, to: '/c?' + childCategoryPath.toString() }] : []),
  ];
  const goBackOneLevel = () => {
    if (childCategoryId) {
      const next = new URLSearchParams(params);
      next.delete('childCategoryId');
      next.set('category', subCategory?.name || category?.name || '');
      setParams(next);
    } else if (subCategoryId) {
      const next = new URLSearchParams(params);
      next.delete('subCategoryId');
      next.delete('childCategoryId');
      next.set('category', category?.name || '');
      setParams(next);
    } else if (categoryId) navigate(module ? moduleHome : '/');
    else if (moduleSlug) navigate('/');
    else navigate(-1);
  };

  return <div className="mx-auto max-w-6xl px-4 pt-2 pb-5">
        {showBreadcrumb && <nav className="qc-category-breadcrumb" aria-label="Breadcrumb path">
      <button type="button" onClick={goBackOneLevel} aria-label="Go back one level" title="Go back one level" className="qc-path-back"><ArrowLeft size={17}/></button>
      {crumbs.map((crumb, index) => <span className="qc-path-step" key={crumb.label}>{index > 0 && <ChevronRight size={14} className="qc-path-separator"/>}<Link to={crumb.to} aria-current={index === crumbs.length - 1 ? 'page' : undefined} className={index === crumbs.length - 1 ? 'current' : ''}>{crumb.label}</Link></span>)}
    </nav>}
    <div className="qc-category-title-row mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-bold">{wishlistOnly ? 'Wishlist' : storeName ? storeName : childCategory?.name || subCategory?.name || category?.name || module?.name || (q ? 'Search Results' : 'All Categories')}</h1>
      <select value={sort} onChange={e => select({ sort: e.target.value })} className="qc-category-sort rounded-lg border bg-white px-3 py-2 text-sm"><option value="popularity">Sort by: Popularity</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="discount">Discount</option><option value="rating">Rating</option></select>
    </div>
    {visualSearch && <section className="qc-visual-search-header mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      {visualImage && <img src={visualImage} alt="Image used for visual product search" className="h-14 w-14 rounded-lg border border-slate-200 object-cover"/>}
      <div className="min-w-0 flex-1"><h1 className="text-sm font-bold text-slate-900">Visual product matches</h1><p className="mt-0.5 text-xs text-slate-500">{visualLoading ? 'Comparing your photo with catalog product images…' : `${items.length} closest catalog matches, ranked by image similarity.`}</p>{visualError && <p role="status" className="mt-1 text-xs text-rose-600">{visualError}</p>}</div>
      <button type="button" onClick={resetVisualSearch} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Clear</button>
    </section>}
    {moduleSlug && <div className="qc-all-modules-link mb-4 flex gap-2 overflow-x-auto pb-1"><Link to="/" className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold text-slate-600">All Modules</Link></div>}
    {category && !subCategory && <section className="mb-4"><div className="qc-category-level-title mb-2 text-sm font-semibold text-slate-700">Sub Categories</div><div className="flex gap-2 overflow-x-auto pb-2">
      {subCategories.map(item => <ChoiceButton key={item._id} item={item} active={sameId(item._id, subCategory?._id)} onClick={() => chooseSubCategory(item)}/>)}
      {subCategories.length === 0 && <p className="py-3 text-sm text-slate-400">No subcategories available.</p>}
    </div></section>}

    {subCategory && <section className="mb-4"><div className="qc-category-level-title mb-2 text-sm font-semibold text-slate-700">Child Categories</div><div className="flex gap-2 overflow-x-auto pb-2">
      {childCategories.map(item => <ChoiceButton key={item._id} item={item} active={sameId(item._id, childCategory?._id)} onClick={() => chooseChildCategory(item)}/>)}
      {childCategories.length === 0 && <p className="py-3 text-sm text-slate-400">No child categories available.</p>}
    </div></section>}
    <div className="qc-category-products-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(product => <ProductCard key={product.id || product._id || product.productId} product={product} showWishlistRemove={wishlistOnly}/>) }
    </div>
    <div className="qc-product-mobile-carousel">
      <div className="qc-product-carousel-track no-scrollbar">
        {productPages.map((page, pageIndex) => <div className="qc-product-carousel-page" key={pageIndex}>
          {page.map(product => <ProductCard key={product.id || product._id || product.productId} product={product} showWishlistRemove={wishlistOnly}/>) }
        </div>)}
      </div>
    </div>
    {items.length === 0 && !visualLoading && !visualError && <p className="py-16 text-center text-slate-400">No products found in this selection.</p>}
  </div>;
}
