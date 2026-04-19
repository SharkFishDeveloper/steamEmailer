"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// ApexCharts uses window — must be dynamically imported (no SSR)
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface HistoryEntry {
  time: number;
  price: number;
  discount: number;
}

interface PriceChartProps {
  history: HistoryEntry[];
  targetPrice: number;
  currentPrice: number;
}

export default function PriceChart({
  history,
  targetPrice,
  currentPrice,
}: PriceChartProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (!ready || !history || history.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[#8ba3b8] text-sm">
        No price history recorded yet.
      </div>
    );
  }

  const validHistory = history.filter((h) => h.time != null && h.price != null);
  const prices = validHistory.map((h) => h.price);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const padding = (highest - lowest) * 0.2 || 50;

  const series = [
    {
      name: "Price",
      data: validHistory.map((h) => ({ x: h.time, y: h.price })),
    },
  ];

  const annotations = {
    yaxis: [
      {
        y: targetPrice,
        borderColor: "#f4c542",
        strokeDashArray: 5,
        borderWidth: 1.5,
        label: {
          text: `Target ₹${targetPrice}`,
          style: {
            background: "#f4c542",
            color: "#000",
            fontSize: "11px",
            fontWeight: "bold",
            padding: { top: 3, bottom: 3, left: 6, right: 6 },
          },
          position: "right",
          offsetX: -6,
        },
      },
      ...(lowest < currentPrice
        ? [
            {
              y: lowest,
              borderColor: "#4ade80",
              strokeDashArray: 4,
              borderWidth: 1.5,
              label: {
                text: `All‑time Low ₹${lowest}`,
                style: {
                  background: "#4ade80",
                  color: "#000",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: { top: 3, bottom: 3, left: 6, right: 6 },
                },
                position: "right",
                offsetX: -6,
              },
            },
          ]
        : []),
    ],
  };

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 500 },
    },
    annotations,
    theme: { mode: "dark" },
    stroke: {
      curve: "stepline",
      width: 2.5,
      colors: ["#66c0f4"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.3,
        gradientToColors: ["#1b2838"],
        inverseColors: false,
        opacityFrom: 0.35,
        opacityTo: 0.0,
        stops: [0, 100],
      },
    },
    markers: {
      size: 4,
      colors: ["#66c0f4"],
      strokeColors: "#1b2838",
      strokeWidth: 2,
      hover: { size: 7 },
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: { colors: "#8ba3b8", fontSize: "11px" },
        datetimeFormatter: { month: "MMM yyyy", day: "dd MMM" },
      },
      axisBorder: { color: "#2a475e" },
      axisTicks: { color: "#2a475e" },
    },
    yaxis: {
      min: Math.max(0, lowest - padding),
      max: highest + padding,
      labels: {
        style: { colors: "#8ba3b8", fontSize: "11px" },
        formatter: (val: number) => `₹${val.toFixed(0)}`,
      },
    },
    grid: {
      borderColor: "#243447",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: "dark",
      x: { format: "dd MMM yyyy" },
      y: {
        formatter: (val: number) => `₹${val}`,
        title: { formatter: () => "Price: " },
      },
      style: { fontSize: "13px" },
    },
    dataLabels: { enabled: false },
  };

  return (
    <Chart
      key={history.length}
      options={options}
      series={series}
      type="area"
      height={260}
    />
  );
}