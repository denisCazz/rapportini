'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline text-sm mb-8 inline-block">
          ← Torna al login
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Informativa Privacy e Cookie Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-12">
          Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali è l&apos;organizzazione che utilizza questa piattaforma per la gestione dei rapportini di intervento. Per contatti e richieste relative ai dati personali, rivolgersi all&apos;amministratore dell&apos;organizzazione.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">2. Dati raccolti</h2>
            <p className="mb-2">Raccogliamo e trattiamo:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Utenti (operatori/admin):</strong> nome, cognome, username, email, telefono, qualifica, firma digitale</li>
              <li><strong>Clienti:</strong> nome, cognome, ragione sociale, indirizzo, città, CAP, telefono, email, partita IVA, codice fiscale</li>
              <li><strong>Rapportini:</strong> dati degli interventi, firme, note tecniche</li>
              <li><strong>Cookie tecnici:</strong> sessioni di autenticazione (necessari per il funzionamento)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">3. Finalità e base giuridica</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Esecuzione del contratto:</strong> gestione rapportini e interventi per i clienti</li>
              <li><strong>Legittimo interesse:</strong> gestione operativa, documentazione tecnica</li>
              <li><strong>Obblighi di legge:</strong> conservazione documentale per normativa contabile</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">4. Conservazione dei dati</h2>
            <p>
              I dati sono conservati per il tempo necessario alle finalità indicate e per gli obblighi di legge (conservazione documentale: minimo 10 anni per documenti contabili). I dati non più necessari sono cancellati o anonimizzati.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">5. Diritti dell&apos;interessato (GDPR)</h2>
            <p className="mb-2">In conformità al Regolamento UE 2016/679 hai diritto a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Accesso:</strong> ottenere copia dei tuoi dati personali</li>
              <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti</li>
              <li><strong>Cancellazione:</strong> richiedere la cancellazione dei tuoi dati (&quot;diritto all&apos;oblio&quot;)</li>
              <li><strong>Portabilità:</strong> ricevere i dati in formato strutturato</li>
              <li><strong>Limitazione:</strong> limitare il trattamento in certi casi</li>
              <li><strong>Opposizione:</strong> opporti al trattamento per motivi legittimi</li>
              <li><strong>Reclamo:</strong> proporre reclamo all&apos;Autorità Garante per la Protezione dei Dati Personali</li>
            </ul>
            <p className="mt-4">
              Per esercitare i tuoi diritti, accedi al tuo profilo utente o contatta l&apos;amministratore dell&apos;organizzazione.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">6. Cookie</h2>
            <p>
              Utilizziamo cookie tecnici essenziali per l&apos;autenticazione e il funzionamento della piattaforma. Non utilizziamo cookie di profilazione o marketing. I cookie di sessione sono eliminati al logout.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">7. Sicurezza</h2>
            <p>
              I dati sono protetti con misure tecniche e organizzative adeguate: cifratura in transito (HTTPS), autenticazione sicura, accesso limitato ai soli autorizzati tramite ruoli.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">8. Trasferimento dati</h2>
            <p>
              I dati sono ospitati su infrastrutture cloud (Supabase) conformi al GDPR. I trasferimenti verso paesi extra-UE sono regolati da clausole contrattuali standard o decisioni di adeguatezza.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline text-sm">
            ← Torna al login
          </Link>
        </div>
      </div>
    </div>
  );
}
