import { Rapportino, AziendaSettings } from '@/types';
import { format } from 'date-fns';


export const generatePDF = async (rapportino: Rapportino, settings: AziendaSettings) => {
  // Import dinamico di jsPDF
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Colori
  const primaryColor = [14, 165, 233]; // primary-600
  const darkGray = [30, 30, 30];
  const mediumGray = [100, 100, 100];
  const lightGray = [200, 200, 200];
  const bgLight = [249, 250, 251];

  // Funzione per disegnare un box colorato
  const drawBox = (x: number, y: number, width: number, height: number, color: number[]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, width, height, 'F');
  };

  // Funzione per disegnare una linea
  const drawLine = (y: number, color: number[] = lightGray, thickness: number = 0.5) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(thickness);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.5);
  };

  // Header con sfondo colorato
  drawBox(0, 0, pageWidth, 35, primaryColor);
  
  // Logo se presente
  let logoWidthMm = 0;
  let logoHeightMm = 0;
  const logoX = margin;
  const logoY = 5;
  let textX = margin;
  
  // Usa il logo dalle settings o il logo di default
  const logoToUse = settings.logo || '/logo.png';
  
  if (logoToUse) {
    try {
      // Carica l'immagine per ottenere le dimensioni
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Necessario per caricare immagini da URL esterni
      img.src = logoToUse;
      
      // Aspetta che l'immagine sia caricata
      await new Promise<void>((resolve, reject) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Errore nel caricamento del logo'));
          // Timeout dopo 2 secondi
          setTimeout(() => reject(new Error('Timeout nel caricamento del logo')), 2000);
        }
      });
      
      // Dimensioni massime del logo nell'header (in mm)
      const maxLogoHeightMm = 25;
      const maxLogoWidthMm = 40;
      
      // Calcola le dimensioni mantenendo le proporzioni
      const aspectRatio = img.width / img.height;
      logoHeightMm = maxLogoHeightMm;
      logoWidthMm = logoHeightMm * aspectRatio;
      
      // Se la larghezza supera il massimo, scala in base alla larghezza
      if (logoWidthMm > maxLogoWidthMm) {
        logoWidthMm = maxLogoWidthMm;
        logoHeightMm = logoWidthMm / aspectRatio;
      }
      
      // Se il logo è un URL (non base64), convertilo in base64
      let logoData = logoToUse;
      let format = 'PNG';
      
      if (logoToUse.startsWith('data:image/')) {
        // È già un data URL
        logoData = logoToUse;
        if (logoToUse.startsWith('data:image/jpeg') || logoToUse.startsWith('data:image/jpg')) {
          format = 'JPEG';
        } else if (logoToUse.startsWith('data:image/png')) {
          format = 'PNG';
        }
      } else if (logoToUse.startsWith('/') || logoToUse.startsWith('http')) {
        // È un URL, convertilo in base64 usando canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          logoData = canvas.toDataURL('image/png');
          format = 'PNG';
        }
      }
      
      // Aggiungi il logo al PDF (jsPDF usa già mm come unità)
      doc.addImage(logoData, format, logoX, logoY, logoWidthMm, logoHeightMm);
      
      // Sposta il testo a destra del logo
      textX = logoX + logoWidthMm + 5;
    } catch (error) {
      console.error('Errore nel caricamento del logo:', error);
      // Se c'è un errore, continua senza logo
    }
  }
  
  // Testo header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const nomeAzienda = settings.nomeAzienda || 'Bitora - Gestione Rapportini';
  doc.text(nomeAzienda, textX, 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema Gestione Interventi Stufe', textX, 27);
  
  yPos = 45;

  // Dati Operatore - Sezione con sfondo
  drawBox(margin, yPos - 5, contentWidth, 8, bgLight);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DATI OPERATORE', margin + 2, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Nome e Cognome:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`${rapportino.operatore.nome} ${rapportino.operatore.cognome}`, margin + 45, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Qualifica:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(rapportino.operatore.qualifica, margin + 45, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Telefono:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(rapportino.operatore.telefono, margin + 45, yPos);
  yPos += 6;

  if (rapportino.operatore.email) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text('Email:', margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(rapportino.operatore.email, margin + 45, yPos);
    yPos += 6;
  }

  yPos += 8;
  drawLine(yPos);
  yPos += 10;

  // Dati Cliente - Sezione con sfondo
  drawBox(margin, yPos - 5, contentWidth, 8, bgLight);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DATI CLIENTE', margin + 2, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Nome e Cognome:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`${rapportino.cliente.nome} ${rapportino.cliente.cognome}`, margin + 45, yPos);
  yPos += 6;

  if (rapportino.cliente.ragioneSociale) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text('Ragione Sociale:', margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(rapportino.cliente.ragioneSociale, margin + 45, yPos);
    yPos += 6;
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Indirizzo:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const indirizzo = `${rapportino.cliente.indirizzo}, ${rapportino.cliente.citta} (${rapportino.cliente.cap})`;
  doc.text(indirizzo, margin + 45, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Telefono:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(rapportino.cliente.telefono, margin + 45, yPos);
  yPos += 6;

  if (rapportino.cliente.email) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text('Email:', margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(rapportino.cliente.email, margin + 45, yPos);
    yPos += 6;
  }

  if (rapportino.cliente.partitaIva) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text('Partita IVA:', margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(rapportino.cliente.partitaIva, margin + 45, yPos);
    yPos += 6;
  }

  if (rapportino.cliente.codiceFiscale) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text('Codice Fiscale:', margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(rapportino.cliente.codiceFiscale, margin + 45, yPos);
    yPos += 6;
  }

  yPos += 8;
  drawLine(yPos);
  yPos += 10;

  // Dati Intervento - Sezione con sfondo
  drawBox(margin, yPos - 5, contentWidth, 8, bgLight);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('DATI INTERVENTO', margin + 2, yPos);
  yPos += 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Data e Ora:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const dataOra = `${format(new Date(rapportino.intervento.data), 'dd/MM/yyyy')} - ${rapportino.intervento.ora}`;
  doc.text(dataOra, margin + 45, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Tipo Stufa:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(rapportino.intervento.tipoStufa === 'pellet' ? 'Pellet' : 'Legno', margin + 45, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Marca:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(rapportino.intervento.marca, margin + 45, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Modello:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(rapportino.intervento.modello, margin + 45, yPos);
  yPos += 6;

  if (rapportino.intervento.numeroSerie) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text('Numero di Serie:', margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(rapportino.intervento.numeroSerie, margin + 45, yPos);
    yPos += 6;
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text('Tipo Intervento:', margin, yPos);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(rapportino.intervento.tipoIntervento, margin + 45, yPos);
  yPos += 8;

  // Descrizione con box
  drawBox(margin, yPos - 3, contentWidth, 6, bgLight);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Descrizione:', margin + 2, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const descLines = doc.splitTextToSize(rapportino.intervento.descrizione, contentWidth - 4);
  doc.text(descLines, margin + 2, yPos);
  yPos += descLines.length * 5 + 8;

  // Materiali Utilizzati
  if (rapportino.intervento.materialiUtilizzati) {
    drawBox(margin, yPos - 3, contentWidth, 6, bgLight);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Materiali Utilizzati:', margin + 2, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const matLines = doc.splitTextToSize(rapportino.intervento.materialiUtilizzati, contentWidth - 4);
    doc.text(matLines, margin + 2, yPos);
    yPos += matLines.length * 5 + 8;
  }

  // Note
  if (rapportino.intervento.note) {
    drawBox(margin, yPos - 3, contentWidth, 6, bgLight);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Note Aggiuntive:', margin + 2, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const noteLines = doc.splitTextToSize(rapportino.intervento.note, contentWidth - 4);
    doc.text(noteLines, margin + 2, yPos);
    yPos += noteLines.length * 5 + 10;
  }

  // Controlla se serve una nuova pagina per le firme
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  // Firma
  yPos += 5;
  drawLine(yPos, darkGray, 1);
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  
  // Firma Operatore
  doc.text('Firma Operatore', margin, yPos);
  yPos += 12;
  drawLine(yPos, darkGray, 0.8);
  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text(`${rapportino.operatore.nome} ${rapportino.operatore.cognome}`, margin, yPos);
  yPos += 18;

  // Firma Cliente
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma Cliente', margin, yPos);
  yPos += 12;
  drawLine(yPos, darkGray, 0.8);
  yPos += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rapportino.cliente.nome} ${rapportino.cliente.cognome}`, margin, yPos);

  // Footer
  yPos = pageHeight - 20;
  drawLine(yPos, lightGray, 0.5);
  doc.setFontSize(7);
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  const footerText1 = `Rapportino creato il ${format(new Date(rapportino.dataCreazione), 'dd/MM/yyyy HH:mm')}`;
  doc.text(footerText1, pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.setFontSize(6);
  const footerText2 = 'Bitora Software Gestionale Stufe è un prodotto di Bitora.it';
  doc.text(footerText2, pageWidth / 2, pageHeight - 11, { align: 'center' });
  doc.setFontSize(5);
  const footerText3 = `© ${new Date().getFullYear()} Bitora.it - Tutti i diritti riservati`;
  doc.text(footerText3, pageWidth / 2, pageHeight - 7, { align: 'center' });

  return doc;
};

export const downloadPDF = async (rapportino: Rapportino, settings: AziendaSettings) => {
  const doc = await generatePDF(rapportino, settings);
  const fileName = `Rapportino_${rapportino.cliente.cognome}_${format(new Date(rapportino.intervento.data), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
};

export const exportAllPDFs = async (rapportini: Rapportino[], settings: AziendaSettings) => {
  // Import dinamico di JSZip
  const JSZip = (await import('jszip')).default;
  
  // Crea un nuovo archivio ZIP
  const zip = new JSZip();
  
  // Genera tutti i PDF e aggiungili allo ZIP
  for (let i = 0; i < rapportini.length; i++) {
    const rapportino = rapportini[i];
    const doc = await generatePDF(rapportino, settings);
    
    // Crea un nome file univoco per evitare conflitti
    const clienteNome = rapportino.cliente.cognome.replace(/[^a-zA-Z0-9]/g, '_');
    const dataStr = format(new Date(rapportino.intervento.data), 'yyyyMMdd');
    const fileName = `Rapportino_${clienteNome}_${dataStr}_${rapportino.id.substring(0, 8)}.pdf`;
    
    // Genera il PDF come blob e aggiungilo allo ZIP
    const pdfBlob = doc.output('blob');
    zip.file(fileName, pdfBlob);
  }
  
  // Genera lo ZIP e scaricalo
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = zipUrl;
  link.download = `Rapportini_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Rilascia l'URL del blob
  setTimeout(() => URL.revokeObjectURL(zipUrl), 100);
};
