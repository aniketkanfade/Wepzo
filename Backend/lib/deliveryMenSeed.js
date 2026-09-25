const { v4: uuidv4 } = require('uuid');

const areas = ['Sitabuldi', 'Civil Lines', 'Dharampeth', 'Wardha Road', 'Hingna Road'];

const areaLocations = {
  'Sitabuldi': { location: 'Near Sitabuldi Square, Nagpur', lat: 21.1458, lng: 79.0882 },
  'Civil Lines': { location: 'Zero Mile, Civil Lines, Nagpur', lat: 21.1520, lng: 79.0894 },
  'Dharampeth': { location: 'Dharampeth Main Road, Nagpur', lat: 21.1389, lng: 79.0654 },
  'Wardha Road': { location: 'Wardha Road, Beside Mall, Nagpur', lat: 21.1245, lng: 79.0521 },
  'Hingna Road': { location: 'Hingna Road, IT Park Area, Nagpur', lat: 21.1087, lng: 79.0012 },
};

const names = [
  'Ravi Kumar', 'Suresh Yadav', 'Ajay Singh', 'Manoj Patil',
  'Vikram Deshmukh', 'Nitin Kulkarni', 'Prakash Jadhav', 'Sandeep Rao',
  'Ganesh More', 'Anil Thakur', 'Rohit Bhosale', 'Kunal Shinde',
];

function seedDeliveryMen() {
  const men = [];
  areas.forEach((area, ai) => {
    const base = areaLocations[area];
    names.slice(ai * 2, ai * 2 + 3).forEach((name, i) => {
      men.push({
        _id: uuidv4(),
        name,
        phone: `98${10000000 + ai * 1000 + i * 111}`,
        area,
        location: base.location,
        lat: base.lat + (i * 0.0015),
        lng: base.lng + (i * 0.0012),
        online: i < 2,
        activeOrders: i === 0 ? 1 : 0,
        rating: (4.2 + (i * 0.2)).toFixed(1),
        vehicle: i % 2 === 0 ? 'Bike' : 'Scooter',
      });
    });
  });
  return men;
}

module.exports = { seedDeliveryMen, areas, areaLocations };
