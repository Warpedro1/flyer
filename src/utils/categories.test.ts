import { describe, expect, it } from 'vitest';

import { categoryLabel, EVENT_CATEGORIES } from './categories.ts';

describe('taxonomia de categorias', () => {
  it('tem os 22 slugs do backend (EventCategory em app/models/schemas.py)', () => {
    // Os slugs ficam gravados na base de dados: mudar um aqui sem migração parte os filtros.
    expect(EVENT_CATEGORIES.map((c) => c.slug)).toEqual([
      'comida_bebida',
      'vida_noturna',
      'musica_show',
      'arte_cultura',
      'teatro_cinema',
      'palestra_conhecimento',
      'cursos_oficinas',
      'estudo_leitura',
      'debate_comunidade',
      'voluntariado',
      'desporto',
      'academia_exercicio',
      'bem_estar',
      'praia_natureza',
      'turismo_passeio',
      'jogos',
      'compras_lojas',
      'feira_mercado',
      'familia_criancas',
      'religiao_espiritualidade',
      'tecnologia_negocios',
      'outros',
    ]);
  });

  it('mostra o rótulo de cada slug, no formato A/B', () => {
    expect(categoryLabel('tecnologia_negocios')).toBe('Tecnologia/Negócios');
    expect(categoryLabel('musica_show')).toBe('Música/Show');
    expect(categoryLabel('praia_natureza')).toBe('Praia/Natureza');
    expect(categoryLabel('academia_exercicio')).toBe('Academia/Exercício');
    expect(categoryLabel('outros')).toBe('Outros');
  });

  it('um valor fora da taxonomia (eventos antigos) aparece como Outros', () => {
    expect(categoryLabel('teste 3')).toBe('Outros');
    expect(categoryLabel(null)).toBeNull();
  });
});
