import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Rapportino } from '@/types';

interface ExportOptions {
  filename?: string;
  format: 'xlsx' | 'csv';
}

// Export rapportini in Excel/CSV
export function exportRapportini(rapportini: Rapportino[], options: ExportOptions) {
  const { filename = `rapportini_${format(new Date(), 'yyyy-MM-dd')}`, format: fileFormat } = options;

  // Prepara i dati per l'export
  const data = rapportini.map((r) => ({
    'ID': r.id,
    'Data Intervento': format(new Date(r.intervento.data), 'dd/MM/yyyy', { locale: it }),
    'Ora': r.intervento.ora,
    'Operatore': `${r.operatore.nome} ${r.operatore.cognome}`,
    'Cliente': `${r.cliente.nome} ${r.cliente.cognome}`,
    'Ragione Sociale': r.cliente.ragioneSociale || '',
    'Indirizzo': r.cliente.indirizzo,
    'Città': r.cliente.citta,
    'CAP': r.cliente.cap,
    'Telefono Cliente': r.cliente.telefono,
    'Email Cliente': r.cliente.email || '',
    'Tipo Stufa': r.intervento.tipoStufa,
    'Marca': r.intervento.marca,
    'Modello': r.intervento.modello,
    'Numero Serie': r.intervento.numeroSerie || '',
    'Tipo Intervento': r.intervento.tipoIntervento,
    'Descrizione': r.intervento.descrizione,
    'Materiali Utilizzati': r.intervento.materialiUtilizzati || '',
    'Note': r.intervento.note || '',
    'Data Creazione': r.dataCreazione ? format(new Date(r.dataCreazione), 'dd/MM/yyyy HH:mm', { locale: it }) : '',
  }));

  // Crea workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rapportini');

  // Imposta larghezza colonne
  const colWidths = [
    { wch: 36 }, // ID
    { wch: 12 }, // Data
    { wch: 8 },  // Ora
    { wch: 20 }, // Operatore
    { wch: 20 }, // Cliente
    { wch: 25 }, // Ragione Sociale
    { wch: 30 }, // Indirizzo
    { wch: 15 }, // Città
    { wch: 8 },  // CAP
    { wch: 15 }, // Telefono
    { wch: 25 }, // Email
    { wch: 10 }, // Tipo Stufa
    { wch: 15 }, // Marca
    { wch: 15 }, // Modello
    { wch: 15 }, // Numero Serie
    { wch: 20 }, // Tipo Intervento
    { wch: 50 }, // Descrizione
    { wch: 30 }, // Materiali
    { wch: 30 }, // Note
    { wch: 18 }, // Data Creazione
  ];
  ws['!cols'] = colWidths;

  // Export
  if (fileFormat === 'xlsx') {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
  } else {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filename}.csv`);
  }
}

// Export statistiche clienti
export function exportStatistiche(statistiche: any[], options: ExportOptions) {
  const { filename = `statistiche_${format(new Date(), 'yyyy-MM-dd')}`, format: fileFormat } = options;
  // Prepara i dati per l'export
  const data = statistiche.map((s) => ({
    'Cliente': `${s.cliente.nome} ${s.cliente.cognome}`,
    'Ragione Sociale': s.cliente.ragioneSociale || '',
    'Città': s.cliente.citta,
    'Telefono': s.cliente.telefono,
    'Email': s.cliente.email || '',
    'Totale Rapportini': s.statistiche.totale,
    'Stufe Pellet': s.statistiche.pellet,
    'Stufe Legno': s.statistiche.legno,
    'Primo Intervento': s.statistiche.primoIntervento 
      ? format(new Date(s.statistiche.primoIntervento), 'dd/MM/yyyy', { locale: it }) 
      : '',
    'Ultimo Intervento': s.statistiche.ultimoIntervento 
      ? format(new Date(s.statistiche.ultimoIntervento), 'dd/MM/yyyy', { locale: it }) 
      : '',
    'Tipi Intervento': Object.entries(s.statistiche.tipiIntervento)
      .map(([tipo, count]) => `${tipo}: ${count}`)
      .join(', '),
  }));

  // Crea workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Statistiche');

  // Imposta larghezza colonne
  const colWidths = [
    { wch: 25 }, // Cliente
    { wch: 25 }, // Ragione Sociale
    { wch: 15 }, // Città
    { wch: 15 }, // Telefono
    { wch: 25 }, // Email
    { wch: 15 }, // Totale
    { wch: 12 }, // Pellet
    { wch: 12 }, // Legno
    { wch: 15 }, // Primo Intervento
    { wch: 15 }, // Ultimo Intervento
    { wch: 50 }, // Tipi Intervento
  ];
  ws['!cols'] = colWidths;

  // Export
  if (fileFormat === 'xlsx') {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
  } else {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filename}.csv`);
  }
}

// Export anagrafica clienti admin
export function exportClientiAdmin(clienti: Array<{
  cliente: {
    nome: string;
    cognome: string;
    ragioneSociale: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string;
    telefono: string;
    email: string;
    partitaIva: string;
    codiceFiscale: string;
  };
  statistiche: {
    totale: number;
    pellet: number;
    legno: number;
    primoIntervento: string | null;
    ultimoIntervento: string | null;
    tipiIntervento: Record<string, number>;
  };
  operatori: Array<{ nome: string; cognome: string; count: number }>;
}>, options: ExportOptions) {
  const { filename = `clienti_${format(new Date(), 'yyyy-MM-dd')}`, format: fileFormat } = options;

  const data = clienti.map((entry) => ({
    'Cliente': `${entry.cliente.nome} ${entry.cliente.cognome}`,
    'Ragione Sociale': entry.cliente.ragioneSociale || '',
    'Indirizzo': entry.cliente.indirizzo,
    'Città': entry.cliente.citta,
    'CAP': entry.cliente.cap,
    'Provincia': entry.cliente.provincia || '',
    'Telefono': entry.cliente.telefono,
    'Email': entry.cliente.email || '',
    'P. IVA': entry.cliente.partitaIva || '',
    'Cod. Fiscale': entry.cliente.codiceFiscale || '',
    'Totale Rapportini': entry.statistiche.totale,
    'Stufe Pellet': entry.statistiche.pellet,
    'Stufe Legno': entry.statistiche.legno,
    'Primo Intervento': entry.statistiche.primoIntervento
      ? format(new Date(entry.statistiche.primoIntervento), 'dd/MM/yyyy', { locale: it })
      : '',
    'Ultimo Intervento': entry.statistiche.ultimoIntervento
      ? format(new Date(entry.statistiche.ultimoIntervento), 'dd/MM/yyyy', { locale: it })
      : '',
    'Operatori': entry.operatori.map((o) => `${o.nome} ${o.cognome} (${o.count})`).join(', '),
    'Tipi Intervento': Object.entries(entry.statistiche.tipiIntervento)
      .map(([tipo, count]) => `${tipo}: ${count}`)
      .join(', '),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clienti');

  ws['!cols'] = [
    { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 8 },
    { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 18 },
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
    { wch: 35 }, { wch: 50 },
  ];

  if (fileFormat === 'xlsx') {
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}.xlsx`);
  } else {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${filename}.csv`);
  }
}
