// Mounted once by DashboardLayout. Renders toasts and the confirm modal.
import { useEffect, useState } from 'react';
import { listeners } from './toastBus';

export function ToastHost() {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const onEvent = (evt) => {
      if (evt.kind === 'confirm') {
        setDialog(evt);
        return;
      }
      setToasts((prev) => [...prev, evt]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== evt.id)), 5000);
    };
    listeners.add(onEvent);
    return () => listeners.delete(onEvent);
  }, []);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <>
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-notice ${t.type} toast`} role="status">
            <span>{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
      {dialog && (
        <div className="modal-backdrop" onMouseDown={() => close(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <p style={{ margin: '0 0 18px', color: 'var(--app-text)', lineHeight: 1.5 }}>{dialog.message}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="ui-btn" onClick={() => close(false)}>Cancel</button>
              <button type="button" className={`ui-btn ${dialog.danger ? 'danger' : 'primary'}`} autoFocus onClick={() => close(true)}>
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}