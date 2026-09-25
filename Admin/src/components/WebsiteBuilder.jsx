import { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Monitor, Globe, Download, ShoppingBag,
  Megaphone, Layout, ChevronRight, IndianRupee, Check
} from 'lucide-react';
import api from '../api/axios';
import { useBuilderStore } from '../store/useStore';

const MODULES = [
  { type: 'ecommerce', name: 'E-Commerce', icon: ShoppingBag, color: 'bg-blue-500', desc: 'Online store with products, cart & checkout' },
  { type: 'marketing', name: 'Marketing', icon: Megaphone, color: 'bg-purple-500', desc: 'Landing pages, newsletters & promotions' },
  { type: 'general', name: 'General', icon: Layout, color: 'bg-green-500', desc: 'Basic website with header, footer & contact' },
];

export default function WebsiteBuilder() {
  const {
    closeBuilder, website, selectedModule, components, totalAmount, domain,
    setWebsite, setModule, addComponent, removeComponent, setDomain, reset
  } = useBuilderStore();

  const [step, setStep] = useState('module');
  const [availableComponents, setAvailableComponents] = useState([]);
  const [domainName, setDomainName] = useState('');
  const [domainType, setDomainType] = useState('subdomain');
  const [loading, setLoading] = useState(false);
  const [websiteName, setWebsiteName] = useState('My Website');

  useEffect(() => {
    if (selectedModule) {
      api.get(`/components?moduleType=${selectedModule}`)
        .then(res => setAvailableComponents(res.data))
        .catch(() => {});
    }
  }, [selectedModule]);

  const handleSelectModule = async (moduleType) => {
    setModule(moduleType);
    setStep('design');
    setLoading(true);
    try {
      const { data } = await api.post('/websites', { name: websiteName, moduleType });
      setWebsite(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = async (comp) => {
    if (!website) return;
    try {
      const { data } = await api.post(`/websites/${website._id}/components`, {
        componentId: comp._id
      });
      setWebsite(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveComponent = async (index) => {
    if (!website) return;
    try {
      const { data } = await api.delete(`/websites/${website._id}/components/${index}`);
      setWebsite(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDomain = async () => {
    if (!website || !domainName) return;
    try {
      const { data } = await api.post(`/websites/${website._id}/domain`, {
        domainName, type: domainType
      });
      setWebsite(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublish = async () => {
    if (!website) return;
    try {
      await api.post(`/websites/${website._id}/publish`);
      alert('Website published successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportZip = () => {
    if (!website) return;
    window.open(`/api/export/${website._id}/zip`, '_blank');
  };

  const handleClose = () => {
    reset();
    closeBuilder();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Builder Sidebar */}
      <div className="relative ml-auto w-[420px] bg-white shadow-2xl flex flex-col h-full animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-primary-600 text-white">
          <div>
            <h2 className="font-semibold text-lg">Website Designer</h2>
            <p className="text-primary-100 text-xs mt-0.5">Build your website visually</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-primary-700 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Steps */}
        <div className="flex border-b border-gray-200 text-xs">
          {['module', 'design', 'domain', 'publish'].map((s, i) => (
            <button
              key={s}
              onClick={() => step !== 'module' && setStep(s)}
              className={`flex-1 py-2.5 text-center capitalize font-medium transition ${
                step === s ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400'
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Module Selection */}
          {step === 'module' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Website Name</label>
                <input
                  value={websiteName} onChange={e => setWebsiteName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="My Awesome Store"
                />
              </div>
              <p className="text-sm text-gray-500">Select website type:</p>
              {MODULES.map(mod => (
                <button
                  key={mod.type}
                  onClick={() => handleSelectModule(mod.type)}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition text-left group"
                >
                  <div className={`w-12 h-12 ${mod.color} rounded-xl flex items-center justify-center text-white`}>
                    <mod.icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 group-hover:text-primary-600">{mod.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{mod.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-primary-500" />
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Design - Add Components */}
          {step === 'design' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Add Components</h3>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full capitalize">
                  {selectedModule}
                </span>
              </div>

              {/* Added Components */}
              {components.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase">Added ({components.length})</p>
                  {components.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <Check size={16} className="text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.componentId?.name || 'Component'}</p>
                        <p className="text-xs text-gray-500 capitalize">{c.componentId?.type}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-700">₹{c.price}</span>
                      <button onClick={() => handleRemoveComponent(i)} className="p-1 hover:bg-red-100 rounded text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available Components */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Available</p>
                {availableComponents.map(comp => {
                  const isAdded = components.some(c => c.componentId?._id === comp._id);
                  return (
                    <button
                      key={comp._id}
                      onClick={() => !isAdded && handleAddComponent(comp)}
                      disabled={isAdded}
                      className={`w-full flex items-center gap-3 p-3 border rounded-lg transition text-left ${
                        isAdded ? 'border-gray-100 bg-gray-50 opacity-50' : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                      }`}
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Plus size={18} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{comp.name}</p>
                        <p className="text-xs text-gray-500">{comp.description}</p>
                      </div>
                      <span className="text-sm font-bold text-primary-600">₹{comp.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Domain */}
          {step === 'domain' && (
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Domain Setup</h3>

              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${domainType === 'subdomain' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="domainType" value="subdomain" checked={domainType === 'subdomain'} onChange={() => setDomainType('subdomain')} />
                  <Globe size={20} className="text-primary-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Subdomain</p>
                    <p className="text-xs text-gray-500">yourstore.wepzo.com</p>
                  </div>
                  <span className="font-bold text-primary-600">₹500</span>
                </label>

                <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${domainType === 'custom' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="domainType" value="custom" checked={domainType === 'custom'} onChange={() => setDomainType('custom')} />
                  <Globe size={20} className="text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">Custom Domain</p>
                    <p className="text-xs text-gray-500">www.yourdomain.com</p>
                  </div>
                  <span className="font-bold text-purple-600">₹2000</span>
                </label>

                <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition ${domainType === 'none' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  <input type="radio" name="domainType" value="none" checked={domainType === 'none'} onChange={() => setDomainType('none')} />
                  <Download size={20} className="text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">ZIP Export Only</p>
                    <p className="text-xs text-gray-500">Download code, deploy anywhere</p>
                  </div>
                  <span className="font-bold text-green-600">Free</span>
                </label>
              </div>

              {domainType !== 'none' && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Domain Name</label>
                  <div className="flex mt-1">
                    <input
                      value={domainName} onChange={e => setDomainName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="yourstore"
                    />
                    {domainType === 'subdomain' && (
                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">.wepzo.com</span>
                    )}
                  </div>
                  <button
                    onClick={handleAddDomain}
                    className="mt-3 w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                  >
                    Add Domain
                  </button>
                </div>
              )}

              {domain?.fullDomain && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Domain: {domain.fullDomain}</p>
                  <p className="text-xs text-green-600 mt-1">₹{domain.price} added to total</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Publish */}
          {step === 'publish' && (
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Publish & Export</h3>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Website</span>
                  <span className="font-medium">{websiteName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Module</span>
                  <span className="font-medium capitalize">{selectedModule}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Components</span>
                  <span className="font-medium">{components.length}</span>
                </div>
                {domain?.fullDomain && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Domain</span>
                    <span className="font-medium">{domain.fullDomain}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-primary-600 text-lg">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {domain?.type !== 'none' && domain?.fullDomain && (
                <button
                  onClick={handlePublish}
                  className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 transition flex items-center justify-center gap-2"
                >
                  <Globe size={18} /> Publish Website
                </button>
              )}

              <button
                onClick={handleExportZip}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Download size={18} /> Download ZIP
              </button>

              <p className="text-xs text-gray-400 text-center">
                ZIP file contains complete HTML/CSS code. Deploy on any server with your own domain.
              </p>
            </div>
          )}
        </div>

        {/* Bottom: Total & Navigation */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <IndianRupee size={16} className="text-primary-600" />
              <span className="text-sm text-gray-500">Total:</span>
              <span className="text-xl font-bold text-primary-600">₹{totalAmount.toLocaleString()}</span>
            </div>
            <span className="text-xs text-gray-400">{components.length} components</span>
          </div>
          <div className="flex gap-2">
            {step !== 'module' && (
              <button
                onClick={() => {
                  const steps = ['module', 'design', 'domain', 'publish'];
                  const idx = steps.indexOf(step);
                  if (idx > 0) setStep(steps[idx - 1]);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
              >
                Back
              </button>
            )}
            {step !== 'publish' && step !== 'module' && (
              <button
                onClick={() => {
                  const steps = ['module', 'design', 'domain', 'publish'];
                  const idx = steps.indexOf(step);
                  if (idx < steps.length - 1) setStep(steps[idx + 1]);
                }}
                className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="relative flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Monitor Frame */}
          <div className="bg-gray-800 rounded-t-xl p-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 bg-gray-700 rounded-md px-4 py-1 text-xs text-gray-400 text-center">
              {domain?.fullDomain || 'preview.wepzo.com'}
            </div>
            <Monitor size={16} className="text-gray-400" />
          </div>

          {/* Preview Content */}
          <div className="bg-white border-x-4 border-b-4 border-gray-800 rounded-b-xl overflow-hidden" style={{ minHeight: '500px', maxHeight: '70vh', overflowY: 'auto' }}>
            {components.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                <Layout size={48} className="mb-4 opacity-30" />
                <p className="text-lg font-medium">Start adding components</p>
                <p className="text-sm mt-1">Your website preview will appear here</p>
              </div>
            ) : (
              components
                .sort((a, b) => a.order - b.order)
                .map((c, i) => (
                  <div key={i} dangerouslySetInnerHTML={{
                    __html: c.componentId?.htmlTemplate || `<div style="padding:20px;background:#f9fafb;text-align:center">${c.componentId?.name || 'Component'}</div>`
                  }} />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
