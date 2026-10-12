import type { EventCategory } from '../types/index.ts';

/**
 * Taxonomia de coisas para fazer. Os slugs espelham `EventCategory` no backend
 * (app/models/schemas.py) e ficam gravados na base de dados: mudar um exige migração.
 */
export const EVENT_CATEGORIES: ReadonlyArray<{ slug: EventCategory; label: string }> = [
  { slug: 'comida_bebida', label: 'Comida/Bebida' },
  { slug: 'vida_noturna', label: 'Vida noturna/Festas' },
  { slug: 'musica_show', label: 'Música/Show' },
  { slug: 'arte_cultura', label: 'Arte/Cultura' },
  { slug: 'teatro_cinema', label: 'Teatro/Cinema' },
  { slug: 'palestra_conhecimento', label: 'Palestras/Conhecimento' },
  { slug: 'cursos_oficinas', label: 'Cursos/Oficinas' },
  { slug: 'estudo_leitura', label: 'Estudo/Leitura' },
  { slug: 'debate_comunidade', label: 'Debates/Comunidade' },
  { slug: 'voluntariado', label: 'Voluntariado' },
  { slug: 'desporto', label: 'Esportes' },
  { slug: 'academia_exercicio', label: 'Academia/Exercício' },
  { slug: 'bem_estar', label: 'Bem-estar' },
  { slug: 'praia_natureza', label: 'Praia/Natureza' },
  { slug: 'turismo_passeio', label: 'Turismo/Passeios' },
  { slug: 'jogos', label: 'Jogos' },
  { slug: 'compras_lojas', label: 'Compras/Lojas' },
  { slug: 'feira_mercado', label: 'Feiras/Mercados' },
  { slug: 'familia_criancas', label: 'Família/Crianças' },
  { slug: 'religiao_espiritualidade', label: 'Religião/Espiritualidade' },
  { slug: 'tecnologia_negocios', label: 'Tecnologia/Negócios' },
  { slug: 'outros', label: 'Outros' },
];

const LABELS = new Map<string, string>(EVENT_CATEGORIES.map((c) => [c.slug, c.label]));

export function isEventCategory(value: string): value is EventCategory {
  return LABELS.has(value);
}

/** Rótulo para mostrar; texto fora da taxonomia (eventos antigos) conta como Outros. */
export function categoryLabel(value: string | null): string | null {
  if (value === null) return null;
  return LABELS.get(value) ?? 'Outros';
}
