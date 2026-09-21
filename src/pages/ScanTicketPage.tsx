import { ArrowLeft, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { scanTicket } from '../services/flyerApi.ts';
import type { ScanResult } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

/** Volta ao modo de leitura sozinho, para dar para ler uma fila seguida. */
const RESET_MS = 3000;
const DETECT_INTERVAL_MS = 300;

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

export default function ScanTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [manualToken, setManualToken] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Evita disparar o mesmo código duas vezes enquanto o pedido está em curso.
  const inFlight = useRef(false);

  const submit = useCallback(
    async (token: string) => {
      if (!id || !token.trim() || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      setResult(null);
      try {
        const scanned = await scanTicket(id, token.trim());
        setResult(scanned);
        setManualToken('');
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setBusy(false);
        inFlight.current = false;
      }
    },
    [id],
  );

  // Câmara + descodificação. Tudo o que é aberto aqui é fechado no cleanup:
  // sem isso a câmara fica ligada depois de trocar de página.
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
        setCameraError('Não foi possível abrir a câmara neste dispositivo.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch {
        setCameraError('Não foi possível abrir a câmara. Verifica as permissões.');
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
          void detector
            .detect(video)
            .then((codes) => {
              const value = codes[0]?.rawValue;
              if (value) void submit(value);
            })
            .catch(() => undefined);
        }, DETECT_INTERVAL_MS);
        return;
      }

      // Sem BarcodeDetector (Safari/iOS): carrega o descodificador só aqui, para
      // não o arrastar para o bundle de quem nunca abre o leitor.
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (cancelled || !video) return;
        const reader = new BrowserQRCodeReader();
        zxingControls = await reader.decodeFromVideoElement(video, (decoded) => {
          const value = decoded?.getText();
          if (value) void submit(value);
        });
      } catch {
        setCameraError('Não foi possível ler códigos neste dispositivo.');
      }
    })();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [submit]);

  // Limpa o resultado para o próximo da fila.
  useEffect(() => {
    if (!result && !error) return;
    const timer = setTimeout(() => {
      setResult(null);
      setError(null);
    }, RESET_MS);
    return () => clearTimeout(timer);
  }, [result, error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-gray-600 transition hover:text-red-600"
      >
        <ArrowLeft className="h-5 w-5" />
        Voltar
      </button>

      <div className="overflow-hidden rounded-3xl border border-gray-100 bg-black shadow-sm">
        {cameraError ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 bg-gray-900 text-gray-300">
            <CameraOff className="h-8 w-8" />
            <p className="px-6 text-center text-sm">{cameraError}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-56 w-full object-cover"
          />
        )}
      </div>

      {result && (
        <div className="rounded-3xl border border-green-200 bg-green-50 p-5 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-2 text-lg font-bold text-green-900">
            {result.attendee.name ?? 'Participante'}
          </p>
          <p className="text-sm text-green-800">Entrada validada</p>
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-center">
          <XCircle className="mx-auto h-10 w-10 text-red-600" />
          <p className="mt-2 font-medium text-red-900">{error}</p>
        </div>
      )}

      <form
        className="space-y-2 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(manualToken);
        }}
      >
        <label htmlFor="manual-token" className="block text-sm font-medium text-gray-700">
          Código do bilhete
        </label>
        <input
          id="manual-token"
          type="text"
          value={manualToken}
          onChange={(event) => setManualToken(event.target.value)}
          placeholder="Cola aqui o código se a câmara não ajudar"
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-red-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? 'A validar…' : 'Validar'}
        </button>
      </form>
    </div>
  );
}
