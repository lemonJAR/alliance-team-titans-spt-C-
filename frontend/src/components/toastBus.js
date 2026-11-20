// Tiny event bus behind notify() / confirmDialog(). Kept in a plain .js file so
// <ToastHost /> (Toast.jsx) only exports a component.
//   notify('Saved.')                       -> success toast ("OK: " prefix is stripped)
//   notify('Error: something broke')       -> error toast  (starts with Error / Failed)
//   if (await confirmDialog('Delete?'))    -> styled confirm modal
export const listeners = new Set();
let nextId = 1;

function emit(evt) {
  listeners.forEach((fn) => fn(evt));
}

export function notify(text, type) {
  let message = String(text ?? '');
  let kind = type;
  if (!kind) {
    if (/^OK:\s*/i.test(message)) { kind = 'success'; message = message.replace(/^OK:\s*/i, ''); }
    else if (/^(Error|Failed)/i.test(message)) kind = 'error';
    else kind = 'info';
  }
  emit({ kind: 'toast', id: nextId++, type: kind, message });
}

export function confirmDialog(message, { confirmLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    emit({ kind: 'confirm', id: nextId++, message, confirmLabel, danger, resolve });
  });
}