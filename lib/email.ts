// Sistema di notifiche email
// Supporta sia Resend che SMTP generico (Nodemailer)
// Configura le variabili d'ambiente nel file .env.local

import { Rapportino } from '@/types';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Configurazione email
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@bitora.it',
  resendApiKey: process.env.RESEND_API_KEY,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Invia email usando Resend API
async function sendWithResend(options: EmailOptions): Promise<boolean> {
  if (!EMAIL_CONFIG.resendApiKey) {
    console.warn('RESEND_API_KEY non configurata');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EMAIL_CONFIG.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_CONFIG.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Errore Resend:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Errore invio email Resend:', error);
    return false;
  }
}

// Invia email usando SMTP (richiede nodemailer installato)
async function sendWithSMTP(options: EmailOptions): Promise<boolean> {
  if (!EMAIL_CONFIG.smtpHost || !EMAIL_CONFIG.smtpUser) {
    console.warn('Configurazione SMTP incompleta');
    return false;
  }

  try {
    // Dynamic import per evitare errori se nodemailer non è installato
    const nodemailer = await import('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.smtpHost,
      port: EMAIL_CONFIG.smtpPort,
      secure: EMAIL_CONFIG.smtpPort === 465,
      auth: {
        user: EMAIL_CONFIG.smtpUser,
        pass: EMAIL_CONFIG.smtpPass,
      },
    });

    await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return true;
  } catch (error) {
    console.error('Errore invio email SMTP:', error);
    return false;
  }
}

// Funzione principale per inviare email
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Prova prima con Resend, poi con SMTP
  if (EMAIL_CONFIG.resendApiKey) {
    return sendWithResend(options);
  }
  
  if (EMAIL_CONFIG.smtpHost) {
    return sendWithSMTP(options);
  }

  console.warn('Nessun servizio email configurato');
  return false;
}

// Template email per conferma intervento
export function getInterventoEmailTemplate(rapportino: Rapportino, aziendaNome: string = 'Bitora - Gestione Rapportini'): EmailOptions {
  const dataIntervento = format(new Date(rapportino.intervento.data), 'dd MMMM yyyy', { locale: it });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conferma Intervento</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${aziendaNome}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Conferma Intervento Tecnico</p>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Gentile <strong>${rapportino.cliente.nome} ${rapportino.cliente.cognome}</strong>,</p>
    
    <p>Le confermiamo che in data <strong>${dataIntervento}</strong> alle ore <strong>${rapportino.intervento.ora}</strong> è stato effettuato un intervento tecnico presso il Suo indirizzo.</p>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #f97316;">Dettagli Intervento</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Tipo Stufa:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${rapportino.intervento.tipoStufa === 'pellet' ? 'Pellet' : 'Legno'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Marca:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${rapportino.intervento.marca}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Modello:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${rapportino.intervento.modello}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Tipo Intervento:</strong></td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${rapportino.intervento.tipoIntervento}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Tecnico:</strong></td>
          <td style="padding: 8px 0;">${rapportino.operatore.nome} ${rapportino.operatore.cognome}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #f97316;">Descrizione Lavoro</h3>
      <p style="margin: 0; white-space: pre-line;">${rapportino.intervento.descrizione}</p>
    </div>
    
    ${rapportino.intervento.materialiUtilizzati ? `
    <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h3 style="margin-top: 0; color: #f97316;">Materiali Utilizzati</h3>
      <p style="margin: 0;">${rapportino.intervento.materialiUtilizzati}</p>
    </div>
    ` : ''}
    
    ${rapportino.intervento.note ? `
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
      <h3 style="margin-top: 0; color: #92400e;">Note</h3>
      <p style="margin: 0;">${rapportino.intervento.note}</p>
    </div>
    ` : ''}
    
    <p>Per qualsiasi domanda o necessità, non esiti a contattarci.</p>
    
    <p>Cordiali saluti,<br>
    <strong>${aziendaNome}</strong></p>
  </div>
  
  <div style="background: #374151; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">Questa email è stata generata automaticamente dal sistema di gestione rapportini.</p>
    <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} ${aziendaNome} - Tutti i diritti riservati</p>
  </div>
</body>
</html>
  `;

  const text = `
Conferma Intervento Tecnico - ${aziendaNome}

Gentile ${rapportino.cliente.nome} ${rapportino.cliente.cognome},

Le confermiamo che in data ${dataIntervento} alle ore ${rapportino.intervento.ora} è stato effettuato un intervento tecnico presso il Suo indirizzo.

DETTAGLI INTERVENTO:
- Tipo Stufa: ${rapportino.intervento.tipoStufa === 'pellet' ? 'Pellet' : 'Legno'}
- Marca: ${rapportino.intervento.marca}
- Modello: ${rapportino.intervento.modello}
- Tipo Intervento: ${rapportino.intervento.tipoIntervento}
- Tecnico: ${rapportino.operatore.nome} ${rapportino.operatore.cognome}

DESCRIZIONE LAVORO:
${rapportino.intervento.descrizione}

${rapportino.intervento.materialiUtilizzati ? `MATERIALI UTILIZZATI:\n${rapportino.intervento.materialiUtilizzati}\n` : ''}
${rapportino.intervento.note ? `NOTE:\n${rapportino.intervento.note}\n` : ''}

Per qualsiasi domanda o necessità, non esiti a contattarci.

Cordiali saluti,
${aziendaNome}
  `;

  return {
    to: rapportino.cliente.email || '',
    subject: `Conferma Intervento del ${dataIntervento} - ${aziendaNome}`,
    html,
    text,
  };
}

// Funzione per inviare email di conferma intervento
export async function sendInterventoConfirmation(
  rapportino: Rapportino, 
  aziendaNome?: string
): Promise<{ success: boolean; message: string }> {
  if (!rapportino.cliente.email) {
    return { success: false, message: 'Email cliente non disponibile' };
  }

  const emailOptions = getInterventoEmailTemplate(rapportino, aziendaNome);
  const sent = await sendEmail(emailOptions);

  return {
    success: sent,
    message: sent ? 'Email inviata con successo' : 'Errore nell\'invio dell\'email',
  };
}
