import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { PerformanceData } from '../types';

interface PerformanceChartProps {
  data: PerformanceData[];
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div 
        className="rounded-xl p-3 shadow-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderLeft: '4px solid var(--color-primary)',
          color: 'var(--color-text)'
        }}
      >
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
        <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
          Score: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, title }) => {
  return (
    <div className="w-full h-80">
      {title && (
        <h3 
          className="text-sm font-bold uppercase tracking-wider mb-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {title}
        </h3>
      )}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="colorScoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="var(--color-border)" 
            />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} 
              dy={10}
            />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="var(--color-primary)" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorScoreGradient)" 
              activeDot={{ 
                r: 6, 
                fill: 'var(--color-secondary)',
                stroke: 'var(--color-surface)',
                strokeWidth: 2
              }} 
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div 
          className="flex flex-col items-center justify-center h-full rounded-xl border border-dashed"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <LineChart className="opacity-20 w-10 h-10" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>No performance data available yet</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceChart;
