import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

// Automatically attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('kiri_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
