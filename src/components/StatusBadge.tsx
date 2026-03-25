import type { ProjectStatus } from '../types';
import { STATUS_CONFIG } from '../types';

interface Props {
  status: ProjectStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = STATUS_CONFIG[status];
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${padding} ${cfg.bg} ${cfg.color}`}
      dir="rtl"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
