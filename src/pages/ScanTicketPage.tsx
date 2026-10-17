import { CameraOff, CheckCircle2, Loader2, MapPinOff, ScanLine, Timer, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { openCheckin, scanTicket } from '../services/flyerApi.ts';
import type { ScanResult } from '../types/index.ts';
import { formatApiError, getApiErrorInfo } from '../utils/apiError.ts';
import { BackButton } from '../components/navigation/BackButton.tsx';
import { TrophyIcon } from '../components/ui/TrophyIcon.tsx';
import { isChunkLoadError, reloadOnce } from '../utils/chunkReload.ts';

/** Depois do sucesso, volta para a câmera sozinho: dá para ler uma fila seguida. */
const SUCCESS_MS = 2000;
const DETECT_INTERVAL_MS = 300;
/** Um QR recusado só é lido de novo depois disto (enquanto continua na frente da câmera). */
const REFUSED_COOLDOWN_MS = 5000;

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function nativeDetector(): BarcodeDetectorLike | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!ctor) return null;
  try {
    return new ctor({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

/** O que a tela mostra. A câmera só lê em `scanning`. */
type Phase =
  | { kind: 'scanning' }
  | { kind: 'processing' }
  | { kind: 'success'; result: ScanResult }
  | { kind: 'refused'; message: string }
  | { kind: 'needs_confirm'; token: string; message: string }
  | { kind: 'not_open'; token: string; message: string };

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* sem vibração: o aviso na tela basta */
  }
}

/** Bipe curto de confirmação; sem áudio (ou bloqueado), segue em silêncio. */
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => void ctx.close().catch(() => undefined);
  } catch {
    /* sem áudio */
  }
}

export default function ScanTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' });
  const [manualToken, setManualToken] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // A câmera lê o tempo todo; só a fase `scanning` aceita o que ela vê.
  const phaseRef = useRef<Phase['kind']>('scanning');
  phaseRef.current = phase.kind;
  // QRs que já entraram nunca mais são enviados; os recusados esperam um pouco.
  const accepted = useRef(new Set<string>());
  const refusedAt = useRef(new Map<string, number>());

  const resume = useCallback(() => {
    setPhase({ kind: 'scanning' });
    const video = videoRef.current;
    if (video) void Promise.resolve(video.play()).catch(() => undefined);
  }, []);

  const submit = useCallback(
    async (rawToken: string, options: { confirmWithoutLocation?: boolean } = {}) => {
      const token = rawToken.trim();
      if (!id || !token) return;
      phaseRef.current = 'processing';
      setPhase({ kind: 'processing' });
      try {
        videoRef.current?.pause();
      } catch {
        /* sem vídeo (entrada manual) */
      }
      try {
        const result = await scanTicket(id, token, {
          confirmWithoutLocation: options.confirmWithoutLocation ?? false,
        });
        accepted.current.add(token);
        setManualToken('');
        vibrate(80);
        beep();
        setPhase({ kind: 'success', result });
      } catch (err) {
        refusedAt.current.set(token, Date.now());
        const info = getApiErrorInfo(err);
        if (info.code === 'location_missing') {
          vibrate([100, 50, 100]);
          setPhase({ kind: 'needs_confirm', token, message: info.message });
        } else if (info.code === 'checkin_not_open') {
          vibrate([100, 50, 100]);
          setPhase({ kind: 'not_open', token, message: info.message });
        } else {
          vibrate([200, 100, 200]);
          setPhase({ kind: 'refused', message: formatApiError(err) });
        }
      }
    },
    [id],
  );

  const onDetected = useCallback(
    (value: string) => {
      if (phaseRef.current !== 'scanning') return;
      if (accepted.current.has(value)) return;
      const refused = refusedAt.current.get(value);
      if (refused !== undefined && Date.now() - refused < REFUSED_COOLDOWN_MS) return;
      void submit(value);
    },
    [submit],
  );

  // Câmera + leitura. Tudo o que é aberto aqui é fechado no cleanup:
  // sem isso a câmera fica ligada depois de trocar de página.
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let zxingControls: { stop: () => void } | null = null;
    let cancelled = false;

    const stopAll = () => {
      if (timer) clearInterval(timer);
      zxingControls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Não foi possível abrir a câmera neste dispositivo.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        setCameraError('Não foi possível abrir a câmera. Verifique as permissões.');
        return;
      }
      if (cancelled) {
        stopAll();
        return;
      }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // `play()` devolve undefined em ambientes sem media real (jsdom), por isso
        // não se pode encadear .catch() diretamente no retorno.
        await Promise.resolve(video.play()).catch(() => undefined);
      }

      const detector = nativeDetector();
      if (detector && video) {
        timer = setInterval(() => {
          if (phaseRef.current !== 'scanning') return;
          void detector
            .detect(video)
            .then((codes) => {
              const value = codes[0]?.rawValue;
              if (value) onDetected(value);
            })
            .catch(() => undefined);
        }, DETECT_INTERVAL_MS);
        return;
      }

      // Sem BarcodeDetector (Safari/iOS): carrega o leitor só aqui, para
      // não o arrastar para o bundle de quem nunca abre o leitor.
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (cancelled || !video) return;
        const reader = new BrowserQRCodeReader();
        zxingControls = await reader.decodeFromVideoElement(video, (decoded) => {
          const value = decoded?.getText();
          if (value) onDetected(value);
        });
      } catch (err) {
        // Uma aba de antes do último deploy pede um arquivo que já não existe (#33).
        if (isChunkLoadError(err) && reloadOnce()) return;
        setCameraError('Não foi possível ler códigos neste dispositivo.');
      }
    })();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [onDetected]);

  // Sucesso: mostra por um instante e volta para a câmera.
  useEffect(() => {
    if (phase.kind !== 'success') return;
    const timer = setTimeout(resume, SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [phase, resume]);

  const openAndRetry = async (token: string) => {
    if (!id) return;
    setPhase({ kind: 'processing' });
    try {
      await openCheckin(id);
    } catch (err) {
      setPhase({ kind: 'refused', message: formatApiError(err) });
      return;
    }
    await submit(token);
  };

  const scanning = phase.kind === 'scanning';

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <BackButton className="inline-flex items-center gap-2 text-gray-600 transition hover:text-red-600" />
        <button
          type="button"
          onClick={() => navigate(`/events/${id ?? ''}/attendees`)}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-red-300 hover:text-red-700"
        >
          Concluir
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-black shadow-sm">
        {cameraError ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 bg-gray-900 text-gray-300">
            <CameraOff className="h-8 w-8" />
            <p className="px-6 text-center text-sm">{cameraError}</p>
          </div>
        ) : (
          <video ref={videoRef} muted playsInline className="h-72 w-full object-cover" />
        )}

        {!scanning && (
          <div
            role="status"
            aria-live="assertive"
            className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center ${
              phase.kind === 'processing'
                ? 'bg-black/60 text-white'
                : phase.kind === 'success'
                  ? 'bg-green-600/95 text-white'
                  : phase.kind === 'refused'
                    ? 'bg-red-600/95 text-white'
                    : 'bg-amber-500/95 text-white'
            }`}
          >
            {phase.kind === 'processing' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin" />
                <p className="text-lg font-semibold">Validando ingresso…</p>
              </>
            )}

            {phase.kind === 'success' && (
              <>
                <CheckCircle2 className="h-16 w-16" />
                <p className="text-2xl font-bold">{phase.result.attendee.name ?? 'Participante'}</p>
                <p className="text-lg font-semibold">Check-in feito</p>
                {phase.result.trophy && (
                  <p className="flex items-center gap-2 rounded-2xl bg-white/20 px-3 py-1 text-sm">
                    <TrophyIcon
                      iconUrl={phase.result.trophy.icon_url}
                      name={phase.result.trophy.name}
                      className="h-5 w-5"
                    />
                    <span>{phase.result.trophy.name}</span>
                  </p>
                )}
                {!phase.result.location_checked && (
                  <p className="text-xs text-white/90">Entrada confirmada sem localização.</p>
                )}
              </>
            )}

            {phase.kind === 'refused' && (
              <>
                <XCircle className="h-16 w-16" />
                <p className="text-lg font-semibold">{phase.message}</p>
                <button
                  type="button"
                  onClick={resume}
                  className="rounded-2xl bg-white px-5 py-3 font-semibold text-red-700"
                >
                  Ler outro QR
                </button>
              </>
            )}

            {phase.kind === 'needs_confirm' && (
              <>
                <MapPinOff className="h-14 w-14" />
                <p className="text-lg font-semibold">{phase.message}</p>
                <p className="text-sm">Se a pessoa está na sua frente, confirme a entrada.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void submit(phase.token, { confirmWithoutLocation: true })}
                    className="rounded-2xl bg-white px-5 py-3 font-semibold text-amber-800"
                  >
                    Confirmar mesmo assim
                  </button>
                  <button
                    type="button"
                    onClick={resume}
                    className="rounded-2xl border border-white px-5 py-3 font-semibold text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {phase.kind === 'not_open' && (
              <>
                <Timer className="h-14 w-14" />
                <p className="text-lg font-semibold">{phase.message}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void openAndRetry(phase.token)}
                    className="rounded-2xl bg-white px-5 py-3 font-semibold text-amber-800"
                  >
                    Abrir check-in agora
                  </button>
                  <button
                    type="button"
                    onClick={resume}
                    className="rounded-2xl border border-white px-5 py-3 font-semibold text-white"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {scanning && (
        <p className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <ScanLine className="h-4 w-4" />
          Aponte a câmera para o QR do ingresso.
        </p>
      )}

      <form
        className="space-y-2 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          if (phaseRef.current === 'processing') return;
          void submit(manualToken);
        }}
      >
        <label htmlFor="manual-token" className="block text-sm font-medium text-gray-700">
          Código do ingresso
        </label>
        <input
          id="manual-token"
          type="text"
          value={manualToken}
          onChange={(event) => setManualToken(event.target.value)}
          placeholder="Cole aqui o código se a câmera não ajudar"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-red-500"
        />
        <button
          type="submit"
          disabled={phase.kind === 'processing'}
          className="w-full rounded-2xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {phase.kind === 'processing' ? 'Validando…' : 'Validar'}
        </button>
      </form>
    </div>
  );
}
