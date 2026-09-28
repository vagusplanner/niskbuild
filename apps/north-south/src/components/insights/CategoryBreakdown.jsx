import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CategoryBreakdown({ data }) {
  if (!data || data.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const item = payload[0].payload;
      return (
        <div className="bg-foreground text-background rounded-lg p-2 shadow-lg border border-border">
          <p className="font-inter text-xs font-medium">{item.name}</p>
          <p className="font-inter text-sm font-semibold">Avg Score: {item.average}</p>
          <p className="font-inter text-xs text-background/70">{item.count} sessions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h2 className="font-cormorant text-xl font-medium text-foreground mb-4">Category Performance</h2>
      <div className="h-64 -ml-6 -mr-6 -mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="average" fill="#c17c5a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}