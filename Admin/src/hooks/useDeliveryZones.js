import { useEffect, useState } from 'react';
import api from '../api/axios';

export function useDeliveryZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/zones')
      .then(r => setZones((r.data || []).filter(z => z.status !== false)))
      .catch(() => setZones([]))
      .finally(() => setLoading(false));
  }, []);

  return { zones, loading, names: zones.map(z => z.name) };
}
