import React from 'react';
import ReactDOM from 'react-dom/client';
import ReChat from './ReChat.jsx';
import './index.css';

window.storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value === null ? null : { value };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ReChat />
  </React.StrictMode>
);
