'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

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

// Palette con colori ad alto contrasto
const CHART_COLORS = {
  pellet: '#ea580c', // ember
  legno: '#92400e', // wood
  primary: '#c2410c',
  secondary: '#b45309',
  accent: '#f97316',
  teal: '#78716c',
  pink: '#dc2626',
  indigo: '#7c2d12',
};

// Colori per barre multiple (alto contrasto)
const BAR_COLORS = ['#ea580c', '#c2410c', '#92400e', '#f97316', '#fb923c', '#9a3412', '#78716c', '#431407'];

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
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nessun dato disponibile per i grafici
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Prima riga: Pie chart e Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuzione Tipo Stufa */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribuzione Tipo Stufa
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Mensile */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trend Interventi (ultimi 12 mesi)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="pellet"
                stackId="1"
                stroke={CHART_COLORS.pellet}
                fill={CHART_COLORS.pellet}
                fillOpacity={0.7}
                name="Pellet"
              />
              <Area
                type="monotone"
                dataKey="legno"
                stackId="1"
                stroke={CHART_COLORS.legno}
                fill={CHART_COLORS.legno}
                fillOpacity={0.7}
                name="Legno"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seconda riga: Tipi Intervento e Top Clienti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipi di Intervento */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tipi di Intervento
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={interventoData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Interventi">
                {interventoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clienti */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top 5 Clienti
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topClienti}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pellet" stackId="a" fill={CHART_COLORS.pellet} name="Pellet" radius={[0, 0, 0, 0]} />
              <Bar dataKey="legno" stackId="a" fill={CHART_COLORS.legno} name="Legno" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
