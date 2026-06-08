import { Rapportino, AziendaSettings } from '@/types';
import { format } from 'date-fns';
import {
  CONTROLLO_GARANZIA_FIELDS,
  formatSiNoNc,
  formatTipologiaInstallazione,
  formatTipologiaIntervento,
} from '@/lib/rapportino-constants';


export const generatePDF = async (rapportino: Rapportino, settings: AziendaSettings) => {
  // Import dinamico di jsPDF
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    precision: 2,
  });

  const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.78));

  const optimizeImageDataUrl = async (
    source: string,
    targetWidthPx: number,
    targetHeightPx: number,
    quality = 0.72,
    options?: {
      fitMode?: 'cover' | 'contain';
      outputFormat?: 'jpeg' | 'png';
      backgroundColor?: string;
      paddingPx?: number;
    }
  ): Promise<string | null> => {
    try {
      const fitMode = options?.fitMode || 'cover';
      const outputFormat = options?.outputFormat || 'jpeg';
      const backgroundColor = options?.backgroundColor || '#ffffff';
      const paddingPx = Math.max(0, options?.paddingPx || 0);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = source;

      await new Promise<void>((resolve, reject) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Immagine non caricabile'));
          setTimeout(() => reject(new Error('Timeout caricamento immagine')), 3000);
        }
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetWidthPx;
      canvas.height = targetHeightPx;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);

      const sourceRatio = img.width / img.height;
      const safeWidth = Math.max(1, targetWidthPx - (paddingPx * 2));
      const safeHeight = Math.max(1, targetHeightPx - (paddingPx * 2));
      const targetRatio = safeWidth / safeHeight;

      let drawWidth = safeWidth;
      let drawHeight = safeHeight;
      let offsetX = paddingPx;
      let offsetY = paddingPx;

      if (fitMode === 'cover') {
        if (sourceRatio > targetRatio) {
          drawHeight = safeHeight;
          drawWidth = Math.round(drawHeight * sourceRatio);
          offsetX = Math.round((targetWidthPx - drawWidth) / 2);
        } else {
          drawWidth = safeWidth;
          drawHeight = Math.round(drawWidth / sourceRatio);
          offsetY = Math.round((targetHeightPx - drawHeight) / 2);
        }
      } else {
        if (sourceRatio > targetRatio) {
          drawWidth = safeWidth;
          drawHeight = Math.round(drawWidth / sourceRatio);
          offsetY = Math.round((targetHeightPx - drawHeight) / 2);
        } else {
          drawHeight = safeHeight;
          drawWidth = Math.round(drawHeight * sourceRatio);
          offsetX = Math.round((targetWidthPx - drawWidth) / 2);
        }
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      if (outputFormat === 'png') {
        return canvas.toDataURL('image/png');
      }
      return canvas.toDataURL('image/jpeg', quality);
    } catch {
      return null;
    }
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const footerTop = pageHeight - 22;
  let yPos = margin;

  // Colori
  /* Tema brace / arancio Bitora (#E25822 ≈) */
  const primaryColor = [226, 88, 12];
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

  const ensureSpace = (requiredHeight: number) => {
    if (yPos + requiredHeight > footerTop) {
      doc.addPage();
      yPos = margin;
    }
  };

  const drawFooter = () => {
    drawBox(margin, footerTop - 2.5, contentWidth, 1.2, primaryColor);
    drawLine(footerTop, lightGray, 0.5);
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);

    doc.setFontSize(7);
    const footerText1 = `Rapportino creato il ${format(new Date(rapportino.dataCreazione), 'dd/MM/yyyy HH:mm')}`;
    doc.text(footerText1, pageWidth / 2, footerTop + 5, { align: 'center' });

    doc.setFontSize(6);
    const footerText2 = 'Bitora Software di Gestione Specializzato è un prodotto di Bitora.it';
    doc.text(footerText2, pageWidth / 2, footerTop + 9, { align: 'center' });

    doc.setFontSize(5);
    const footerText3 = `© ${new Date().getFullYear()} Bitora.it - Tutti i diritti riservati`;
    doc.text(footerText3, pageWidth / 2, footerTop + 13, { align: 'center' });
  };

  // Header professionale
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
      
      const optimizedLogo = await optimizeImageDataUrl(
        logoToUse,
        mmToPx(logoWidthMm),
        mmToPx(logoHeightMm),
        0.7
      );

      if (optimizedLogo) {
        doc.addImage(optimizedLogo, 'JPEG', logoX, logoY, logoWidthMm, logoHeightMm);
      }
      
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
  const nomeAzienda = settings.nomeAzienda || 'Bitora - Software di Gestione Specializzato';
  doc.text(nomeAzienda, textX, 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapportini e Attivazioni Garanzie', textX, 27);

  doc.setFontSize(8);
  doc.setTextColor(230, 245, 255);
  doc.text(`ID Rapporto: ${rapportino.id}`, pageWidth - margin, 27, { align: 'right' });
  
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
  const viaCliente = [rapportino.cliente.via, rapportino.cliente.numeroCivico].filter(Boolean).join(' ') || rapportino.cliente.indirizzo;
  const localitaCliente = [rapportino.cliente.citta, rapportino.cliente.provincia, rapportino.cliente.cap].filter(Boolean).join(' ');
  const indirizzo = `${viaCliente}, ${localitaCliente}`;
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

  const addFieldRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text(`${label}:`, margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(value, margin + 45, yPos);
    yPos += 6;
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(18);
    drawBox(margin, yPos - 5, contentWidth, 8, bgLight);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title, margin + 2, yPos);
    yPos += 10;
    doc.setFontSize(9);
  };

  const addTextBlock = (title: string, text: string) => {
    if (!text?.trim()) return;
    ensureSpace(28);
    drawBox(margin, yPos - 3, contentWidth, 6, bgLight);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${title}:`, margin + 2, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const lines = doc.splitTextToSize(text, contentWidth - 4);
    ensureSpace((lines.length * 5) + 12);
    doc.text(lines, margin + 2, yPos);
    yPos += lines.length * 5 + 8;
  };

  addSectionTitle('TIPOLOGIA INTERVENTO');
  addFieldRow('Tipologia', formatTipologiaIntervento(rapportino.intervento.tipologiaIntervento || rapportino.intervento.tipoIntervento));
  if (rapportino.intervento.dataRichiesta) {
    addFieldRow('Data richiesta', format(new Date(rapportino.intervento.dataRichiesta), 'dd/MM/yyyy'));
  }
  addFieldRow('Data intervento', `${format(new Date(rapportino.intervento.data), 'dd/MM/yyyy')} - ${rapportino.intervento.ora}`);
  yPos += 4;
  drawLine(yPos);
  yPos += 10;

  addSectionTitle('DATI APPARECCHIO');

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

  if (rapportino.intervento.dataAcquisto) {
    addFieldRow('Data acquisto', format(new Date(rapportino.intervento.dataAcquisto), 'dd/MM/yyyy'));
  }
  if (rapportino.intervento.rivenditore) {
    addFieldRow('Rivenditore', rapportino.intervento.rivenditore);
  }
  yPos += 4;
  drawLine(yPos);
  yPos += 10;

  addSectionTitle('RELAZIONE INTERVENTO');
  addTextBlock('Motivo della chiamata', rapportino.intervento.motivoChiamata || rapportino.intervento.descrizione || '');
  addTextBlock('Verifiche', rapportino.intervento.verifiche || '');
  if (rapportino.intervento.installazioneEseguitaDa) {
    addFieldRow('Installazione eseguita da', rapportino.intervento.installazioneEseguitaDa);
  }
  addTextBlock('Materiali utilizzati', rapportino.intervento.materialiUtilizzati || '');
  addTextBlock('Note', rapportino.intervento.note || '');

  addSectionTitle('CONTROLLO AVVIO GARANZIA');
  CONTROLLO_GARANZIA_FIELDS.forEach((field) => {
    const value = formatSiNoNc(rapportino.intervento.controlloGaranzia?.[field.key]);
    const labelLines = doc.splitTextToSize(field.label, contentWidth - 50);
    ensureSpace(labelLines.length * 5 + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
    doc.text(labelLines, margin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(value, pageWidth - margin, yPos, { align: 'right' });
    yPos += labelLines.length * 5 + 2;
  });
  yPos += 4;
  drawLine(yPos);
  yPos += 10;

  addSectionTitle('TIPOLOGIA INSTALLAZIONE');
  if (rapportino.intervento.tipologiaInstallazione) {
    addFieldRow('Tipologia', formatTipologiaInstallazione(rapportino.intervento.tipologiaInstallazione));
  }
  addTextBlock('Note installazione', rapportino.intervento.noteInstallazione || '');
  if (rapportino.intervento.prossimoIntervento) {
    addFieldRow('Prossimo intervento', format(new Date(rapportino.intervento.prossimoIntervento), 'dd/MM/yyyy'));
  }

  // Garantisce spazio per blocco firme + nomi + footer
  ensureSpace(52);

  // Sezione firme
  yPos += 5;
  drawLine(yPos, darkGray, 1);
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  
  const signatureTop = yPos;
  const signatureBoxHeight = 30;
  const signatureGap = 6;
  const signatureWidth = (contentWidth - signatureGap * 2) / 3;
  const signatures = [
    { label: 'Firma privacy cliente', value: rapportino.intervento.firmaClientePrivacy },
    { label: 'Firma cliente', value: rapportino.intervento.firmaCliente },
    { label: 'Firma C.A.T.', value: rapportino.intervento.firmaOperatore },
  ];

  doc.setFillColor(249, 250, 251);
  signatures.forEach((_, index) => {
    doc.rect(margin + index * (signatureWidth + signatureGap), signatureTop, signatureWidth, signatureBoxHeight, 'F');
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  signatures.forEach((sig, index) => {
    doc.text(sig.label, margin + index * (signatureWidth + signatureGap) + 2, signatureTop + 5);
  });

  for (let index = 0; index < signatures.length; index++) {
    const sig = signatures[index];
    if (!sig.value) continue;
    try {
      const optimized = await optimizeImageDataUrl(
        sig.value,
        mmToPx(signatureWidth - 4),
        mmToPx(signatureBoxHeight - 11),
        0.9,
        { fitMode: 'contain', outputFormat: 'png', backgroundColor: '#ffffff', paddingPx: 6 }
      );
      if (optimized) {
        doc.addImage(
          optimized,
          'PNG',
          margin + index * (signatureWidth + signatureGap) + 2,
          signatureTop + 7,
          signatureWidth - 4,
          signatureBoxHeight - 11
        );
      }
    } catch (error) {
      console.error('Errore rendering firma nel PDF:', error);
    }
  }

  yPos = signatureTop + signatureBoxHeight + 5;
  drawLine(yPos, darkGray, 0.8);
  yPos += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
  doc.text(`${rapportino.cliente.nome} ${rapportino.cliente.cognome}`, margin + signatureWidth + signatureGap + 2, yPos);
  doc.text(`${rapportino.operatore.nome} ${rapportino.operatore.cognome}`, margin + 2 * (signatureWidth + signatureGap) + 2, yPos);

  drawFooter();

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
