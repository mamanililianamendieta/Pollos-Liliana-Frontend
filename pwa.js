// Configuración del botón de instalación centralizado en el ROOT
const installButton = document.createElement('button');
installButton.id = 'pwa-install-button';
installButton.textContent = 'Instalar App';
Object.assign(installButton.style, {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  padding: '10px 20px',
  backgroundColor: '#3367D6',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  fontSize: '16px',
  cursor: 'pointer',
  display: 'none',
  zIndex: '1000'
});
document.body.appendChild(installButton);

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] Evento beforeinstallprompt recibido');
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`);
    if (outcome === 'accepted') {
      installButton.textContent = '✓ ¡Instalada!';
      setTimeout(() => installButton.style.display = 'none', 2000);
    }
  } catch (error) {
    console.error('[PWA] Error al mostrar el prompt:', error);
  } finally {
    deferredPrompt = null;
    installButton.style.display = 'none';
  }
});

// Registro del Service Worker desde la RAÍZ (Más fiable)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[PWA] Service Worker registrado en raíz:', registration.scope);
      })
      .catch(error => {
        console.error('[PWA] Error al registrar Service Worker:', error);
      });
  });
}

// Detección de iOS extendida
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

if (isIOS && !window.navigator.standalone) {
  const iosBanner = document.createElement('div');
  iosBanner.innerHTML = `
    <div style="position: fixed; bottom: 0; left: 0; right: 0; padding: 15px; background: #ffffff; text-align: center; border-top: 2px solid #3367D6; z-index: 9999; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);">
      <p style="margin: 0; font-family: sans-serif; color: #333;">📱 Para instalar en iPhone: Toca <img src="https://img.icons8.com/material-outlined/24/000000/share.png" style="vertical-align: middle; width: 18px;"> y luego <strong>"Añadir a inicio"</strong></p>
    </div>
  `;
  document.body.appendChild(iosBanner);
}
