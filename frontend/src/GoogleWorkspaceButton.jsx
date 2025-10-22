import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import './GoogleWorkspaceButton.css';

// Get API URL from environment variable or use default for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GoogleWorkspaceButton = () => {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [mcpUrl, setMcpUrl] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userId) {
      checkStatus();
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userId]);

  const checkStatus = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_URL}/status/${userId}?ngrok-skip-browser-warning=true`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status} ${response.statusText} -> ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse status response:', responseText);
        throw parseError;
      }
      if (data.connected) {
        setStatus('connected');
        setMcpUrl(data.mcpUrl);
      } else {
        setStatus('disconnected');
        setMcpUrl('');
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleMessage = (event) => {
    if (event.data && event.data.type === 'connected' && event.data.userId) {
      setUserId(event.data.userId);
      setStatus('connected');
      checkStatus(); // Refresh URL
    }
  };

  const handleConnect = async () => {
    setStatus('connecting');
    setError('');

    try {
      // Create a new session first
      const sessionResponse = await fetch(`${API_URL}/session/new?ngrok-skip-browser-warning=true`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      const sessionText = await sessionResponse.text();
      if (!sessionResponse.ok) {
        throw new Error(`Session request failed: ${sessionResponse.status} ${sessionResponse.statusText} -> ${sessionText}`);
      }

      let sessionData;
      try {
        sessionData = JSON.parse(sessionText);
      } catch (parseError) {
        console.error('Failed to parse session response:', sessionText);
        throw parseError;
      }

      setUserId(sessionData.userId);

      // Open popup with the auth URL from the session
      const popup = window.open(
        sessionData.authUrl,
        'google-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Check if popup was blocked
      if (!popup) {
        setError('Popup bloqueado. Permite popups para este sitio.');
        setStatus('disconnected');
        return;
      }

      // Check if popup is closed without connecting
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (status === 'connecting') {
            setStatus('disconnected');
            setError('Conexión cancelada o fallida.');
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Error al crear sesión.');
      setStatus('disconnected');
    }
  };

  const handleDisconnect = async () => {
    if (!userId) return;

    try {
      const disconnectResponse = await fetch(`${API_URL}/disconnect/${userId}?ngrok-skip-browser-warning=true`, { 
        method: 'POST',
        mode: 'cors',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!disconnectResponse.ok) {
        const disconnectText = await disconnectResponse.text();
        throw new Error(`Disconnect failed: ${disconnectResponse.status} ${disconnectResponse.statusText} -> ${disconnectText}`);
      }
      setStatus('disconnected');
      setMcpUrl('');
      setUserId('');
      setError('');
    } catch (error) {
      console.error('Error disconnecting:', error);
      setError('Error al desconectar.');
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="connector-card">
      {/* Header */}
      <div className="connector-header">
        <svg className="connector-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
        </svg>
        <div className="connector-info">
          <h3 className="connector-title">Google Workspace MCP</h3>
          <p className="connector-description">Gmail, Drive & Calendar Tools</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="connector-status">
        {status === 'disconnected' && (
          <span className="status-badge status-disconnected">
            <span className="status-dot"></span>
            Desconectado
          </span>
        )}
        {status === 'connecting' && (
          <span className="status-badge status-connecting">
            <Loader2 className="status-spinner" size={12} />
            Conectando...
          </span>
        )}
        {status === 'connected' && (
          <span className="status-badge status-connected">
            <CheckCircle2 size={12} />
            Conectado
          </span>
        )}
      </div>

      {/* Connection Section */}
      <div className="connector-body">
        {status === 'disconnected' && (
          <button
            className="btn-primary"
            onClick={handleConnect}
            disabled={status === 'connecting'}
          >
            Crear conexión
          </button>
        )}

        {status === 'connected' && (
          <>
            <div className="connection-details">
              <label className="detail-label">URL del conector</label>
              <div className="url-input-group">
                <input
                  type="text"
                  className="url-input"
                  value={mcpUrl}
                  readOnly
                />
                <button
                  className="btn-icon"
                  onClick={copyUrl}
                  title={copied ? '¡Copiado!' : 'Copiar URL'}
                >
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={handleDisconnect}
            >
              Cerrar conexión
            </button>
          </>
        )}

        {error && (
          <div className="error-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleWorkspaceButton;