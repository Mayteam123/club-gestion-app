import type { ReactNode } from 'react';

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-fuchsia-50 text-fuchsia-400 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-5 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
