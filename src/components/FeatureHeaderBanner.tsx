import React from 'react';

export interface FeatureStatItem {
  label: string;
  value: string | number;
  sublabel?: string;
  highlight?: boolean;
  statusDot?: boolean;
  statusDotColor?: string;
}

export interface FeatureHeaderBannerProps {
  tagText: string;
  tagIcon?: React.ReactNode;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
  secondaryActionButton?: React.ReactNode;
  stats?: FeatureStatItem[];
}

export const FeatureHeaderBanner: React.FC<FeatureHeaderBannerProps> = ({
  tagText,
  tagIcon,
  title,
  description,
  actionButton,
  secondaryActionButton,
  stats
}) => {
  return (
    <div className="bg-gradient-to-r from-sky-900/90 via-blue-900/90 to-indigo-950/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-sky-500/20 mb-6">
      {/* Decorative ambient glow */}
      <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -bottom-12 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-3xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 text-sky-300 text-xs font-bold border border-sky-400/30">
            {tagIcon && <span className="text-amber-400">{tagIcon}</span>}
            <span>{tagText}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white font-display">
            {title}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
            {description}
          </p>
        </div>

        {(actionButton || secondaryActionButton) && (
          <div className="flex items-center flex-wrap gap-3 shrink-0">
            {secondaryActionButton}
            {actionButton}
          </div>
        )}
      </div>

      {/* Quick Stats Counter Grid */}
      {stats && stats.length > 0 && (
        <div className={`grid grid-cols-2 ${stats.length >= 4 ? 'sm:grid-cols-4' : stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3.5 pt-6 mt-6 border-t border-slate-700/60`}>
          {stats.map((st, idx) => (
            <div key={idx} className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/60 text-left">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{st.label}</p>
              <div className="flex items-center gap-2 mt-1">
                {st.statusDot && (
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.statusDotColor || 'bg-emerald-400'}`} />
                )}
                <p className={`text-xl sm:text-2xl font-black font-display ${st.highlight ? 'text-amber-400' : 'text-white'}`}>
                  {st.value}
                  {st.sublabel && (
                    <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">{st.sublabel}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

