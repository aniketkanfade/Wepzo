import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { getAdminModuleKey } from '../constants/adminModules';
import { ecommercePreviewBase } from '../utils/ecommercePreviewUrl';

export default function PublishedWebsitePage() {
  const { websiteId } = useParams();
  const [website, setWebsite] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/public/published-websites/' + websiteId).then(({ data }) => {
      if (alive) setWebsite(data);
    }).catch(() => {
      if (alive) setError('Published website could not be loaded for this ID.');
    });
    return () => { alive = false; };
  }, [websiteId]);

  const moduleKey = getAdminModuleKey({
    slug: website?.websiteModuleSlug || website?.moduleType,
    type: website?.moduleType,
    name: website?.moduleName,
  });
  const storefrontUrl = useMemo(() => {
    if (!website || !['quick-commerce', 'e-commerce', 'store-single', 'information-web'].includes(moduleKey)) return '';
    if (moduleKey === 'information-web') {
      const url = new URL(import.meta.env.VITE_GENERAL_PREVIEW_URL || 'http://localhost:5174/', window.location.origin);
      url.searchParams.set('published', '1');
      url.searchParams.set('websiteId', website._id);
      if (website.websiteModuleId) url.searchParams.set('websiteModuleId', website.websiteModuleId);
      return url.href;
    }
    if (moduleKey === 'e-commerce') {
      const baseUrl = ecommercePreviewBase(website, { mainAdmin: website?.domain?.fullDomain === 'wepzo.in' });
      if (!baseUrl) return '';
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('published', '1');
      url.searchParams.set('websiteId', website._id);
      if (website.websiteModuleId) url.searchParams.set('moduleId', website.websiteModuleId);
      return url.href;
    }
    if (moduleKey === 'store-single') {
      const url = new URL(import.meta.env.VITE_STORE_SINGLE_PREVIEW_URL || 'http://localhost:5175/', window.location.origin);
      url.searchParams.set('published', '1');
      url.searchParams.set('websiteId', website._id);
      if (website.websiteModuleId) url.searchParams.set('websiteModuleId', website.websiteModuleId);
      return url.href;
    }
    const url = new URL(import.meta.env.VITE_QC_PREVIEW_URL || 'http://localhost:3001/', window.location.origin);
    const components = [...new Set((website.components || []).flatMap(({ componentId }) => {
      const slug = componentId?.slug;
      if (slug === 'quick-commerce-favorites-cart') return ['quick-commerce-favorites', 'quick-commerce-cart'];
      return slug ? [slug] : [];
    }))];
    url.searchParams.set('published', '1');
    url.searchParams.set('websiteId', website._id);
    if (website.websiteModuleId) url.searchParams.set('websiteModuleId', website.websiteModuleId);
    if (components.length) url.searchParams.set('components', components.join(','));
    else url.searchParams.delete('components');
    return url.href;
  }, [website, moduleKey]);

  useEffect(() => {
    if (storefrontUrl) window.location.replace(storefrontUrl);
  }, [storefrontUrl]);

  if (error) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-slate-700">{error}<br/>Website ID: {websiteId}</div>;
  if (!website) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading website...</div>;

  if (!storefrontUrl) return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center"><h1 className="text-xl font-semibold text-slate-800">Live storefront is not available for this module yet</h1><p className="mt-2 text-sm text-slate-600">Website ID: {website._id}</p></main>;

  return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Opening the live website...</div>;
}
