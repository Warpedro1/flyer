import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';

import { INTRO_STEPS } from '../../constants/introSteps.ts';

const SPOT_PADDING = 8;
const GAP = 16;
const BALLOON_WIDTH = 360;
const BALLOON_HEIGHT = 240;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** O primeiro elemento visível do passo: há um na barra lateral e outro no celular. */
function visibleTarget(target: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function measure(target: string): Rect | null {
  const el = visibleTarget(target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Embaixo do destaque se couber, senão em cima; sempre dentro da tela. */
function balloonPosition(rect: Rect): { top: number; left: number; width: number } {
  const width = Math.min(BALLOON_WIDTH, window.innerWidth - 2 * GAP);
  const below = rect.top + rect.height + SPOT_PADDING + GAP;
  const top =
    below + BALLOON_HEIGHT <= window.innerHeight
      ? below
      : Math.max(GAP, rect.top - SPOT_PADDING - GAP - BALLOON_HEIGHT);
  const left = Math.min(Math.max(GAP, rect.left), window.innerWidth - width - GAP);
  return { top, left, width };
}

export interface IntroTourProps {
  /** Ao terminar ("Começar") ou pular ("Pular", Esc). */
  onFinish: () => void;
}

/**
 * Introdução do 1.º login (Warpedro1/flyer#23): destaca cada parte do app com um
 * balão. Feita à mão com Tailwind: o CLAUDE.md não deixa usar bibliotecas prontas.
 */
export function IntroTour({ onFinish }: IntroTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const step = INTRO_STEPS[index];
  const last = index === INTRO_STEPS.length - 1;

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, INTRO_STEPS.length - 1)), []);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Mede o alvo do passo e acompanha o scroll e o tamanho da janela.
  useEffect(() => {
    const el = visibleTarget(step.target);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
    const update = () => setRect(measure(step.target));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.target]);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onFinish();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish, next, back]);

  // O foco fica nos botões do balão.
  const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button'));
    if (buttons.length === 0) return;
    const first = buttons[0];
    const lastButton = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastButton.focus();
    } else if (!e.shiftKey && document.activeElement === lastButton) {
      e.preventDefault();
      first.focus();
    } else if (!dialogRef.current.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  };

  const position = rect ? balloonPosition(rect) : null;

  return (
    <div className="fixed inset-0 z-50" onKeyDown={trapFocus}>
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-2xl ring-2 ring-red-600 motion-safe:transition-all motion-safe:duration-300"
          style={{
            top: rect.top - SPOT_PADDING,
            left: rect.left - SPOT_PADDING,
            width: rect.width + 2 * SPOT_PADDING,
            height: rect.height + 2 * SPOT_PADDING,
            boxShadow: '0 0 0 9999px rgba(17, 24, 39, 0.6)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-gray-900/60" />
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-placement={position ? 'target' : 'center'}
        className={`fixed rounded-2xl bg-white p-5 shadow-2xl motion-safe:transition-all motion-safe:duration-300 ${
          position ? '' : 'left-1/2 top-1/2 w-[min(360px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2'
        }`}
        style={position ? { top: position.top, left: position.left, width: position.width } : undefined}
      >
        <p className="text-xs font-semibold text-red-600">
          {index + 1} de {INTRO_STEPS.length}
        </p>
        <h2 id={titleId} className="mt-1 text-lg font-bold text-gray-900">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-2 text-sm text-gray-600">
          {step.body}
          {!position && <span className="mt-2 block text-gray-500">{step.where}</span>}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onFinish}
            className="rounded-xl px-2 py-1 text-sm font-semibold text-gray-500 hover:text-gray-800"
          >
            Pular
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={last ? onFinish : next}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-200 hover:bg-red-700"
            >
              {last ? 'Começar' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
