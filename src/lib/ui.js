let listeners = [];

export function showToast({ type = "info", message }) {
  const t = { id: crypto.randomUUID(), type, message };
  listeners.forEach(set => set(prev => [...prev, t]));
  setTimeout(() => {
    listeners.forEach(set => set(prev => prev.filter(x => x.id !== t.id)));
  }, 3500);
}

export function subscribeToToasts(set) {
  listeners.push(set);
  return () => { listeners = listeners.filter(l => l !== set); };
}
