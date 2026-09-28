import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const GOLD = "#B8952A";
const FOREST = "#2C3B2D";
const SAGE = "#8A9A7A";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs font-inter space-y-1">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function CorrelationChart({ data }) {
  if (!data || data.length < 2) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="mb-1">
        <h2 className="font-cormorant text-xl font-medium text-foreground">Activity vs Goal Progress</h2>
        <p className="font-inter text-xs text-muted-foreground">Sessions completed and commitments kept, correlated with goal score movement</p>
      </div>
      <div className="h-72 -ml-2 -mr-2 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" domain={[0, 10]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 10]} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: 11, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>}
            />
            <Bar yAxisId="right" dataKey="sessions" name="Sessions" fill={FOREST} opacity={0.55} radius={[4, 4, 0, 0]} barSize={14} />
            <Bar yAxisId="right" dataKey="commitments" name="Commitments Done" fill={SAGE} opacity={0.55} radius={[4, 4, 0, 0]} barSize={14} />
            <Line yAxisId="left" type="monotone" dataKey="goal_score" name="Avg Goal Score" stroke={GOLD} strokeWidth={2.5} dot={{ fill: GOLD, r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}