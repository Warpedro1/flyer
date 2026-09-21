import { Plus, Trash2, UploadCloud } from 'lucide-react';
import { type DragEvent, type FormEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth.ts';
import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import { createEvent } from '../services/flyerApi.ts';
import { uploadEventMedia } from '../services/storage.ts';
import type { EventMediaCreate, EventRecurrence, MediaType } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import { type GeocodeResult, geocodeAddress, reverseGeocode } from '../utils/geocode.ts';

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

type RecurrenceUiMode = 'none' | 'count' | 'weekly' | 'range';

/** Rótulos dos dias da semana (índice = weekday do backend: 0 = segunda … 6 = domingo). */
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { effectiveLat, effectiveLng } = useEffectiveGeo();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [price, setPrice] = useState('');
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);

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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodedFor, setGeocodedFor] = useState<string | null>(null);
  const [resolvedLabel, setResolvedLabel] = useState<string | null>(null);
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

    const recurrence = buildRecurrence();
    if (recurrence?.mode === 'count' && (!eventDate || Number(countN) < 2)) {
      setError('Para repetir N vezes, informe a data do evento e um número ≥ 2.');
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
      await createEvent({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        location_name: resolved.displayName || trimmedAddress,
        lat: resolved.lat,
        long: resolved.lng,
        event_date: eventDate || null,
        price: price.trim() || null,
        media,
        recurrence,
      });
      setSuccess(true);
      setTimeout(() => void navigate('/events'), 1200);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadingMedia = mediaEntries.some((m) => m.status === 'uploading');
  const showConfirmation = resolvedLabel !== null && geocodedFor === address.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 md:pb-8">
      <h1 className="text-2xl font-bold text-gray-900">Criar evento</h1>
      <p className="mt-1 text-sm text-gray-500">Preenche os dados e publica um novo evento.</p>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800" role="alert">
          Evento criado com sucesso! A redirecionar...
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
          <input
            id="category"
            type="text"
            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
            maxLength={100}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
              onChange={(e) => setAddress(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void runGeocode(address)}
              disabled={geocoding || !address.trim()}
              className="shrink-0 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {geocoding ? 'A verificar…' : 'Verificar'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleUseMyLocation()}
            disabled={geocoding}
            className="mt-2 text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
          >
            Usar a minha localização
          </button>
          {showConfirmation && (
            <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
              📍 {resolvedLabel}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">
              Data do evento
            </label>
            <input
              id="eventDate"
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Preço (€)
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
                  <span className="shrink-0 text-gray-400">A enviar…</span>
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

        <div>
          <p className="text-sm font-medium text-gray-700">Recorrência</p>
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

        <button
          type="submit"
          disabled={submitting || geocoding || uploadingMedia || !title.trim() || !address.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? (
            'A criar…'
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Criar evento
            </>
          )}
        </button>
      </form>
    </div>
  );
}
