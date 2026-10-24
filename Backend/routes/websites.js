const express = require('express');
const Website = require('../models/Website');
const Component = require('../models/Component');
const { auth } = require('../middleware/auth');

const router = express.Router();

const calcTotal = (components, domainPrice = 0) =>
  components.reduce((sum, c) => sum + (c.price || 0), 0) + domainPrice;

const normalizeDomain = value => String(value || '').trim().toLowerCase()
  .replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/\.$/, '');

function prepareDomain(domainName, type) {
  const domainType = type || 'subdomain';
  if (domainType === 'none') {
    return { domain: { type: 'none', name: '', fullDomain: '', price: 0, status: 'active' }, domainPrice: 0 };
  }
  if (!['subdomain', 'custom'].includes(domainType)) return { error: 'Choose a valid domain type.' };

  const name = normalizeDomain(domainName);
  const baseDomain = normalizeDomain(process.env.BASE_DOMAIN || 'wepzo.in');
  const valid = domainType === 'subdomain'
    ? /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name)
    : name.length <= 253 && name.split('.').length >= 2
      && name.split('.').every(label => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
  if (!valid) return { error: 'Enter a valid domain name.' };

  const domainPrice = domainType === 'subdomain' ? 500 : 2000;
  return {
    domainPrice,
    domain: {
      type: domainType,
      name,
      fullDomain: domainType === 'subdomain' ? `${name}.${baseDomain}` : name,
      price: domainPrice,
      status: 'pending'
    }
  };
}

async function isDomainAvailable(fullDomain, websiteId) {
  if (!fullDomain) return true;
  return !await Website.exists({ 'domain.fullDomain': fullDomain, _id: { $ne: websiteId } })
    .collation({ locale: 'en', strength: 2 });
}

function isDuplicateDomainError(error) {
  return error?.code === 11000;
}

router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'main_admin' ? {} : { userId: req.user._id };
    const websites = await Website.find(filter)
      .populate('components.componentId')
      .sort({ updatedAt: -1 });
    res.json(websites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id).populate('components.componentId');
    if (!website) return res.status(404).json({ message: 'Website not found' });
    if (req.user.role !== 'main_admin' && website.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, moduleType } = req.body;
    const website = await Website.create({
      name: name || 'Untitled Website',
      moduleType: moduleType || 'general',
      userId: req.user._id
    });
    res.status(201).json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });
    if (req.user.role !== 'main_admin' && website.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updates = { ...req.body };
    if (req.user.role !== 'main_admin') delete updates.userId;
    if (Object.prototype.hasOwnProperty.call(updates, 'domain')) {
      const incomingDomain = updates.domain || {};
      const prepared = prepareDomain(incomingDomain.name || incomingDomain.fullDomain, incomingDomain.type);
      if (prepared.error) return res.status(400).json({ message: prepared.error });
      if (!await isDomainAvailable(prepared.domain.fullDomain, website._id)) {
        return res.status(409).json({ message: 'Domain not available. Choose another name.' });
      }
      updates.domain = { ...(website.domain?.toObject?.() || website.domain || {}), ...prepared.domain };
    }

    Object.assign(website, updates);
    if (req.body.components) {
      website.totalAmount = calcTotal(website.components, website.domain?.price || 0);
    }
    await website.save();
    res.json(website);
  } catch (err) {
    res.status(isDuplicateDomainError(err) ? 409 : 500).json({
      message: isDuplicateDomainError(err) ? 'Domain not available. Choose another name.' : err.message
    });
  }
});

router.post('/:id/components', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });

    const { componentId, config } = req.body;
    const component = await Component.findById(componentId);
    if (!component) return res.status(404).json({ message: 'Component not found' });

    website.components.push({
      componentId,
      config: config || component.defaultConfig,
      order: website.components.length,
      price: component.price
    });
    website.totalAmount = calcTotal(website.components, website.domain?.price || 0);
    await website.save();

    const populated = await Website.findById(website._id).populate('components.componentId');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/components/:compIndex', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });

    website.components.splice(parseInt(req.params.compIndex), 1);
    website.totalAmount = calcTotal(website.components, website.domain?.price || 0);
    await website.save();

    const populated = await Website.findById(website._id).populate('components.componentId');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/domain', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });
    if (req.user.role !== 'main_admin' && website.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { domainName, type } = req.body;
    const prepared = prepareDomain(domainName, type);
    if (prepared.error) return res.status(400).json({ message: prepared.error });
    if (!await isDomainAvailable(prepared.domain.fullDomain, website._id)) {
      return res.status(409).json({ message: 'Domain not available. Choose another name.' });
    }

    website.domain = { ...(website.domain?.toObject?.() || website.domain || {}), ...prepared.domain };
    website.totalAmount = calcTotal(website.components, prepared.domainPrice);
    await website.save();
    res.json(website);
  } catch (err) {
    res.status(isDuplicateDomainError(err) ? 409 : 500).json({
      message: isDuplicateDomainError(err) ? 'Domain not available. Choose another name.' : err.message
    });
  }
});

router.post('/:id/publish', auth, async (req, res) => {
  try {
    const website = await Website.findById(req.params.id);
    if (!website) return res.status(404).json({ message: 'Website not found' });

    website.status = 'published';
    website.publishedAt = new Date();
    if (website.domain) website.domain.status = 'active';
    await website.save();
    res.json(website);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Website.findByIdAndDelete(req.params.id);
    res.json({ message: 'Website deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
