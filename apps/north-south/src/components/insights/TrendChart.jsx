import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function TrendChart({ data, areaChart = false }) {
  if (!data || data.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-foreground text-background rounded-lg p-2 shadow-lg border border-border">
          <p className="font-inter text-xs font-medium">{payload[0].payload.date}</p>
          <p className="font-inter text-sm font-semibold">Score: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h2 className="font-cormorant text-xl font-medium text-foreground mb-4">
        {areaChart ? "Weekly Trend" : "AI Session Scores"}
      </h2>
      <div className="h-64 -ml-6 -mr-6 -mb-6">
        <ResponsiveContainer width="100%" height="100%">
          {areaChart ? (
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c17c5a" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#c17c5a" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#c17c5a" fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="score" stroke="#c17c5a" dot={{ fill: "#c17c5a", r: 4 }} strokeWidth={2} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}