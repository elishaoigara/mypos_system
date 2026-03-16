import * as React from "react";

export function Toast({ children, ...props }: any) {
  return (
    <div
      {...props}
      className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
    >
      {children}
    </div>
  );
}

export function ToastTitle({ children }: any) {
  return <div className="font-semibold text-sm">{children}</div>;
}

export function ToastDescription({ children }: any) {
  return <div className="text-sm text-gray-500">{children}</div>;
}

export function ToastClose() {
  return (
    <button className="ml-auto text-gray-400 hover:text-black">
      ✕
    </button>
  );
}

export function ToastProvider({ children }: any) {
  return <div>{children}</div>;
}

export function ToastViewport() {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50" />
  );
}