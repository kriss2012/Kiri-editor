import axios from 'axios';

// Development service ports
const AUTH_URL   = 'http://localhost:3001/api/auth';
const EDITOR_URL = 'http://localhost:3002/api';
const AGENT_URL  = 'http://localhost:3003/api/agents';

export const AuthAPI   = axios.create({ baseURL: AUTH_URL });
export const EditorAPI = axios.create({ baseURL: EDITOR_URL });
export const AgentAPI  = axios.create({ baseURL: AGENT_URL });

const apis = [AuthAPI, EditorAPI, AgentAPI];

apis.forEach(api => {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('kiri_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});

export default { AuthAPI, EditorAPI, AgentAPI };
