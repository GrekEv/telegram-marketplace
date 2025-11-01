import { createRoot } from 'react-dom/client';
import Toast from '../components/Toast';

let toastContainer = null;

const createToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

export const showToast = (message, type = 'info', duration = 3000) => {
  const container = createToastContainer();
  const toastElement = document.createElement('div');
  toastElement.style.pointerEvents = 'auto';
  container.appendChild(toastElement);

  const root = createRoot(toastElement);
  
  const handleClose = () => {
    toastElement.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      root.unmount();
      container.removeChild(toastElement);
    }, 300);
  };

  root.render(
    <Toast message={message} type={type} duration={duration} onClose={handleClose} />
  );
};

// Добавляем анимацию исчезновения
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

