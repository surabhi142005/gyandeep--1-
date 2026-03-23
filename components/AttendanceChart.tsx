import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AttendanceData {
  date: string;
  present: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data }) => {
  return (
    <div className="w-full h-[220px] sm:h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#6B7280' }} 
            dy={10}
          />
          <YAxis 
            allowDecimals={false} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#6B7280' }} 
          />
          <Tooltip 
            cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }}
            contentStyle={{ 
              backgroundColor: 'var(--color-surface)', 
              border: 'none',
              borderLeft: '4px solid var(--color-primary)',
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }} 
          />
          <Bar 
            dataKey="present" 
            fill="var(--color-primary)" 
            radius={[4, 4, 0, 0]} 
            name="Present Students" 
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;
