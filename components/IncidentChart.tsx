import React, { useMemo } from 'react';
import { StoredReport } from '../types';

interface IncidentChartProps {
  reports: StoredReport[];
}

interface CategoryStat {
  count: number;
  color: string;
  keywords: string[];
}

const IncidentChart: React.FC<IncidentChartProps> = ({ reports }) => {
  const stats = useMemo(() => {
    const categories: Record<string, CategoryStat> = {
      'Theft/Loss': { count: 0, color: 'bg-red-500', keywords: ['theft', 'stolen', 'missing', 'loss', 'robbery'] },
      'Access Control': { count: 0, color: 'bg-blue-500', keywords: ['access', 'badge', 'gate', 'door', 'intruder', 'denied', 'visitor'] },
      'Safety/Medical': { count: 0, color: 'bg-emerald-500', keywords: ['injury', 'medical', 'fire', 'hazard', 'safety', 'slip', 'fall', 'ambulance'] },
      'Policy Violation': { count: 0, color: 'bg-yellow-500', keywords: ['uniform', 'sleep', 'late', 'procedure', 'insubordination', 'phone'] },
      'Other': { count: 0, color: 'bg-slate-500', keywords: [] }
    };

    reports.forEach(r => {
      const text = r.content.toLowerCase();
      let matched = false;
      
      // Check specific categories
      for (const [key, config] of Object.entries(categories)) {
        if (key === 'Other') continue;
        if (config.keywords.some(k => text.includes(k))) {
          config.count++;
          matched = true;
          break; // Count primarily for the first match to avoid double counting
        }
      }
      
      if (!matched) categories['Other'].count++;
    });

    // Calculate max for scaling bars
    const maxCount = Math.max(...Object.values(categories).map(c => c.count), 1);

    return { categories, maxCount, total: reports.length };
  }, [reports]);

  if (stats.total === 0) return null;

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700 mb-6">
      <h4 className="text-sm font-bold text-slate-400 uppercase mb-6 tracking-wider">Incident Type Frequency (Last 30 Days)</h4>
      
      <div className="flex items-end justify-between gap-4 h-40 px-2">
        {Object.entries(stats.categories).map(([label, data]: [string, CategoryStat]) => {
          // Calculate height percentage (min 5% for visibility)
          const heightPct = Math.max((data.count / stats.maxCount) * 100, 5);
          
          return (
            <div key={label} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex justify-center items-end h-full">
                 {/* Tooltip */}
                 <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded shadow-lg border border-slate-600 whitespace-nowrap z-10">
                   {data.count} Incidents
                 </div>
                 
                 {/* Bar */}
                 <div 
                   className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 ${data.color} ${data.count === 0 ? 'opacity-20 h-[2px]' : 'opacity-80 hover:opacity-100'}`}
                   style={{ height: `${data.count === 0 ? 2 : heightPct}%` }}
                 ></div>
              </div>
              <span className="mt-3 text-[10px] sm:text-xs font-medium text-slate-400 text-center leading-tight">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IncidentChart;