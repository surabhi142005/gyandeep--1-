import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PerformanceData } from '../types';

interface PerformanceChartProps {
  data: PerformanceData[];
  title: string;
  theme: string;
}

const THEME_HEX_COLORS: Record<string, string> = {
    indigo: '#4f46e5',
    teal: '#0d9488',
    crimson: '#dc2626',
    purple: '#9333ea',
};

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, title, theme }) => {
  const lineColor = useMemo(() => THEME_HEX_COLORS[theme] || THEME_HEX_COLORS.indigo, [theme]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full h-80">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke={lineColor} strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          No performance data available.
        </div>
      )}
    </div>
  );
};

export default PerformanceChart;