import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AttendanceData {
  date: string;
  present: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  theme: string;
}

const THEME_HEX_COLORS: Record<string, string> = {
    indigo: '#6366f1',
    teal: '#2dd4bf',
    crimson: '#f87171',
    purple: '#c084fc',
};

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data, theme }) => {
  const barColor = useMemo(() => THEME_HEX_COLORS[theme] || THEME_HEX_COLORS.indigo, [theme]);

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #ddd',
              borderRadius: '0.5rem'
            }} 
          />
          <Legend />
          <Bar dataKey="present" fill={barColor} name="Present Students" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;