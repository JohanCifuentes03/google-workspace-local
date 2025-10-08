# Backend - Google Workspace MCP Server

## Despliegue en Render.com

### Variables de entorno requeridas:
- `GOOGLE_CLIENT_ID`: Tu Client ID de Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: Tu Client Secret de Google Cloud Console  
- `PUBLIC_URL`: URL donde se desplegará (ej: https://tu-app.onrender.com)
- `REDIS_URL`: URL de tu instancia Redis (ej: redis://user:pass@host:port)
- `CORS_ORIGIN`: Origen permitido para CORS (ej: https://tu-frontend.onrender.com)

### Configuración de Google OAuth:
1. Ve a Google Cloud Console
2. En tu proyecto OAuth, agrega como Redirect URI: `{PUBLIC_URL}/auth/callback`
3. Ejemplo: `https://tu-backend.onrender.com/auth/callback`

### Endpoints principales:
- `GET /health` - Health check
- `GET /session/new` - Crear nueva sesión
- `GET /auth/start?userId={userId}` - Iniciar OAuth  
- `GET /auth/callback` - Callback OAuth
- `POST /mcp?userId={userId}` - Endpoint MCP

### Desarrollo local:
```bash
npm install
npm run dev
```

### Docker:
```bash
docker build -t backend .
docker run -p 10000:10000 --env-file .env backend
```