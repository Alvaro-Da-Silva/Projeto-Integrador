export const PATENTES = [
  'BC Pleno Classe 1',
  'BC Pleno Classe 2',
  'BC Pleno Classe 3',
  'BC Sênior Classe 1',
  'BC Sênior Classe 2',
  'BC Júnior Classe 1',
  'BC Júnior Classe 2',
  'BC Júnior Classe 3',
  'BC'
] as const

export type Patente = (typeof PATENTES)[number]

export const isPatente = (valor: unknown): valor is Patente =>
  typeof valor === 'string' && (PATENTES as readonly string[]).includes(valor)
