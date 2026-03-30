import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AttendanceData {
  date: string;
  present: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
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
          {payload[0].value} Students Present
        </p>
      </div>
    );
  }
  return null;
};

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[220px] sm:h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={1}/>
              <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0.8}/>
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
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} 
            dy={10}
          />
          <YAxis 
            allowDecimals={false} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          />
          <Tooltip 
            cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }}
            content={<CustomTooltip />}
          />
          <Bar 
            dataKey="present" 
            fill="url(#barGradient)" 
            radius={[6, 6, 0, 0]} 
            name="Present Students" 
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;
