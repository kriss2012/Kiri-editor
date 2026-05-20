import axios from 'axios';

// Dynamic Gateway URL (Relative path for standalone/offline support, falls back to window.location.origin)
const GATEWAY_URL = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:4000';

export const AuthAPI   = axios.create({ baseURL: `${GATEWAY_URL}/api/auth` });
export const EditorAPI = axios.create({ baseURL: `${GATEWAY_URL}/api/editor` });
export const AgentAPI  = axios.create({ baseURL: `${GATEWAY_URL}/api/agents` });
export const SearchAPI = axios.create({ baseURL: `${GATEWAY_URL}/api/search` });
export const TerminalAPI = axios.create({ baseURL: `${GATEWAY_URL}/api/terminal` });

const apis = [AuthAPI, EditorAPI, AgentAPI, SearchAPI, TerminalAPI];

apis.forEach(api => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('kiri_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});

export default { AuthAPI, EditorAPI, AgentAPI, SearchAPI, TerminalAPI };
