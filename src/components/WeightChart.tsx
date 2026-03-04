import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format } from 'date-fns'
import type { WeightLog } from '@/lib/types'

interface WeightChartProps {
  logs: WeightLog[]
  targetWeight?: number | null
}

export default function WeightChart({ logs, targetWeight }: WeightChartProps) {
  const data = logs
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map((log) => ({
      date: format(new Date(log.logged_at), 'MMM d'),
      weight: Number(log.weight),
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        No weight data yet. Log your weight to see progress!
      </div>
    )
  }

  const weights = data.map((d) => d.weight)
  const min = Math.min(...weights, targetWeight ?? Infinity) - 2
  const max = Math.max(...weights, targetWeight ?? -Infinity) + 2

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis domain={[min, max]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: 13,
          }}
        />
        {targetWeight && (
          <ReferenceLine
            y={targetWeight}
            stroke="#f59e0b"
            strokeDasharray="6 4"
            label={{ value: 'Goal', position: 'right', fontSize: 11, fill: '#f59e0b' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
