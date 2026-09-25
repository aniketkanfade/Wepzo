const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DEFAULT_PASSWORD = 'emp123';

function seedEmployees(roles = [], stores = []) {
  const storeAdminRole = roles.find(r => r.slug === 'store_admin');
  const employeeRole = roles.find(r => r.slug === 'employee');
  const activeStores = stores.filter(s => s.status === 'active').slice(0, 4);
  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 8);

  const list = [
    { name: 'Amit Sharma', email: 'amit@wepzo.com', phone: '9876501001', roleSlug: 'store_admin', storeIdx: 0, status: 'active' },
    { name: 'Priya Verma', email: 'priya@wepzo.com', phone: '9876501002', roleSlug: 'employee', storeIdx: 0, status: 'active' },
    { name: 'Rohit Patel', email: 'rohit@wepzo.com', phone: '9876501003', roleSlug: 'store_admin', storeIdx: 1, status: 'active' },
    { name: 'Sneha Gupta', email: 'sneha@wepzo.com', phone: '9876501004', roleSlug: 'employee', storeIdx: 2, status: 'inactive' },
    { name: 'Karan Mehta', email: 'karan@wepzo.com', phone: '9876501005', roleSlug: 'employee', storeIdx: 3, status: 'active' },
  ];

  return list.map((e, i) => {
    const role = e.roleSlug === 'store_admin' ? storeAdminRole : employeeRole;
    const st = activeStores[e.storeIdx] || activeStores[0];
    return {
      _id: uuidv4(),
      name: e.name,
      email: e.email,
      phone: e.phone,
      roleId: role?._id,
      roleSlug: e.roleSlug,
      roleName: role?.name || e.roleSlug,
      storeId: st?.storeId,
      storeName: st?.name || 'All Stores',
      status: e.status,
      loginEnabled: e.status === 'active',
      passwordHash,
      lastLoginAt: i < 3 ? new Date(Date.now() - (i + 1) * 6 * 3600000).toISOString() : null,
      loginCount: i < 3 ? 4 - i : 0,
      createdAt: new Date(Date.UTC(2025, 0, 10 + i, 9, 30)).toISOString(),
    };
  });
}

function seedEmployeeLoginHistory(employees = []) {
  const devices = ['Chrome / Windows', 'Admin Panel', 'Edge / Windows', 'Chrome / Android'];
  const rows = [];
  employees.forEach((e, i) => {
    const n = e.loginCount || 0;
    for (let k = 0; k < Math.max(n, i === 3 ? 1 : 0); k++) {
      const failed = i === 3 && k === 0;
      rows.push({
        _id: uuidv4(),
        employeeId: e._id,
        employeeName: e.name,
        email: e.email,
        status: failed ? 'failed' : (e.status !== 'active' ? 'blocked' : 'success'),
        ip: `103.21.${4 + i}.${10 + k}`,
        device: devices[(i + k) % devices.length],
        at: new Date(Date.now() - (i * 5 + k) * 3600000).toISOString(),
      });
    }
  });
  return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

module.exports = { seedEmployees, seedEmployeeLoginHistory, DEFAULT_EMPLOYEE_PASSWORD: DEFAULT_PASSWORD };
