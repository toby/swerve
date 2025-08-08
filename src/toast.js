/**
 * Swerve Toast Notification System
 * A minimal, unobtrusive UI feedback system for the Swerve bookmarklet
 * Provides status updates without blocking user interaction
 */
class SwerveToast {
  constructor(options = {}) {
    this.options = {
      duration: 3000,
      position: 'top-right',
      theme: 'light',
      showProgress: true,
      animationDuration: 300,
      ...options
    };
    
    this.container = null;
    this.activeToasts = new Set();
    this.idCounter = 0;
    
    this.init();
  }
  
  init() {
    // Create and inject isolated CSS
    this.injectStyles();
    
    // Create container if it doesn't exist
    this.createContainer();
  }
  
  injectStyles() {
    // Check if styles already injected
    if (document.querySelector('#swerve-toast-styles')) {
      return;
    }
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'swerve-toast-styles';
    styleSheet.textContent = `
      /* Swerve Toast Styles - Isolated with prefix */
      .swerve-toast-container {
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .swerve-toast-container.top-right {
        top: 20px;
        right: 20px;
      }
      
      .swerve-toast-container.top-left {
        top: 20px;
        left: 20px;
      }
      
      .swerve-toast-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .swerve-toast-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .swerve-toast {
        pointer-events: auto;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        padding: 12px 16px;
        margin-bottom: 8px;
        max-width: 320px;
        min-width: 200px;
        backdrop-filter: blur(8px);
        transform: translateX(100%);
        transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
        opacity: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .swerve-toast.show {
        transform: translateX(0);
        opacity: 1;
      }
      
      .swerve-toast.hide {
        transform: translateX(100%);
        opacity: 0;
      }
      
      .swerve-toast.dark {
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      
      .swerve-toast-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .swerve-toast-content {
        flex: 1;
        color: #333333;
      }
      
      .swerve-toast.dark .swerve-toast-content {
        color: #ffffff;
      }
      
      .swerve-toast-title {
        font-weight: 600;
        margin-bottom: 2px;
      }
      
      .swerve-toast-message {
        font-weight: 400;
        opacity: 0.8;
      }
      
      .swerve-toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: #007AFF;
        border-radius: 0 0 8px 8px;
        transition: width 200ms ease;
      }
      
      .swerve-toast.success .swerve-toast-progress {
        background: #34C759;
      }
      
      .swerve-toast.error .swerve-toast-progress {
        background: #FF3B30;
      }
      
      .swerve-toast.warning .swerve-toast-progress {
        background: #FF9500;
      }
      
      .swerve-toast-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(0, 122, 255, 0.3);
        border-top: 2px solid #007AFF;
        border-radius: 50%;
        animation: swerve-spin 1s linear infinite;
      }
      
      @keyframes swerve-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .swerve-toast-close {
        flex-shrink: 0;
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        opacity: 0.6;
        padding: 0;
        margin-left: 8px;
        color: inherit;
        transition: opacity 150ms ease;
      }
      
      .swerve-toast-close:hover {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(styleSheet);
  }
  
  createContainer() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.className = `swerve-toast-container ${this.options.position}`;
    document.body.appendChild(this.container);
  }
  
  show(type, title, message = '', options = {}) {
    const toastOptions = { ...this.options, ...options };
    const toastId = ++this.idCounter;
    
    const toast = document.createElement('div');
    toast.className = `swerve-toast ${type} ${toastOptions.theme}`;
    toast.dataset.toastId = toastId;
    
    // Icon based on type
    const icons = {
      info: '💫',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      loading: '<div class="swerve-toast-spinner"></div>'
    };
    
    toast.innerHTML = `
      <div class="swerve-toast-icon">${icons[type] || icons.info}</div>
      <div class="swerve-toast-content">
        <div class="swerve-toast-title">${title}</div>
        ${message ? `<div class="swerve-toast-message">${message}</div>` : ''}
      </div>
      ${toastOptions.closable !== false ? '<button class="swerve-toast-close" type="button">×</button>' : ''}
      ${toastOptions.showProgress ? '<div class="swerve-toast-progress" style="width: 100%"></div>' : ''}
    `;
    
    this.container.appendChild(toast);
    this.activeToasts.add(toastId);
    
    // Show animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    
    // Handle close button
    const closeButton = toast.querySelector('.swerve-toast-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hide(toastId);
      });
    }
    
    // Auto-hide for non-loading toasts
    if (type !== 'loading' && toastOptions.duration > 0) {
      // Animate progress bar
      if (toastOptions.showProgress) {
        const progressBar = toast.querySelector('.swerve-toast-progress');
        if (progressBar) {
          progressBar.style.transition = `width ${toastOptions.duration}ms linear`;
          setTimeout(() => {
            progressBar.style.width = '0%';
          }, 100);
        }
      }
      
      setTimeout(() => {
        this.hide(toastId);
      }, toastOptions.duration);
    }
    
    return toastId;
  }
  
  hide(toastId) {
    const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
    if (!toast) return;
    
    toast.classList.add('hide');
    this.activeToasts.delete(toastId);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, this.options.animationDuration);
  }
  
  update(toastId, type, title, message = '', options = {}) {
    const toast = document.querySelector(`[data-toast-id="${toastId}"]`);
    if (!toast) return;
    
    // Update type class
    toast.className = `swerve-toast ${type} ${this.options.theme} show`;
    
    // Update content
    const iconElement = toast.querySelector('.swerve-toast-icon');
    const titleElement = toast.querySelector('.swerve-toast-title');
    const messageElement = toast.querySelector('.swerve-toast-message');
    
    const icons = {
      info: '💫',
      success: '✅', 
      error: '❌',
      warning: '⚠️',
      loading: '<div class="swerve-toast-spinner"></div>'
    };
    
    if (iconElement) {
      iconElement.innerHTML = icons[type] || icons.info;
    }
    
    if (titleElement) {
      titleElement.textContent = title;
    }
    
    if (messageElement && message) {
      messageElement.textContent = message;
      messageElement.style.display = '';
    } else if (messageElement) {
      messageElement.style.display = 'none';
    }
    
    // Handle progress for success/error states
    if (type !== 'loading' && options.duration !== false) {
      const duration = options.duration || this.options.duration;
      
      if (duration > 0) {
        setTimeout(() => {
          this.hide(toastId);
        }, duration);
      }
    }
  }
  
  clear() {
    const toastIds = Array.from(this.activeToasts);
    toastIds.forEach(id => this.hide(id));
  }
  
  destroy() {
    this.clear();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    const styles = document.querySelector('#swerve-toast-styles');
    if (styles && styles.parentNode) {
      styles.parentNode.removeChild(styles);
    }
    
    this.container = null;
    this.activeToasts.clear();
  }
}

// Global toast instance for the bookmarklet
let swerveToast = null;

function getSwerveToast() {
  if (!swerveToast) {
    swerveToast = new SwerveToast({
      position: 'top-right',
      theme: 'light',
      duration: 3000
    });
  }
  return swerveToast;
}

// Export for module environments or attach to window for bookmarklet
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SwerveToast, getSwerveToast };
} else if (typeof window !== 'undefined') {
  window.SwerveToast = SwerveToast;
  window.getSwerveToast = getSwerveToast;
}