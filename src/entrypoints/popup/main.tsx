import '../../ui/tokens.css';
import '../../features/today/today.css';
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    void import('./mount').catch(() => {
      const message = document.createElement('p');
      message.className = 'error';
      message.textContent = 'Bell Work could not load. Please reopen the popup.';
      document.getElementById('root')!.replaceChildren(message);
    });
  }),
);
