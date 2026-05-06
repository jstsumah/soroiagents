
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts"
import type { Category } from "@/lib/types"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CATEGORIES } from "@/lib/constants"

const chartConfig = {
  rates: { label: "Rates", color: "hsl(var(--chart-1))" },
  itineraries: { label: "Itineraries", color: "hsl(var(--chart-2))" },
  brochures: { label: "Brochures", color: "hsl(var(--chart-3))" },
  images: { label: "Images", color: "hsl(var(--chart-4))" },
  deals: { label: "Deals", color: "hsl(var(--chart-5))" },
  'park-fees': { label: "Park Fees", color: "hsl(var(--chart-1))" },
  'how-to-get-there': { label: "How To Get There", color: "hsl(var(--chart-2))" },
  training: { label: "Training", color: "hsl(var(--chart-3))" },
  factsheet: { label: "Fact Sheet", color: "hsl(var(--chart-4))" },
  videos: { label: "Videos", color: "hsl(var(--chart-5))" },
  'activity-sheets': { label: "Activity Sheets", color: "hsl(var(--chart-1))" },
}

const humanFriendlyLabels: Record<string, string> = {
    rates: "Rates",
    itineraries: "Itineraries",
    brochures: "Brochures",
    images: "Images",
    deals: "Deals",
    'park-fees': "Park Fees",
    'how-to-get-there': "How To Get There",
    training: "Training",
    factsheet: "Fact Sheet",
    videos: "Videos",
    'activity-sheets': "Activity Sheets",
}

interface ResourceCategoryChartProps {
    data: Record<Category, number>
}

export function ResourceCategoryChart({ data }: ResourceCategoryChartProps) {
    const chartData = React.useMemo(() => {
        return CATEGORIES.map((category) => ({
            name: humanFriendlyLabels[category] || category,
            count: data[category] || 0,
            fill: chartConfig[category as keyof typeof chartConfig]?.color,
        }));
    }, [data]);

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar dataKey="count" radius={4}>
            {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
