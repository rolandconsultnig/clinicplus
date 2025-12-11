import React from 'react';
import { ComposedChart as RechartsComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ComposedChart({ 
  data, 
  barDataKey, 
  lineDataKey, 
  areaDataKey,
  barName = 'Bar',
  lineName = 'Line',
  areaName = 'Area',
  barColor = '#3b82f6',
  lineColor = '#10b981',
  areaColor = '#f59e0b',
  height = 300 
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          {areaDataKey && (
            <linearGradient id={`color${areaDataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={areaColor} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={areaColor} stopOpacity={0.1}/>
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" stroke="#6b7280" />
        <YAxis yAxisId="left" stroke="#6b7280" />
        {lineDataKey && <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />}
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }} 
        />
        <Legend />
        {barDataKey && (
          <Bar yAxisId="left" dataKey={barDataKey} name={barName} fill={barColor} radius={[8, 8, 0, 0]} />
        )}
        {areaDataKey && (
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey={areaDataKey} 
            name={areaName}
            stroke={areaColor} 
            fill={`url(#color${areaDataKey})`}
            strokeWidth={2}
          />
        )}
        {lineDataKey && (
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey={lineDataKey} 
            name={lineName}
            stroke={lineColor} 
            strokeWidth={2}
            dot={{ fill: lineColor, r: 4 }}
          />
        )}
      </RechartsComposedChart>
    </ResponsiveContainer>
  );
}

export default ComposedChart;

