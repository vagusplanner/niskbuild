import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function RadarChart({ data }) {
  if (!data || data.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-foreground text-background rounded-lg p-2 shadow-lg border border-border">
          <p className="font-inter text-xs font-medium">{payload[0].payload.category}</p>
          <p className="font-inter text-sm font-semibold">Score: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h2 className="font-cormorant text-xl font-medium text-foreground mb-1">Communication Profile</h2>
      <p className="font-inter text-xs text-muted-foreground mb-4">Average score by skill area</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadar data={data} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fontFamily: "Inter, sans-serif", fill: "hsl(var(--muted-foreground))" }} />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Radar name="Score" dataKey="score" stroke="#B8952A" fill="#B8952A" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: "#B8952A" }} />
          </RechartsRadar>
        </ResponsiveContainer>
      </div>
    </div>
  );
}