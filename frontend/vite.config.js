import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

// Read properties file
const propertiesPath = path.resolve(__dirname, '../app.properties');
const properties = {};
if (fs.existsSync(propertiesPath)) {
  const content = fs.readFileSync(propertiesPath, 'utf-8');
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      properties[key.trim()] = value.trim();
    }
  });
}

const frontendPort = properties.FRONTEND_PORT ? parseInt(properties.FRONTEND_PORT) : 5173;
const backendPort = properties.BACKEND_PORT ? parseInt(properties.BACKEND_PORT) : 8000;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: frontendPort,
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(`http://localhost:${backendPort}`),
  },
})
