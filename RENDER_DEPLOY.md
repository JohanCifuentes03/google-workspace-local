# 🚀 Despliegue en Render.com

## Servicios necesarios:

### 1️⃣ Redis (Upstash o Render Redis)
- Crea una instancia Redis en Upstash o Render
- Copia la URL de conexión (ej: `redis://user:pass@host:port`)

### 2️⃣ Backend (Web Service)
- **Repo**: `https://github.com/JohanCifuentes03/google-workspace-local`
- **Root Directory**: `backend`
- **Environment**: Docker
- **Port**: 10000

**Variables de entorno:**
```
NODE_ENV=production
PORT=10000
REDIS_URL=<tu-redis-url>
GOOGLE_CLIENT_ID=<tu-client-id>
GOOGLE_CLIENT_SECRET=<tu-client-secret>
PUBLIC_URL=<url-de-tu-backend-render>
CORS_ORIGIN=<url-de-tu-frontend-render>
```

### 3️⃣ Frontend (Web Service)
- **Repo**: `https://github.com/JohanCifuentes03/google-workspace-local`
- **Root Directory**: `frontend`
- **Environment**: Docker
- **Port**: 3000

**Variables de entorno:**
```
VITE_API_URL=<url-de-tu-backend-render>
```

## 📝 Configuración de Google OAuth:
En Google Cloud Console, agrega como Redirect URI:
```
https://tu-backend.onrender.com/auth/callback
```

## ✅ URLs finales:
- Frontend: `https://tu-frontend.onrender.com`
- Backend API: `https://tu-backend.onrender.com`
- Health Check: `https://tu-backend.onrender.com/health`
