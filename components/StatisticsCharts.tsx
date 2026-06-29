'use client';

import { useMemo } from 'react';
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
  AreaChart,
  Area,
} from 'recharts';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChartGradients, ChartTooltip, ChartLegendRow, CHART_PALETTE, AXIS_TICK, GRID_STROKE } from '@/components/charts/chartTheme';

interface ClienteStatistiche {
  cliente: {
    id: string;
    nome: string;
    cognome: string;
  };
  rapportini: Array<{
    id: string;
    dataIntervento: string;
    tipoStufa: string;
    tipoIntervento: string;
  }>;
  statistiche: {
    totale: number;
    pellet: number;
    legno: number;
    tipiIntervento: Record<string, number>;
  };
}

interface MonthlyTrendPoint {
  month: string;
  pellet: number;
  legno: number;
}

interface StatisticsChartsProps {
  data: ClienteStatistiche[];
  trendMensile?: MonthlyTrendPoint[];
}

const CHART_COLORS = {
  pellet: CHART_PALETTE.pellet,
  legno: CHART_PALETTE.legno,
};

const BAR_COLORS = CHART_PALETTE.series;

const cardClass = 'saas-card p-6';
const titleClass = 'mb-4 font-heading text-base font-bold text-foreground';
const pelletLegnoLegend = [
  { label: 'Pellet', color: CHART_COLORS.pellet },
  { label: 'Legno', color: CHART_COLORS.legno },
];

export default function StatisticsCharts({ data, trendMensile = [] }: StatisticsChartsProps) {
  // Dati per grafico a torta tipo stufa
  const pieData = useMemo(() => {
    const totalPellet = data.reduce((sum, s) => sum + s.statistiche.pellet, 0);
    const totalLegno = data.reduce((sum, s) => sum + s.statistiche.legno, 0);
    return [
      { name: 'Pellet', value: totalPellet, color: CHART_COLORS.pellet },
      { name: 'Legno', value: totalLegno, color: CHART_COLORS.legno },
    ];
  }, [data]);

  // Dati per grafico tipi intervento
  const interventoData = useMemo(() => {
    const tipiCount: Record<string, number> = {};
    data.forEach((stat) => {
      Object.entries(stat.statistiche.tipiIntervento).forEach(([tipo, count]) => {
        tipiCount[tipo] = (tipiCount[tipo] || 0) + count;
      });
    });
    return Object.entries(tipiCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  // Dati per grafico trend mensile (ultimi 12 mesi)
  const trendData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now,
    });

    const trendByMonth = new Map(
      trendMensile.map((row) => [row.month, { pellet: row.pellet, legno: row.legno }])
    );

    return months.map((month) => {
      const monthKey = format(month, 'yyyy-MM');
      const fromApi = trendByMonth.get(monthKey);
      const pellet = fromApi?.pellet ?? 0;
      const legno = fromApi?.legno ?? 0;

      return {
        name: format(month, 'MMM yy', { locale: it }),
        pellet,
        legno,
        totale: pellet + legno,
      };
    });
  }, [trendMensile]);

  // Top 5 clienti per numero di rapportini
  const topClienti = useMemo(() => {
    return [...data]
      .sort((a, b) => b.statistiche.totale - a.statistiche.totale)
      .slice(0, 5)
      .map((stat) => ({
        name: `${stat.cliente.nome} ${stat.cliente.cognome}`.substring(0, 15),
        pellet: stat.statistiche.pellet,
        legno: stat.statistiche.legno,
      }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="saas-card py-10 text-center text-sm text-muted-foreground">
        Nessun dato disponibile per i grafici
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prima riga: Pie chart e Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribuzione Tipo Stufa */}
        <div className={cardClass}>
          <h3 className={titleClass}>Distribuzione tipo stufa</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <ChartGradients />
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={100}
                paddingAngle={3}
                cornerRadius={8}
                stroke="none"
                dataKey="value"
              >
                <Cell fill="url(#grad-pellet)" />
                <Cell fill="url(#grad-legno)" />
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <ChartLegendRow items={pelletLegnoLegend} />
        </div>

        {/* Trend Mensile */}
        <div className={cardClass}>
          <h3 className={titleClass}>Trend interventi (ultimi 12 mesi)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <ChartGradients />
              <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="pellet"
                stackId="1"
                stroke={CHART_COLORS.pellet}
                strokeWidth={2}
                fill="url(#grad-area-pellet)"
                name="Pellet"
              />
              <Area
                type="monotone"
                dataKey="legno"
                stackId="1"
                stroke={CHART_COLORS.legno}
                strokeWidth={2}
                fill="url(#grad-area-legno)"
                name="Legno"
              />
            </AreaChart>
          </ResponsiveContainer>
          <ChartLegendRow items={pelletLegnoLegend} />
        </div>
      </div>

      {/* Seconda riga: Tipi Intervento e Top Clienti */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tipi di Intervento */}
        <div className={cardClass}>
          <h3 className={titleClass}>Tipi di intervento</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={interventoData} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={110} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Interventi" barSize={18}>
                {interventoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clienti */}
        <div className={cardClass}>
          <h3 className={titleClass}>Top 5 clienti</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topClienti} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
              <Bar dataKey="pellet" stackId="a" fill="url(#grad-pellet)" name="Pellet" barSize={28} radius={[0, 0, 0, 0]} />
              <Bar dataKey="legno" stackId="a" fill="url(#grad-legno)" name="Legno" barSize={28} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegendRow items={pelletLegnoLegend} />
        </div>
      </div>
    </div>
  );
}
