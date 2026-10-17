import { describe, expect, it } from 'vitest';

import indexHtml from '../index.html?raw';

// O app é em português do Brasil (decisão de 2026-10-17): "você", imperativo na 3ª
// pessoa ("Tente", "Aguarde"), gerúndio ("Carregando…"), "Enviamos", "tela",
// "ingresso", "salvar"… Esta guarda procura as formas de Portugal no código do app,
// sem os comentários (que são para quem desenvolve). Os testes ficam de fora.
const sources = import.meta.glob(['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// `\b` do JavaScript não conhece acentos: "ecrã" não teria fronteira no fim.
const word = (alternatives: string) => `(?<![\\p{L}\\p{N}_])(?:${alternatives})(?![\\p{L}\\p{N}_])`;

const INSENSITIVE = new RegExp(
  [
    // "tu" e companhia; no Brasil é "você", "seu/sua".
    word('tu|ti|teu|tua|teus|tuas|contigo|tens|estás|podes|queres|és|foste|fizeste|enviaste|criaste|pediste|entraste|cancelaste|obtiveste|veres|ativares|criares|confirmares'),
    // Pretérito com acento: "Enviámos", "encontrámos".
    '[\\p{L}]+ámos(?![\\p{L}])',
    // Pronome depois do verbo: "Abre-o", "diz-nos", "avisamos-te".
    '[\\p{L}]+[aei]-(?:te|nos|o|a|lo|la)(?![\\p{L}])',
    // Vocabulário.
    word('ecrã|utilizador\\p{L}*|ficheiro\\p{L}*|bilhete\\p{L}*|câmara|gerir|partilh\\p{L}*|ligação|registar|registo|actual|coleccion\\p{L}*|telemóvel|equipa|aceite|definições|subscrever'),
    'correu mal|em curso|(?<![\\p{L}])tem de(?![\\p{L}])|Os meus|A minha|o meu bilhete|desligad\\p{L}*',
    word('(?:entra|tenta) (?:outra vez|de novo|novamente)'),
  ].join('|'),
  'giu',
);

// Com maiúscula, porque em minúscula são 3ª pessoa válida ("o check-in usa…", "Preço a
// confirmar"): imperativos com "tu" e "A carregar…" (no Brasil, gerúndio).
const IMPERATIVES = new RegExp(
  [
    word('Tenta|Espera|Verifica|Entra|Pede|Usa|Escolhe|Indica|Faz|Muda|Ignora|Cola|Clica|Preenche|Descobre|Mostra|Guarda|Fala|Ativa|Permite|Aproxima|Vê|Diz'),
    word('A (?:carregar|guardar|enviar|confirmar|ativar|criar|entrar|validar|verificar|obter|procurar|mostrar|actualizar|atualizar|redirecionar)'),
  ].join('|'),
  'gu',
);

function ptPtOffences(text: string): string[] {
  return [...(text.match(INSENSITIVE) ?? []), ...(text.match(IMPERATIVES) ?? [])];
}

/** Tira os comentários sem mudar a numeração das linhas. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[\s;{}(])\/\/.*$/gm, '$1');
}

describe('português do Brasil', () => {
  it('a guarda reconhece português de Portugal e deixa passar o do Brasil', () => {
    for (const text of [
      'Sessão inválida: entra outra vez.',
      'Enviámos um código',
      'A carregar…',
      'Abre-o no navegador',
      'Guarda este ecrã',
      'Algo correu mal',
      'Ver o meu bilhete',
      'Ainda não tens conta?',
    ]) {
      expect(ptPtOffences(text), text).not.toEqual([]);
    }
    for (const text of [
      'Sessão inválida: entre novamente.',
      'Enviamos um código',
      'Carregando…',
      'Ver meu ingresso',
      'Ainda não tem conta?',
      'O check-in usa sua posição real.',
      'https://flyer-inky.vercel.app',
    ]) {
      expect(ptPtOffences(text), text).toEqual([]);
    }
  });

  it('nenhum texto do app está em português de Portugal', () => {
    const bad: string[] = [];
    for (const [path, source] of Object.entries(sources)) {
      if (path === './ptBR.test.ts') continue;
      withoutComments(source)
        .split('\n')
        .forEach((line, i) => {
          const found = ptPtOffences(line);
          if (found.length) bad.push(`${path}:${i + 1}: ${line.trim()} → ${found.join(', ')}`);
        });
    }

    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  });

  it('o index.html declara pt-BR', () => {
    expect(indexHtml).toMatch(/<html[^>]*\blang="pt-BR"/);
  });
});
