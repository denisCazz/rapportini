export const OPERATOR_QUALIFICHE = [
  'Tecnico specializzato',
  'Tecnico installatore',
  'Tecnico manutentore',
  'Tecnico riparatore',
  'Tecnico qualificato',
  'Installatore autorizzato',
  'Manutentore autorizzato',
] as const;

export type OperatorQualifica = (typeof OPERATOR_QUALIFICHE)[number];
