import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './mobile.css';
import { useAuthStore } from './store/auth';
import { shop } from './api';

useAuthStore.persist.onFinishHydration((state) => {
  if (state?.token) shop.setToken(state.token);
});
if (useAuthStore.persist.hasHydrated()) {
  const t = useAuthStore.getState().token;
  if (t) shop.setToken(t);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
