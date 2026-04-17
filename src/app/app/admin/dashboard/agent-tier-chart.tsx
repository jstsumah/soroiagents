
"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Tooltip } from "recharts"
import type { Tier } from "@/lib/types"

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  Brass: { label: "Brass", color: "var(--tier-brass)" },
  Bronze: { label: "Bronze", color: "var(--tier-bronze)" },
  Silver: { label: "Silver", color: "var(--tier-silver)" },
  Gold: { label: "Gold", color: "var(--tier-gold)" },
  Preferred: { label: "Preferred", color: "var(--tier-preferred)" },
  'Super Preferred': { label: "Super Preferred", color: "var(--tier-super-preferred)" },
}

interface AgentTierChartProps {
  data: Record<Tier, number>
}

export function AgentTierChart({ data }: AgentTierChartProps) {
    const chartData = React.useMemo(() => {
        return Object.entries(data).map(([tier, count]) => ({
            name: tier,
            value: count,
            fill: chartConfig[tier as Tier]?.color,
        }));
    }, [data]);

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
      <PieChart>
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel nameKey="name" />}
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          strokeWidth={5}
        >
             {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
