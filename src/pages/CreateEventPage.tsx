import { Image as ImageIcon, Plus, Trash2, UploadCloud } from 'lucide-react';
import { type DragEvent, type FormEvent, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useEffectiveGeo } from '../hooks/useEffectiveGeo.ts';
import { createEvent } from '../services/flyerApi.ts';
import type { EventMediaCreate, MediaType } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';

interface MediaEntry {
  key: string;
  url: string;
  type: MediaType;
}

function newMediaEntry(): MediaEntry {
  return { key: crypto.randomUUID(), url: '', type: 'image' };
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const { effectiveLat, effectiveLng } = useEffectiveGeo();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<string>(effectiveLat?.toString() ?? '');
  const [lng, setLng] = useState<string>(effectiveLng?.toString() ?? '');
  const [eventDate, setEventDate] = useState('');
  const [price, setPrice] = useState('');
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fillGeo = useCallback(() => {
    if (effectiveLat !== null) setLat(effectiveLat.toString());
    if (effectiveLng !== null) setLng(effectiveLng.toString());
  }, [effectiveLat, effectiveLng]);

  const addMedia = () => setMediaEntries((prev) => [...prev, newMediaEntry()]);

  const removeMedia = (key: string) =>
    setMediaEntries((prev) => prev.filter((m) => m.key !== key));

  const updateMedia = (key: string, field: 'url' | 'type', value: string) =>
    setMediaEntries((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m)),
    );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (text?.trim().startsWith('http')) {
      setMediaEntries((prev) => [...prev, { ...newMediaEntry(), url: text.trim() }]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError('Latitude e longitude devem ser números válidos.');
      return;
    }

    const media: EventMediaCreate[] = mediaEntries
      .filter((m) => m.url.trim())
      .map((m, idx) => ({
        media_url: m.url.trim(),
        type: m.type,
        order_index: idx,
      }));

    setSubmitting(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        location_name: locationName.trim() || null,
        lat: latNum,
        long: lngNum,
        event_date: eventDate || null,
        price: price.trim() || null,
        media,
      });
      setSuccess(true);
      setTimeout(() => void navigate('/events'), 1200);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

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

        <div className="grid gap-4 sm:grid-cols-2">
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
            <label htmlFor="locationName" className="block text-sm font-medium text-gray-700">
              Local
            </label>
            <input
              id="locationName"
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              maxLength={200}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="lat" className="block text-sm font-medium text-gray-700">
              Latitude *
            </label>
            <input
              id="lat"
              type="number"
              step="any"
              min={-90}
              max={90}
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="lng" className="block text-sm font-medium text-gray-700">
              Longitude *
            </label>
            <input
              id="lng"
              type="number"
              step="any"
              min={-180}
              max={180}
              required
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={fillGeo}
              className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Usar a minha posição
            </button>
          </div>
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
          <p className="text-sm font-medium text-gray-700">Média (URLs)</p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition-colors ${
              dragOver ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <UploadCloud className="h-10 w-10 text-gray-400" />
            <p className="mt-2 text-center text-sm text-gray-500">
              Arrasta links de imagem/vídeo ou adiciona manualmente abaixo.
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {mediaEntries.map((entry) => (
              <div key={entry.key} className="flex gap-2">
                <input
                  type="url"
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="https://…"
                  value={entry.url}
                  onChange={(e) => updateMedia(entry.key, 'url', e.target.value)}
                />
                <select
                  className="rounded-xl border border-gray-200 px-2 text-sm"
                  value={entry.type}
                  onChange={(e) =>
                    updateMedia(entry.key, 'type', e.target.value as MediaType)
                  }
                >
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeMedia(entry.key)}
                  className="rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addMedia}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <ImageIcon className="h-4 w-4" />
            Adicionar média
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting || !title.trim()}
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
