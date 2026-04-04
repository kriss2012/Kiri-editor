import axios from 'axios';

// Single Gateway URL (Nginx on Port 80)
const GATEWAY_URL = 'http://localhost';

export const AuthAPI   = axios.create({ baseURL: `${GATEWAY_URL}/api/auth` });
export const EditorAPI = axios.create({ baseURL: `${GATEWAY_URL}/api/editor` });
export const AgentAPI  = axios.create({ baseURL: `${GATEWAY_URL}/api/agents` });

const apis = [AuthAPI, EditorAPI, AgentAPI];

apis.forEach(api => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('kiri_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});

export default { AuthAPI, EditorAPI, AgentAPI };
