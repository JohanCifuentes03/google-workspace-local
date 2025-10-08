import { useState, useEffect } from 'react';
import { Cloud, CheckCircle, XCircle, Copy } from 'lucide-react';
import './GoogleWorkspaceButton.css';

const GoogleWorkspaceButton = () => {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [mcpUrl, setMcpUrl] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

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
      const response = await fetch(`/api/status/${userId}`);
      const data = await response.json();
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
      const sessionResponse = await fetch('/api/session/new');
      const sessionData = await sessionResponse.json();

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
      await fetch(`/api/disconnect/${userId}`, { method: 'POST' });
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
    // Could add a toast notification here
  };

  return (
    <div className="workspace-button-container">
      {status === 'disconnected' && (
        <button
          className="connect-button"
          onClick={handleConnect}
          disabled={status === 'connecting'}
        >
          <Cloud size={20} />
          Crear Sesión y Conectar
        </button>
      )}

      {status === 'connecting' && (
        <div className="status-message connecting">
          <div className="spinner"></div>
          Conectando...
        </div>
      )}

      {status === 'connected' && (
        <div className="connected-container">
          <div className="status-message connected">
            <CheckCircle size={20} color="green" />
            Conectado
          </div>
          <div className="url-container">
            <span className="url-label">URL MCP:</span>
            <code className="mcp-url">{mcpUrl}</code>
            <button className="copy-button" onClick={copyUrl} title="Copiar URL">
              <Copy size={16} />
            </button>
          </div>
          <button className="disconnect-button" onClick={handleDisconnect}>
            <XCircle size={16} />
            Desconectar
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
};

export default GoogleWorkspaceButton;