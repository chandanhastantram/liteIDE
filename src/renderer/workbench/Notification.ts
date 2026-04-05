export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export class Notification {
  static show(message: string, type: NotificationType = 'info', duration = 3000): void {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.innerHTML = `
      <span class="notification-icon">${this.getIcon(type)}</span>
      <span class="notification-text">${message}</span>
    `;
    document.body.appendChild(el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });

    setTimeout(() => {
      el.style.transform = 'translateX(120%)';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  private static getIcon(type: NotificationType): string {
    switch (type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error':   return '✕';
      default:        return 'ℹ';
    }
  }
}
