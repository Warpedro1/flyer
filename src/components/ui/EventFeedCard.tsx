import { Calendar, MapPin, Star } from 'lucide-react';

import type { EventRead } from '../../types/index.ts';
import { categoryLabel } from '../../utils/categories.ts';
import {
  eventPriceText,
  formatEventDate,
  formatRating,
  pickCoverImage,
  PLACEHOLDER_IMAGE,
  showPlaceholder,
} from '../../utils/eventFormatters.ts';

export interface EventFeedCardProps {
  event: EventRead;
  onOpen?: () => void;
  footer?: React.ReactNode;
}

export function EventFeedCard({ event, onOpen, footer }: EventFeedCardProps) {
  const cover = pickCoverImage(event) ?? PLACEHOLDER_IMAGE;
  const priceText = eventPriceText(event);
  const { date: dateLabel } = formatEventDate(event.event_date);
  const isPlace = event.kind === 'place';
  const category = categoryLabel(event.category);

  return (
    <div
      className={`group relative h-80 w-full overflow-hidden rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        onOpen ? 'cursor-pointer' : ''
      }`}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <img
        // As imagens do Google recusam alguns pedidos com referrer de outro site. Antes
        // do src: o browser começa a descarregar assim que o src é aplicado.
        referrerPolicy="no-referrer"
        loading="lazy"
        src={cover}
        alt=""
        onError={showPlaceholder}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/30 to-transparent" />
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur-md ${
            isPlace ? 'bg-gray-900/80 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {isPlace ? 'Lugar' : 'Evento'}
        </span>
        {category && (
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-red-600 shadow-sm backdrop-blur-md">
            {category}
          </span>
        )}
      </div>
      <div className="absolute bottom-0 w-full p-5 text-white">
        <h3 className="mb-1 text-xl font-bold leading-tight transition-colors group-hover:text-red-400">
          {event.title}
        </h3>
        {event.description && (
          <p className="mb-3 line-clamp-2 text-xs text-gray-300">{event.description}</p>
        )}
        <div className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-3 text-xs text-gray-200">
            {isPlace ? (
              <>
                {event.rating !== null && (
                  <span className="flex items-center">
                    <Star className="mr-1 h-3.5 w-3.5 text-red-400" />
                    {formatRating(event.rating)}
                  </span>
                )}
                {event.location_name && (
                  <span className="flex min-w-0 items-center">
                    <MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-red-400" />
                    <span className="truncate">{event.location_name}</span>
                  </span>
                )}
              </>
            ) : (
              <span className="flex items-center">
                <Calendar className="mr-1.5 h-3.5 w-3.5 text-red-400" />
                {dateLabel}
              </span>
            )}
            {priceText && <span className="shrink-0 text-red-300">{priceText}</span>}
          </div>
        </div>
        {footer && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
