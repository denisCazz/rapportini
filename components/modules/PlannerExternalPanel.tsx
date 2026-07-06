'use client';

import {
  MapPin,
  Route,
  Users,
  Navigation,
  Sparkles,
  StickyNote,
  Phone,
  ExternalLink,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const PLANNER_APP_URL = 'https://planner.bitora.it';

const FEATURES = [
  {
    icon: Route,
    title: 'Percorsi ottimizzati',
    description:
      'Raggruppa gli interventi della giornata e calcola l\'ordine migliore partendo dal deposito aziendale, riducendo km e tempo in viaggio.',
  },
  {
    icon: Navigation,
    title: 'Navigazione integrata',
    description:
      'Apri il percorso completo in Google Maps con un clic e segui le tappe nell\'ordine suggerito, con orari pianificati per ogni intervento.',
  },
  {
    icon: Sparkles,
    title: 'Geocodifica automatica',
    description:
      'Gli indirizzi mancanti vengono geolocalizzati automaticamente così ogni tappa compare correttamente sulla mappa.',
  },
  {
    icon: Users,
    title: 'Vista per tecnico',
    description:
      'Filtra gli interventi per singolo tecnico o visualizza l\'intera squadra: utile per coordinatori e amministratori.',
  },
  {
    icon: Phone,
    title: 'CRM contatti cliente',
    description:
      'Consulta e aggiorna telefono, email e referenti del cliente direttamente dalla scheda, senza uscire dal flusso di lavoro.',
  },
  {
    icon: StickyNote,
    title: 'Note e storico',
    description:
      'Aggiungi note operative sulla scheda cliente per condividere informazioni utili con il team prima dell\'intervento.',
  },
] as const;

export default function PlannerExternalPanel() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardHeader className="space-y-4 pb-2">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <MapPin className="h-7 w-7" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <CardTitle className="text-2xl">Bitora Planner</CardTitle>
              <CardDescription className="text-base leading-relaxed text-foreground/80">
                Il Planner è l&apos;applicazione dedicata alla pianificazione intelligente dei percorsi
                e alla gestione dei contatti cliente. Collega gli interventi già pianificati in Bitora,
                ottimizza le tappe della giornata e tieni a portata di mano tutte le informazioni utili
                sul campo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Il modulo Planner vive su un&apos;app separata, ottimizzata per mappe, navigazione e CRM leggero.
            Accedi con le stesse credenziali Bitora.
          </p>
          <a
            href={PLANNER_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
          >
            Apri Bitora Planner
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-heading text-lg font-semibold text-foreground">Cosa puoi fare</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <feature.icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">Pronto per pianificare la giornata?</p>
            <p className="text-sm text-muted-foreground">
              Vai su planner.bitora.it per ottimizzare i percorsi e consultare le schede cliente.
            </p>
          </div>
          <a
            href={PLANNER_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0 gap-2')}
          >
            Vai al Planner
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
