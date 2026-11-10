import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'purple' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  accentColor = 'neutral',
}) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    neutral: 'bg-neutral-100 text-neutral-800 border-neutral-200',
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl border ${colorMap[accentColor]}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl font-extrabold text-neutral-900 tracking-tight">{value}</div>
        {trend && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              trendUp
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-neutral-400 mt-1.5 font-medium">{subtitle}</p>}
    </div>
  );
};

