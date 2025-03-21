// Toast notification system

// Create container for toast messages if it doesn't exist
function createToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

// Show a toast notification
export function showToast(message, options = {}) {
    const {
        duration = 3000,      // Default duration in ms (0 for persistent)
        type = 'info',        // info, success, error, warning
        persistent = false    // If true, toast will not auto-dismiss
    } = options;
    
    const container = createToastContainer();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Create toast content
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.textContent = message;
    toast.appendChild(content);
    
    // Create close button
    if (persistent || duration === 0) {
        const closeBtn = document.createElement('span');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            removeToast(toast);
        });
        toast.appendChild(closeBtn);
    }
    
    // Add toast to container
    container.appendChild(toast);
    
    // Make toast visible
    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);
    
    // Set timeout to remove toast after duration (if not persistent)
    if (!persistent && duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    return toast;
}

// Remove a toast from the container
function removeToast(toast) {
    toast.classList.remove('visible');
    
    // Remove toast after animation completes
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300); // Match the CSS transition duration
}

// Show a persistent toast (stays until user closes it)
export function showPersistentToast(message, type = 'info') {
    return showToast(message, { persistent: true, type });
}

// Show an example toast that stays on screen
export function showExampleToast() {
    return showPersistentToast('This is an example toast notification', 'info');
}
// Initialize an example toast when the page loads
// document.addEventListener('DOMContentLoaded', () => {
//     showExampleToast();
// });

