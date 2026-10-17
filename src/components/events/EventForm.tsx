import { Plus, Save, Trash2, UploadCloud } from 'lucide-react';
import { type DragEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../hooks/useAuth.ts';
import { useEffectiveGeo } from '../../hooks/useEffectiveGeo.ts';
import { TROPHY_ICON_ACCEPT, uploadEventMedia, uploadTrophyIcon } from '../../services/storage.ts';
import type {
  EventCategory,
  EventCreate,
  EventEditRead,
  EventMediaCreate,
  EventRead,
  EventRecurrence,
  MediaType,
  TrophyCustomization,
} from '../../types/index.ts';
import { formatApiError } from '../../utils/apiError.ts';
import { EVENT_CATEGORIES } from '../../utils/categories.ts';
import { type GeocodeResult, geocodeAddress, reverseGeocode } from '../../utils/geocode.ts';
import { isoToRecifeInput } from '../../utils/recifeTime.ts';
import { WingHeartLogo } from '../layout/WingHeartLogo.tsx';

import { PlacePicker } from './PlacePicker.tsx';

type MediaStatus = 'uploading' | 'done' | 'error';

interface MediaEntry {
  key: string;
  name: string;
  type: MediaType;
  status: MediaStatus;
  /** Caminho no bucket privado (preenchido quando status === 'done'). */
  path?: string;
  error?: string;
}

/**
 * Ícone do troféu: caminho no bucket depois do upload + pré-visualização. `local` = um
 * object URL criado aqui (a libertar); senão é o URL assinado que veio do backend.
 */
type TrophyIconState =
  | { status: 'none' }
  | { status: 'uploading' }
  | { status: 'done'; path: string; previewUrl: string; local: boolean }
  | { status: 'error'; error: string };

type RecurrenceUiMode = 'none' | 'count' | 'weekly' | 'range';

/** Rótulos dos dias da semana (índice = weekday do backend: 0 = segunda … 6 = domingo). */
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

/** Valores guardados para editar um evento (e o lugar dele, se tiver). */
export interface EventFormInitial {
  event: EventEditRead;
  place: EventRead | null;
}

interface EventFormProps {
  /** Editar não mexe na recorrência: cada data edita-se sozinha. */
  mode: 'create' | 'edit';
  initial?: EventFormInitial;
  submitLabel: string;
  submittingLabel: string;
  /** Mostrado depois de gravar, antes de a página navegar. */
  successMessage?: string;
  /** Grava; um erro lançado aqui aparece no topo do formulário. */
  onSubmit: (payload: EventCreate) => Promise<void>;
}

function fileName(path: string): string {
  return path.split('/').pop() ?? path;
}

function initialMedia(initial: EventFormInitial | undefined): MediaEntry[] {
  return (initial?.event.media ?? []).map((m) => ({
    key: m.media_url,
    name: fileName(m.media_url),
    type: m.type,
    status: 'done',
    path: m.media_url,
  }));
}

function initialTrophyIcon(initial: EventFormInitial | undefined): TrophyIconState {
  const trophy = initial?.event.trophy;
  if (!trophy?.icon_url) return { status: 'none' };
  return { status: 'done', path: trophy.icon_url, previewUrl: trophy.icon_preview_url ?? '', local: false };
}

/** O nome padrão ("Presença: <título>") não se guarda como personalizado: segue o título. */
function initialTrophyName(initial: EventFormInitial | undefined): string {
  const name = initial?.event.trophy?.name ?? '';
  return name === `Presença: ${initial?.event.title ?? ''}` ? '' : name;
}

/** Formulário de evento: o mesmo para criar e para editar. */
export function EventForm({
  mode,
  initial,
  submitLabel,
  submittingLabel,
  successMessage,
  onSubmit,
}: EventFormProps) {
  const { user } = useAuth();
  const { effectiveLat, effectiveLng } = useEffectiveGeo();
  const stored = initial?.event;

  const [title, setTitle] = useState(stored?.title ?? '');
  const [description, setDescription] = useState(stored?.description ?? '');
  const [category, setCategory] = useState<EventCategory | ''>(
    EVENT_CATEGORIES.find((c) => c.slug === stored?.category)?.slug ?? '',
  );
  const [place, setPlace] = useState<EventRead | null>(initial?.place ?? null);
  const [address, setAddress] = useState(stored?.location_name ?? '');
  // Início e fim obrigatórios; o check-in abre no início se não for programado.
  const [startsAt, setStartsAt] = useState(isoToRecifeInput(stored?.event_date ?? null));
  const [endsAt, setEndsAt] = useState(isoToRecifeInput(stored?.ends_at ?? null));
  const [checkinOpensAt, setCheckinOpensAt] = useState(() => {
    const opens = isoToRecifeInput(stored?.checkin_opens_at ?? null);
    // Abrir no início é o padrão: não se mostra como hora programada.
    return opens && opens !== isoToRecifeInput(stored?.event_date ?? null) ? opens : '';
  });
  const [price, setPrice] = useState(stored?.price ?? '');
  // Lotação é opt-in: um evento sem limite continua a ser o caso por omissão.
  const [limitPeople, setLimitPeople] = useState(stored?.capacity != null);
  const [capacity, setCapacity] = useState(String(stored?.capacity ?? 20));
  const [waitlistEnabled, setWaitlistEnabled] = useState(stored?.waitlist_enabled ?? true);
  const [callTtl, setCallTtl] = useState(String(stored?.call_ttl_minutes ?? 10));
  const [autoCallNext, setAutoCallNext] = useState(stored?.auto_call_next ?? true);
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>(() => initialMedia(initial));
  const [dragOver, setDragOver] = useState(false);

  // Troféu do check-in (opcional): sem nada, o backend dá "Presença: <título>".
  const [trophyName, setTrophyName] = useState(() => initialTrophyName(initial));
  const [trophyDescription, setTrophyDescription] = useState(stored?.trophy?.description ?? '');
  const [trophyIcon, setTrophyIcon] = useState<TrophyIconState>(() => initialTrophyIcon(initial));
  const localPreviewUrl =
    trophyIcon.status === 'done' && trophyIcon.local ? trophyIcon.previewUrl : null;

  // Liberta a pré-visualização quando o ícone muda ou a página fecha.
  useEffect(() => {
    if (!localPreviewUrl) return;
    return () => URL.revokeObjectURL(localPreviewUrl);
  }, [localPreviewUrl]);

  // Um upload que acaba depois de a página fechar não cria nem guarda nada.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Recorrência (expandida em várias linhas de evento pelo backend).
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceUiMode>('none');
  const [countN, setCountN] = useState('4');
  const [countEvery, setCountEvery] = useState<'day' | 'week'>('week');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weeklyTime, setWeeklyTime] = useState('20:00');
  const [weeklyUntil, setWeeklyUntil] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeTime, setRangeTime] = useState('20:00');

  const toggleWeekday = (day: number) =>
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const buildRecurrence = (): EventRecurrence | null => {
    if (recurrenceMode === 'none') return null;
    if (recurrenceMode === 'count') {
      return { mode: 'count', every: countEvery, occurrences: Number(countN) };
    }
    if (recurrenceMode === 'weekly') {
      return {
        mode: 'weekly',
        weekdays: [...weekdays].sort((a, b) => a - b),
        time_of_day: weeklyTime,
        until: weeklyUntil,
      };
    }
    return { mode: 'range', start: rangeStart, end: rangeEnd, time_of_day: rangeTime };
  };

  // Coordenadas derivadas do endereço (geocodificação). Não são exibidas: vão
  // direto para o backend ao salvar.
  // A editar, a morada guardada já tem coordenadas: só se geocodifica se mudar.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    stored ? { lat: stored.lat, lng: stored.long } : null,
  );
  const [geocodedFor, setGeocodedFor] = useState<string | null>(stored?.location_name ?? null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(stored?.location_name ?? null);
  const [geocoding, setGeocoding] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const runGeocode = useCallback(async (query: string): Promise<GeocodeResult | null> => {
    const q = query.trim();
    if (!q) {
      setError('Informe um endereço.');
      return null;
    }
    setGeocoding(true);
    setError(null);
    try {
      const result = await geocodeAddress(q);
      if (!result) {
        setError('Endereço não encontrado. Tente ser mais específico (rua, número, cidade).');
        setCoords(null);
        setGeocodedFor(null);
        setResolvedLabel(null);
        return null;
      }
      setCoords({ lat: result.lat, lng: result.lng });
      setGeocodedFor(q);
      setResolvedLabel(result.displayName);
      return result;
    } catch {
      setError('Não foi possível verificar o endereço agora. Tente novamente.');
      return null;
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    setError(null);
    if (effectiveLat === null || effectiveLng === null) {
      setError('Não foi possível obter a sua localização. Digite o endereço manualmente.');
      return;
    }
    setGeocoding(true);
    try {
      const label = await reverseGeocode(effectiveLat, effectiveLng);
      const finalLabel = label ?? `${effectiveLat.toFixed(5)}, ${effectiveLng.toFixed(5)}`;
      setCoords({ lat: effectiveLat, lng: effectiveLng });
      setAddress(finalLabel);
      setGeocodedFor(finalLabel);
      setResolvedLabel(finalLabel);
    } catch {
      const finalLabel = `${effectiveLat.toFixed(5)}, ${effectiveLng.toFixed(5)}`;
      setCoords({ lat: effectiveLat, lng: effectiveLng });
      setAddress(finalLabel);
      setGeocodedFor(finalLabel);
      setResolvedLabel(finalLabel);
    } finally {
      setGeocoding(false);
    }
  }, [effectiveLat, effectiveLng]);

  // Um lugar do Flyer traz a morada e as coordenadas: não é preciso geocodificar.
  const choosePlace = (chosen: EventRead | null) => {
    setPlace(chosen);
    if (!chosen) return;
    const label = chosen.location_name ?? chosen.title;
    setAddress(label);
    setCoords({ lat: chosen.lat, lng: chosen.long });
    setGeocodedFor(label);
    setResolvedLabel(label);
    if (!category && chosen.category) {
      const match = EVENT_CATEGORIES.find((c) => c.slug === chosen.category);
      if (match) setCategory(match.slug);
    }
  };

  const removeMedia = (key: string) =>
    setMediaEntries((prev) => prev.filter((m) => m.key !== key));

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const userId = user?.id;
      if (!userId) {
        setError('Faça login novamente para enviar mídias.');
        return;
      }
      for (const file of Array.from(files)) {
        const key = crypto.randomUUID();
        const guessed: MediaType = file.type.startsWith('video/') ? 'video' : 'image';
        setMediaEntries((prev) => [
          ...prev,
          { key, name: file.name, type: guessed, status: 'uploading' },
        ]);
        try {
          const { path, type } = await uploadEventMedia(userId, file);
          setMediaEntries((prev) =>
            prev.map((m) => (m.key === key ? { ...m, status: 'done', path, type } : m)),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Falha no upload.';
          setMediaEntries((prev) =>
            prev.map((m) => (m.key === key ? { ...m, status: 'error', error: message } : m)),
          );
        }
      }
    },
    [user?.id],
  );

  const handleTrophyIcon = async (file: File) => {
    const userId = user?.id;
    if (!userId) {
      setTrophyIcon({ status: 'error', error: 'Faça login novamente para enviar o ícone.' });
      return;
    }
    setTrophyIcon({ status: 'uploading' });
    try {
      const path = await uploadTrophyIcon(userId, file);
      if (!mounted.current) return;
      setTrophyIcon({ status: 'done', path, previewUrl: URL.createObjectURL(file), local: true });
    } catch (err) {
      if (!mounted.current) return;
      setTrophyIcon({
        status: 'error',
        error: err instanceof Error ? err.message : 'Falha no envio do ícone.',
      });
    }
  };

  const buildTrophy = (): TrophyCustomization | null => {
    const name = trophyName.trim() || null;
    const trophyText = trophyDescription.trim() || null;
    const iconPath = trophyIcon.status === 'done' ? trophyIcon.path : null;
    if (!name && !trophyText && !iconPath) return null;
    return { name, description: trophyText, icon_url: iconPath };
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setError('Informe um endereço para o evento.');
      return;
    }
    // Os <input type="datetime-local"> dão "AAAA-MM-DDTHH:MM": a ordem do texto é a do tempo.
    if (!startsAt || !endsAt) {
      setError('Informe o início e o fim do evento.');
      return;
    }
    if (endsAt <= startsAt) {
      setError('O término precisa ser depois do início.');
      return;
    }
    if (checkinOpensAt && checkinOpensAt >= endsAt) {
      setError('O check-in precisa abrir antes do término do evento.');
      return;
    }

    // Reaproveita coords se já resolvidas para este endereço; senão geocodifica agora.
    let resolved: GeocodeResult | null;
    if (coords && geocodedFor === trimmedAddress) {
      resolved = { lat: coords.lat, lng: coords.lng, displayName: resolvedLabel ?? trimmedAddress };
    } else {
      resolved = await runGeocode(trimmedAddress);
    }
    if (!resolved) return;

    const media: EventMediaCreate[] = mediaEntries
      .filter((m): m is MediaEntry & { path: string } => m.status === 'done' && !!m.path)
      .map((m, idx) => ({
        media_url: m.path,
        type: m.type,
        order_index: idx,
      }));

    const recurrence = mode === 'create' ? buildRecurrence() : null;
    if (recurrence?.mode === 'count' && Number(countN) < 2) {
      setError('Para repetir N vezes, informe um número ≥ 2.');
      return;
    }
    if (recurrence?.mode === 'weekly' && (recurrence.weekdays?.length ?? 0) === 0) {
      setError('Selecione pelo menos um dia da semana.');
      return;
    }
    if (recurrence?.mode === 'weekly' && !weeklyUntil) {
      setError('Informe a data final da recorrência semanal.');
      return;
    }
    if (recurrence?.mode === 'range' && (!rangeStart || !rangeEnd)) {
      setError('Informe as datas de início e fim do intervalo.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: EventCreate = {
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        place_id: place?.id ?? null,
        location_name: resolved.displayName || trimmedAddress,
        lat: resolved.lat,
        long: resolved.lng,
        // Sem fuso: o backend lê-as como hora de Recife.
        event_date: startsAt,
        ends_at: endsAt,
        checkin_opens_at: checkinOpensAt || null,
        price: price.trim() || null,
        media,
        capacity: limitPeople && Number(capacity) > 0 ? Number(capacity) : null,
        waitlist_enabled: limitPeople ? waitlistEnabled : true,
        call_ttl_minutes: Number(callTtl) > 0 ? Number(callTtl) : 10,
        auto_call_next: autoCallNext,
        trophy: buildTrophy(),
      };
      // Editar não tem recorrência: nem a chave vai no pedido.
      if (mode === 'create') payload.recurrence = recurrence;
      await onSubmit(payload);
      if (successMessage && mounted.current) setSuccess(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  const uploadingMedia =
    mediaEntries.some((m) => m.status === 'uploading') || trophyIcon.status === 'uploading';
  const showConfirmation = resolvedLabel !== null && geocodedFor === address.trim();

  return (
    <>
      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800" role="alert">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-6 space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Título *
          </label>
          <input
            id="title"
            type="text"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
            maxLength={200}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descrição
          </label>
          <textarea
            id="description"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Categoria
          </label>
          <select
            id="category"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory | '')}
          >
            <option value="">Sem categoria</option>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="placeSearch" className="block text-sm font-medium text-gray-700">
            Lugar do Flyer (opcional)
          </label>
          <p className="text-xs text-gray-500">
            Se o evento acontece em um lugar que já está no Flyer, escolha o lugar: o evento aparece na página dele.
          </p>
          <PlacePicker
            near={{ lat: effectiveLat, lng: effectiveLng }}
            selected={place}
            onSelect={choosePlace}
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Endereço *
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="address"
              type="text"
              required
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Ex.: Avenida Paulista, 1578, São Paulo"
              maxLength={300}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                // Outra morada já não é o lugar escolhido.
                setPlace(null);
              }}
            />
            <button
              type="button"
              onClick={() => void runGeocode(address)}
              disabled={geocoding || !address.trim()}
              className="shrink-0 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {geocoding ? 'Verificando…' : 'Verificar'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleUseMyLocation()}
            disabled={geocoding}
            className="mt-2 text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
          >
            Usar minha localização
          </button>
          {showConfirmation && (
            <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
              📍 {resolvedLabel}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className="block text-sm font-medium text-gray-700">
              Início do evento *
            </label>
            <input
              id="startsAt"
              type="datetime-local"
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="endsAt" className="block text-sm font-medium text-gray-700">
              Fim do evento *
            </label>
            <input
              id="endsAt"
              type="datetime-local"
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="checkinOpensAt" className="block text-sm font-medium text-gray-700">
              Abrir check-in (opcional)
            </label>
            <input
              id="checkinOpensAt"
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              value={checkinOpensAt}
              onChange={(e) => setCheckinOpensAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Vazio = abre no início. Fecha sozinho no término; você também pode abrir ou fechar
              manualmente na página do evento.
            </p>
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Preço (R$)
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min={0}
              placeholder="Vazio = grátis"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <fieldset className="rounded-2xl border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">Lotação</legend>

          <label className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={limitPeople}
              onChange={(e) => setLimitPeople(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Limitar número de pessoas
          </label>

          {limitPeople && (
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="capacity"
                  className="block text-sm font-medium text-gray-700"
                >
                  Número máximo de pessoas
                </label>
                <input
                  id="capacity"
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={waitlistEnabled}
                  onChange={(e) => setWaitlistEnabled(e.target.checked)}
                  className="h-4 w-4 accent-red-600"
                />
                Lista de espera quando encher
              </label>

              {/* Sem fila não há ninguém para chamar, logo não há prazo a definir. */}
              {waitlistEnabled && (
                <>
                  <div>
                    <label
                      htmlFor="callTtl"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Minutos para aparecer depois de ser chamado
                    </label>
                    <input
                      id="callTtl"
                      type="number"
                      min={1}
                      max={240}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                      value={callTtl}
                      onChange={(e) => setCallTtl(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Passado o prazo a pessoa deixa de ocupar a vaga.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={autoCallNext}
                      onChange={(e) => setAutoCallNext(e.target.checked)}
                      className="h-4 w-4 accent-red-600"
                    />
                    Chamar o próximo automaticamente quando o prazo passar
                  </label>
                </>
              )}
            </div>
          )}
        </fieldset>

        <div>
          <p className="text-sm font-medium text-gray-700">Imagens e vídeos</p>
          <label
            htmlFor="media-input"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition-colors ${
              dragOver ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <UploadCloud className="h-10 w-10 text-gray-400" />
            <p className="mt-2 text-center text-sm text-gray-500">
              Arraste arquivos aqui ou clique para escolher (imagens ou vídeos).
            </p>
            <input
              id="media-input"
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          <div className="mt-4 space-y-2">
            {mediaEntries.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-gray-700">{entry.name}</span>
                {entry.status === 'uploading' && (
                  <span className="shrink-0 text-gray-400">Enviando…</span>
                )}
                {entry.status === 'done' && (
                  <span className="shrink-0 font-medium text-green-600">Enviado</span>
                )}
                {entry.status === 'error' && (
                  <span className="shrink-0 text-red-600">{entry.error ?? 'Erro'}</span>
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(entry.key)}
                  className="shrink-0 rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <fieldset className="rounded-2xl border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">
            Troféu do check-in (opcional)
          </legend>
          <p className="text-xs text-gray-500">
            {'Quem fizer check-in ganha este troféu. Sem personalização é "Presença: <título do evento>" com o ícone do Flyer.'}
          </p>

          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-50 to-white">
              {trophyIcon.status === 'done' ? (
                <img
                  src={trophyIcon.previewUrl}
                  alt="Pré-visualização do ícone"
                  className="h-16 w-16 rounded-2xl object-contain"
                />
              ) : (
                <WingHeartLogo className="h-12 w-12 text-red-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label htmlFor="trophy-icon" className="block text-sm font-medium text-gray-700">
                Ícone do troféu
              </label>
              <input
                id="trophy-icon"
                type="file"
                accept={TROPHY_ICON_ACCEPT}
                disabled={trophyIcon.status === 'uploading'}
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-xl file:border-0 file:bg-red-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-red-700 hover:file:bg-red-100 disabled:opacity-60"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleTrophyIcon(file);
                  e.target.value = '';
                }}
              />
              <p className="mt-1 text-xs text-gray-500">PNG, JPG, WebP ou GIF, de preferência quadrada.</p>
              {trophyIcon.status === 'uploading' && (
                <p className="mt-1 text-sm text-gray-400">Enviando o ícone…</p>
              )}
              {trophyIcon.status === 'error' && (
                <p className="mt-1 text-sm text-red-600">{trophyIcon.error}</p>
              )}
              {trophyIcon.status === 'done' && (
                <button
                  type="button"
                  onClick={() => setTrophyIcon({ status: 'none' })}
                  className="mt-2 inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  aria-label="Remover ícone"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="trophy-name" className="block text-sm font-medium text-gray-700">
              Nome do troféu
            </label>
            <input
              id="trophy-name"
              type="text"
              maxLength={80}
              placeholder={`Presença: ${title.trim() || 'título do evento'}`}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              value={trophyName}
              onChange={(e) => setTrophyName(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="trophy-description" className="block text-sm font-medium text-gray-700">
              Descrição do troféu
            </label>
            <textarea
              id="trophy-description"
              rows={2}
              maxLength={300}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              value={trophyDescription}
              onChange={(e) => setTrophyDescription(e.target.value)}
            />
          </div>
        </fieldset>

        {mode === 'create' && (
          <div>
            <p className="text-sm font-medium text-gray-700">Recorrência</p>
            <p className="mt-1 text-xs text-gray-500">
              Cada data mantém a duração (início → fim) e a antecedência da abertura do check-in.
            </p>
            <div className="mt-2 space-y-2">
              {(
                [
                  ['none', 'Não repetir'],
                  ['count', 'Repetir N vezes'],
                  ['weekly', 'Semanal'],
                  ['range', 'Intervalo de datas'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="recurrence-mode"
                    value={value}
                    checked={recurrenceMode === value}
                    onChange={() => setRecurrenceMode(value)}
                    className="accent-red-600"
                  />
                  {label}
                </label>
              ))}
            </div>

            {recurrenceMode === 'count' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="count-n" className="block text-sm text-gray-600">
                    Número de repetições
                  </label>
                  <input
                    id="count-n"
                    type="number"
                    min={2}
                    max={60}
                    value={countN}
                    onChange={(e) => setCountN(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="count-every" className="block text-sm text-gray-600">
                    Frequência
                  </label>
                  <select
                    id="count-every"
                    value={countEvery}
                    onChange={(e) => setCountEvery(e.target.value as 'day' | 'week')}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  >
                    <option value="day">Diária</option>
                    <option value="week">Semanal</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 sm:col-span-2">
                  Começa na “Data do evento” informada acima.
                </p>
              </div>
            )}

            {recurrenceMode === 'weekly' && (
              <div className="mt-3 space-y-3">
                <div>
                  <span className="block text-sm text-gray-600">Dias da semana</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {WEEKDAY_LABELS.map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleWeekday(idx)}
                        aria-pressed={weekdays.includes(idx)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          weekdays.includes(idx)
                            ? 'border-red-600 bg-red-600 text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="weekly-time" className="block text-sm text-gray-600">
                      Hora
                    </label>
                    <input
                      id="weekly-time"
                      type="time"
                      value={weeklyTime}
                      onChange={(e) => setWeeklyTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="weekly-until" className="block text-sm text-gray-600">
                      Repetir até
                    </label>
                    <input
                      id="weekly-until"
                      type="date"
                      value={weeklyUntil}
                      onChange={(e) => setWeeklyUntil(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {recurrenceMode === 'range' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="range-start" className="block text-sm text-gray-600">
                    Início
                  </label>
                  <input
                    id="range-start"
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="range-end" className="block text-sm text-gray-600">
                    Fim
                  </label>
                  <input
                    id="range-end"
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="range-time" className="block text-sm text-gray-600">
                    Hora
                  </label>
                  <input
                    id="range-time"
                    type="time"
                    value={rangeTime}
                    onChange={(e) => setRangeTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || geocoding || uploadingMedia || !title.trim() || !address.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? (
            submittingLabel
          ) : (
            <>
              {mode === 'create' ? <Plus className="h-5 w-5" /> : <Save className="h-5 w-5" />}
              {submitLabel}
            </>
          )}
        </button>
      </form>
    </>
  );
}
