"use client";

// components/kpi-sparkline.tsx
//
// Mini-grafica de tendencia usada dentro de las tarjetas KPI del
// dashboard ("Citas Hoy", "Nuevos Pacientes", etc.).
//
// Es una Sparkline real renderizada con Recharts (no un SVG estatico
// forzado a estirarse con preserveAspectRatio="none"). Esto resuelve
// el bug visual donde las mini-graficas se veian distorsionadas y
// falsas en viewports anchos.
//
// Principios de diseno:
//   - Sin ruido: NO hay <XAxis>, <YAxis>, <CartesianGrid> ni
//     <Tooltip>. Solo la <Line> pura.
//   - Un solo punto visible: un dot de radio 3 solo en el ULTIMO
//     valor, marcando el dato actual (imita el diseno original
//     pero calculado matemáticamente).
//   - Responsive: <ResponsiveContainer> con width="100%" y
//     height={40} para que escale sin distorsion.
//   - Tema-aware via clases Tailwind en el wrapper exterior (la
//     linea usa el color hex que pasamos, intencionalmente plano
//     para que coincida con el accent teal/sky de la paleta del
//     proyecto).

import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";

export type KpiSparklineTone = "teal" | "sky";

type KpiSparklineProps = {
  /**
   * Array de 7 puntos (uno por dia) en formato { val: number }.
   * El wrapper externo de la sparkline se renderiza aunque el
   * array este vacio (devuelve null); el padre puede decidir
   * si mostrar la card o no.
   */
  data: Array<{ val: number }>;
  /**
   * Color de la linea y del dot. Default: "teal" (la paleta
   * principal del proyecto).
   */
  tone?: KpiSparklineTone;
  /**
   * Altura del chart en pixeles. Default: 40 (sparkline compacto
   * que cabe en una card KPI sin dominar la composicion).
   */
  height?: number;
};

const TONE_COLORS: Record<KpiSparklineTone, { line: string; dot: string }> = {
  teal: { line: "#0f766e", dot: "#14b8a6" },
  sky: { line: "#0284c7", dot: "#38bdf8" },
};

export function KpiSparkline({
  data,
  tone = "teal",
  height = 40,
}: KpiSparklineProps) {
  if (!data?.length) {
    return null;
  }

  const colors = TONE_COLORS[tone];
  const lastIndex = data.length - 1;

  return (
    <div className="mt-5 rounded-[22px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(240,249,255,0.78)_100%)] px-3 py-3 shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),8px_10px_20px_rgba(130,188,198,0.12)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.5)_0%,rgba(15,23,42,0.68)_100%)] dark:shadow-[inset_1px_1px_0_rgba(255,255,255,0.04),8px_10px_18px_rgba(0,0,0,0.18)]">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
        >
          {/*
           * YAxis oculto pero presente: necesitamos un dominio
           * explicito para que la linea no se pegue a los bordes
           * superior/inferior del chart. El +5%/-5% da un padding
           * visual que evita que el dot final toque el limite.
           */}
          <YAxis hide domain={["dataMin - 5%", "dataMax + 5%"]} />
          <Line
            type="monotone"
            dataKey="val"
            stroke={colors.line}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            isAnimationActive={false}
            dot={(props) => {
              const { cx, cy, index } = props as {
                cx?: number;
                cy?: number;
                index?: number;
              };
              if (
                typeof cx !== "number" ||
                typeof cy !== "number" ||
                index !== lastIndex
              ) {
                return <g />;
              }
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={colors.dot}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        <span>Tendencia</span>
        <span>7 dias</span>
      </div>
    </div>
  );
}
