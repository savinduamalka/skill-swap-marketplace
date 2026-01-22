'use client';

/**
 * Dashboard Charts Components (Lazy Loaded)
 * 
 * These chart components are designed to be dynamically imported
 * to reduce the initial bundle size of the dashboard.
 * 
 * @fileoverview Lazy-loaded chart components using recharts
 */
import { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

// Chart colors
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

interface SessionActivityChartProps {
  data: { month: string; asLearner: number; asProvider: number }[];
}

export const SessionActivityChart = memo(function SessionActivityChart({ data }: SessionActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar dataKey="asLearner" name="As Learner" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="asProvider" name="As Provider" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

interface CreditFlowChartProps {
  data: { week: string; earned: number; spent: number }[];
}

export const CreditFlowChart = memo(function CreditFlowChart({ data }: CreditFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Area type="monotone" dataKey="earned" name="Earned" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
        <Area type="monotone" dataKey="spent" name="Spent" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

interface SkillsDistributionChartProps {
  data: { level: string; count: number }[];
}

export const SkillsDistributionChart = memo(function SkillsDistributionChart({ data }: SkillsDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="level"
          label={({ level, count }) => (count > 0 ? level : '')}
          labelLine={false}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
});

// Export PIE_COLORS for legend
export { PIE_COLORS };
