# 🚀 Google Workspace MCP Local

**¡Sistema completamente local!** Presiona un botón, haz login con Google, y obtén una URL MCP para conectar tu agente.

## 🔥 Inicio Rápido (1 comando)

```bash
# 1. Clona el proyecto
git clone <tu-repo>
cd google-workspace-local

# 2. Configura Google OAuth (sólo 1 vez)
cp backend/.env.example backend/.env
# Edita backend/.env con tus credenciales de Google Cloud

# 3. ¡Inicia todo!
docker-compose up --build

# 4. Abre http://localhost:5173
# 5. Haz clic en "Crear Sesión y Conectar"
# 6. ¡Copia tu URL MCP!
```

## 🎯 ¿Qué hace?

- ✅ **Multi-tenant**: Cada usuario tiene su propia sesión MCP
- ✅ **9 herramientas**: Gmail, Drive, Calendar con OAuth por usuario
- ✅ **SDK oficial MCP**: Compatible con cualquier agente MCP
- ✅ **Completamente local**: Todo corre en Docker containers
- ✅ **Redis persistente**: Sesiones sobreviven reinicios

## 🛠️ Configuración Inicial

### 1. Google Cloud Console (5 minutos)

1. Ve a https://console.cloud.google.com
2. Crea proyecto: "MCP-Local-Test"
3. Habilita APIs: Gmail, Drive, Calendar
4. Crea OAuth 2.0 Client ID (Web Application)
5. Agrega redirect URI: `http://localhost:3000/auth/callback`
6. Copia Client ID y Secret

### 2. Variables de Entorno

```bash
# Copia y edita
cp backend/.env.example backend/.env

# Edita con tus credenciales
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
```

¡Listo! Ya puedes usar el proyecto.

## 🎮 Modos de Uso

### 🚀 Desarrollo (Con hot-reload)
```bash
# Para desarrollo con cambios en tiempo real
docker-compose -f docker-compose.dev.yml up --build
```

### 🐳 Producción (Optimizado)
```bash
# Para producción estable
docker-compose -f docker-compose.prod.yml up -d --build
```

### 🛠️ Manual (Sin Docker)
```bash
# Backend
cd backend
npm install && npm run build
npm run dev

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

## 📡 Uso con Agentes

Después de conectar, obtienes una URL como:
```
http://localhost:3000/mcp/{userId}
```

Úsala en tu agente MCP:

```javascript
// Ejemplo con cualquier cliente MCP
const response = await fetch('http://localhost:3000/mcp/{userId}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'gmail_send',
      arguments: {
        to: 'test@gmail.com',
        subject: 'Hola desde MCP',
        body: 'Este email fue enviado usando MCP!'
      }
    },
    id: 1
  })
});
```

## 🛠️ Herramientas Disponibles

| Herramienta | Descripción | Ejemplo |
|-------------|-------------|---------|
| `gmail_search` | Buscar emails | `query: "from:boss@company.com"` |
| `gmail_send` | Enviar emails | `to, subject, body` |
| `gmail_read` | Leer emails | `messageId` |
| `drive_search` | Buscar archivos | `query: "name contains 'report'"` |
| `drive_read` | Leer archivos | `fileId` |
| `drive_list` | Listar archivos | `folderId` |
| `calendar_list_events` | Eventos calendario | `timeMin, timeMax` |
| `calendar_create_event` | Crear eventos | `summary, start, end` |
| `calendar_get_event` | Ver evento | `eventId` |

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev          # Hot-reload backend
npm run build        # Compilar TypeScript
npm run setup        # Instalar y compilar

# Docker
npm run docker:up    # Iniciar servicios
npm run docker:dev   # Desarrollo con hot-reload
npm run docker:down  # Detener servicios
npm run docker:build # Construir imagen

# Logs
docker-compose logs backend    # Ver logs backend
docker-compose logs frontend  # Ver logs frontend
docker-compose logs redis      # Ver logs Redis
```

## 🚨 Solución de Problemas

### Error: "Popup bloqueado"
- Permite popups para `localhost:5173`
- Desactiva bloqueadores de popups temporalmente

### Error: "Redis connection failed"
```bash
# Reinicia Redis
docker-compose down
docker-compose up redis -d
docker-compose up backend
```

### Error: "Google OAuth callback"
- Verifica que el redirect URI en Google Cloud sea exactamente: `http://localhost:3000/auth/callback`
- Asegúrate de que el puerto 3000 esté disponible

## 📚 Más Información

- [SDK Oficial MCP](https://github.com/modelcontextprotocol)
- [Google APIs](https://developers.google.com/identity/protocols/oauth2)
- [Docker Compose](https://docs.docker.com/compose/)

## 🤝 Contribución

1. Fork el proyecto
2. Crea rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver archivo [LICENSE](LICENSE) para más detalles.

## ✨ Características

- ✅ **Multi-Tenant**: Cada usuario tiene su propia sesión y MCP URL
- ✅ **SDK MCP Oficial**: Implementación completa usando `@modelcontextprotocol/sdk`
- ✅ **TypeScript**: Código tipado y mantenible
- ✅ **OAuth 2.0**: Autenticación segura con Google por usuario
- ✅ **9 Tools**: Gmail, Google Drive, y Google Calendar
- ✅ **Redis Sessions**: Almacenamiento persistente de sesiones
- ✅ **Docker Ready**: Despliegue completo con docker-compose
- ✅ **MCP Protocol**: Compatible con cualquier cliente MCP

## 🚀 Despliegue Público

Para hacer el MCP accesible desde agentes externos, tienes dos opciones:

### Opción 1: Ngrok (Recomendado para Pruebas Rápidas)

Ngrok crea un túnel público automáticamente a tu localhost.

1. **Instalar Ngrok**: https://ngrok.com/download
2. **Configurar Auth Token** (recomendado para estabilidad):
   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```
3. **Instalar dependencias y compilar**:
   ```bash
   cd backend
   npm install
   npm run build
   ```

4. **Iniciar el servidor**:
   ```bash
   npm start  # Para producción
   # o
   npm run dev  # Para desarrollo con ts-node
   ```

4. **Exponer con ngrok** (en terminal separada):
   ```bash
   ngrok http 3000
   ```
   Copia la URL HTTPS que te da ngrok (ej: `https://abc123.ngrok.io`)

5. **Actualizar configuración**:
   Edita `backend/.env` y cambia:
   ```
   PUBLIC_URL=https://abc123.ngrok.io
   ```

6. **Reiniciar el backend** para que tome la nueva URL pública

7. **Actualizar Google Cloud Console**:
   - Agrega `https://abc123.ngrok.io/auth/callback` a Authorized redirect URIs

8. **Conectar y usar**:
   - Abre http://localhost:5173
   - Conecta con Google
   - Obtén la URL MCP pública

### Opción 2: Despliegue en la Nube (Railway)

1. **Crear cuenta en Railway**: https://railway.app
2. **Conectar GitHub**: Sube este repositorio a GitHub
3. **Desplegar**: Railway detectará automáticamente el proyecto Node.js
4. **Configurar Variables de Entorno**:
   - `GOOGLE_CLIENT_ID`: Tu Client ID de Google
   - `GOOGLE_CLIENT_SECRET`: Tu Client Secret
   - `PUBLIC_URL`: La URL que Railway te asigna (ej: `https://google-workspace-mcp.up.railway.app`)
   - `PORT`: 3000 (Railway lo configura automáticamente)

5. **Actualizar Google Cloud Console**:
   - Agrega la URL de Railway + `/auth/callback` a los Authorized redirect URIs
   - Ejemplo: `https://google-workspace-mcp.up.railway.app/auth/callback`

### Opción Alternativa: Render

1. **Crear cuenta en Render**: https://render.com
2. **Crear Web Service** desde GitHub
3. **Configurar Build & Start**:
   - Build Command: `npm install`
   - Start Command: `node backend/server.js`
4. **Variables de Entorno**: Igual que arriba
5. **Actualizar Redirect URI** en Google Cloud

## 🖥️ Uso Local (Desarrollo)

### Opción 1: Docker Compose (Recomendado)
```bash
# Crear archivo .env con tus credenciales
cp backend/.env.example backend/.env
# Editar backend/.env con GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET

# Iniciar servicios
podman-compose up --build

# Frontend (opcional)
cd frontend
npm install
npm run dev
```

### Opción 2: Manual
```bash
# Redis (en terminal separada - requerido para multi-tenant)
redis-server

# Backend
cd backend
npm install
npm run build
npm run dev  # Para desarrollo con ts-node
# o
npm start    # Para producción con archivos compilados

# Frontend (opcional)
cd ../frontend
npm install
npm run dev
```

### Opción 3: Sin Redis (Solo para pruebas)
Si no tienes Redis instalado, puedes usar la versión single-tenant temporal:
```bash
cd backend
# Editar http-server.ts para comentar SessionManager y usar implementación simple
npm run dev
```

Abre http://localhost:5173

## 🏗️ Arquitectura

### **MCP SDK Implementation**
- **Server Class**: Usa `Server` del SDK oficial para manejar requests MCP
- **Tool Objects**: Tools definidas según especificación MCP con schemas JSON
- **Protocol Compliance**: 100% compatible con MCP 2024-11-05
- **HTTP Bridge**: Convierte requests HTTP a llamadas MCP

### **Componentes**
- `server.ts`: MCP Server usando SDK oficial
- `http-server.ts`: Bridge HTTP para web interface y OAuth
- `auth.ts`: Gestor OAuth 2.0 con Google APIs
- `tools/`: Implementaciones de tools Gmail, Drive, Calendar

## 🔧 Configuración

1. **Google Cloud Console**:
   - Proyecto creado
   - APIs habilitadas: Gmail, Drive, Calendar
   - OAuth 2.0 Client ID creado (tipo Web Application)
   - Redirect URI: `https://tu-dominio.com/auth/callback/{userId}`

2. **Dependencias**:
   ```bash
   npm install  # Instala todas las dependencias
   npm run build  # Compila TypeScript
   ```

3. **Variables de Entorno**:
   ```env
   GOOGLE_CLIENT_ID=tu_client_id
   GOOGLE_CLIENT_SECRET=tu_client_secret
   PUBLIC_URL=http://localhost:3000
   PORT=3000
   REDIS_URL=redis://localhost:6379
   ```

## 📡 API Multi-Tenant

### Crear Nueva Sesión
```bash
curl http://localhost:3000/session/new
# Respuesta: { "userId": "uuid", "authUrl": "...", "mcpUrl": "..." }
```

### Autenticación OAuth
```bash
# Usuario visita: /auth/start/{userId}
# Google OAuth con redirect: /auth/callback/{userId}
```

### Verificar Estado
```bash
curl http://localhost:3000/status/{userId}
# Respuesta: { "connected": true, "mcpUrl": "..." }
```

### MCP Endpoint
```bash
curl -X POST http://localhost:3000/mcp/{userId} \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Desconectar
```bash
curl -X POST http://localhost:3000/disconnect/{userId}
```

## 📡 MCP URL

Después de conectar, obtendrás una URL como:
`https://tu-dominio.com/mcp`

Esta URL puede ser usada por cualquier agente MCP externo.

## 🛠️ Tools MCP Disponibles

Todas las tools siguen el protocolo MCP oficial y están documentadas con schemas JSON completos.

### **Gmail Tools**
- **`gmail_search`**: Busca emails usando operadores Gmail avanzados
  - Query examples: `"from:boss@company.com"`, `"subject:meeting"`, `"has:attachment"`
- **`gmail_send`**: Envía emails desde tu cuenta autenticada
- **`gmail_read`**: Lee el contenido completo de un email por ID

### **Google Drive Tools**
- **`drive_search`**: Busca archivos usando queries Drive
  - Query examples: `"name contains 'report'"`, `"mimeType = 'application/pdf'"`
- **`drive_read`**: Lee contenido de archivos de texto
- **`drive_list`**: Lista archivos en una carpeta específica

### **Google Calendar Tools**
- **`calendar_list_events`**: Lista eventos próximos o en rango de fechas
- **`calendar_create_event`**: Crea nuevos eventos con fecha/hora ISO 8601
- **`calendar_get_event`**: Obtiene detalles completos de un evento

### **Uso con Agentes**
```javascript
// Ejemplo de llamada MCP
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "gmail_search",
    "arguments": {
      "query": "from:important@email.com",
      "maxResults": 5
    }
  },
  "id": 1
}
```

## 🔒 Seguridad Multi-Tenant

- **OAuth 2.0 por Usuario**: Cada usuario autentica su propia cuenta Google
- **UUID Sessions**: Identificadores únicos para cada sesión de usuario
- **Redis Tokens**: Credenciales almacenadas de forma segura con TTL
- **MCP Isolado**: Cada usuario tiene su propio endpoint `/mcp/{userId}`
- **Scopes Limitados**: Solo permisos necesarios (Gmail, Drive, Calendar)
- **Session Expiry**: Sesiones expiran automáticamente (24h por defecto)

## 📝 Notas Técnicas

- **TypeScript SDK**: Implementación oficial de Model Context Protocol
- **Protocolo MCP 2024-11-05**: Compatible con cualquier cliente MCP
- **Persistencia**: Tokens reinician con el servidor (agrega Redis para persistencia)
- **Frontend Opcional**: Usa directamente los endpoints HTTP del backend
- **Desarrollo**: `npm run dev` para hot-reload con ts-node

## 🤝 Contribución

Este proyecto usa el SDK oficial de MCP. Para modificaciones:
1. Edita archivos `.ts` en `/backend`
2. `npm run build` para compilar
3. `npm start` para ejecutar