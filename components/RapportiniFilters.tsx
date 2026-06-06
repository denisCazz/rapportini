'use client';

import { useState, useEffect } from 'react';
import { parseResponseBody, fetchWithAuth } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterValues {
  tipoStufa?: 'pellet' | 'legno';
  dataInizio?: string;
  dataFine?: string;
  marca?: string;
  modello?: string;
  search?: string;
}

interface RapportiniFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

interface Marca { id: string; nome: string; }

export default function RapportiniFilters({ onFilterChange, initialFilters = {} }: RapportiniFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [marche, setMarche] = useState<Marca[]>([]);
  const [modelli, setModelli] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/marche')
      .then(async (res) => {
        const data = await parseResponseBody<Array<{ id: string; nome: string }>>(res);
        if (!res.ok) {
          console.error('Errore caricamento marche:', data);
          return;
        }
        if (Array.isArray(data)) {
          setMarche(data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const marcaObj = marche.find((m) => m.nome === filters.marca);
    if (marcaObj) {
      fetchWithAuth(`/api/modelli?marca_id=${encodeURIComponent(marcaObj.id)}`)
        .then(async (res) => {
          const data = await parseResponseBody<Array<{ nome: string }>>(res);
          if (!res.ok) {
            console.error('Errore caricamento modelli:', data);
            return;
          }
          if (Array.isArray(data)) {
            setModelli(data.map((m) => m.nome));
          }
        })
        .catch(console.error);
    } else {
      setModelli([]);
    }
  }, [filters.marca, marche]);

  const handleChange = (key: keyof FilterValues, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };

    if (key === 'marca') {
      newFilters.modello = undefined;
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  const activeFiltersCount = Object.values(filters).filter((v) => v).length;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-muted-foreground" aria-hidden />
          <span className="font-medium text-foreground">Filtri avanzati</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="font-semibold">
              {activeFiltersCount} attivi
            </Badge>
          )}
        </div>
        <ChevronDown
          className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {isExpanded && (
        <div className="border-t border-border px-6 pb-6">
          <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="lg:col-span-2 space-y-1.5">
              <Label htmlFor="filter-search">Ricerca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="filter-search"
                  type="text"
                  placeholder="Cerca per descrizione, note..."
                  value={filters.search || ''}
                  onChange={(e) => handleChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo stufa</Label>
              <Select
                value={filters.tipoStufa || 'all'}
                onValueChange={(v) => handleChange('tipoStufa', !v || v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="pellet">Pellet</SelectItem>
                  <SelectItem value="legno">Legno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-data-inizio">Data da</Label>
              <Input
                id="filter-data-inizio"
                type="date"
                value={filters.dataInizio || ''}
                onChange={(e) => handleChange('dataInizio', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-data-fine">Data a</Label>
              <Input
                id="filter-data-fine"
                type="date"
                value={filters.dataFine || ''}
                onChange={(e) => handleChange('dataFine', e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Select
                value={filters.marca || 'all'}
                onValueChange={(v) => handleChange('marca', !v || v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {marche.map((m) => (
                    <SelectItem key={m.id} value={m.nome}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Modello</Label>
              <Select
                value={filters.modello || 'all'}
                onValueChange={(v) => handleChange('modello', !v || v === 'all' ? undefined : v)}
                disabled={!filters.marca}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {modelli.map((modello) => (
                    <SelectItem key={modello} value={modello}>
                      {modello}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                <X className="h-4 w-4" aria-hidden />
                Resetta filtri
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
