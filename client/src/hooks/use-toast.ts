import { useState } from "react";

type ToastType = {
  id: string;
  title?: string;
  description?: string;
  action?: any;
};

let globalToasts: ToastType[] = [];
let listeners: any[] = [];

function notify() {
  listeners.forEach((listener) => listener([...globalToasts]));
}

export function toast(toast: ToastType) {
  globalToasts.push({
  ...toast,
  id: Math.random().toString(),
});
  notify();
}

export function useToast() {
  const [toasts, setToasts] = useState(globalToasts);

  if (!listeners.includes(setToasts)) {
    listeners.push(setToasts);
  }

  return {
    toasts,
    toast,
  };
}