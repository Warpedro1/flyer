import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AVATAR_SIZE, resizeToSquare } from './resizeImage.ts';

const drawImage = vi.fn();
const close = vi.fn();
let encodes: string[] = [];
let produced: string[] = [];

beforeEach(() => {
  drawImage.mockReset();
  close.mockReset();
  encodes = [];
  produced = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(
    this: HTMLCanvasElement,
    callback: BlobCallback,
    type?: string,
  ) {
    encodes.push(type ?? '');
    // O Safari não gera WebP: devolve PNG quando o pedem.
    const out = produced.length === 0 && type === 'image/webp' && webpUnsupported ? 'image/png' : (type ?? 'image/png');
    produced.push(out);
    callback(new Blob([new Uint8Array([1])], { type: out }));
  });
});

let webpUnsupported = false;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  webpUnsupported = false;
});

function bitmap(width: number, height: number) {
  return vi.fn().mockResolvedValue({ width, height, close });
}

describe('resizeToSquare', () => {
  it('recorta o centro de uma foto deitada e reduz para 512×512 em WebP', async () => {
    const create = bitmap(4000, 3000);
    vi.stubGlobal('createImageBitmap', create);
    const file = new File([new Uint8Array([1])], 'foto.jpg', { type: 'image/jpeg' });

    const out = await resizeToSquare(file);

    expect(create).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' });
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 500, 0, 3000, 3000, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    expect(out.type).toBe('image/webp');
    expect(close).toHaveBeenCalled();
  });

  it('não aumenta uma foto pequena', async () => {
    vi.stubGlobal('createImageBitmap', bitmap(200, 300));

    await resizeToSquare(new Blob([new Uint8Array([1])], { type: 'image/png' }));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 50, 200, 200, 0, 0, 200, 200);
  });

  it('usa JPEG quando o navegador não gera WebP', async () => {
    webpUnsupported = true;
    vi.stubGlobal('createImageBitmap', bitmap(600, 600));

    const out = await resizeToSquare(new Blob([new Uint8Array([1])], { type: 'image/png' }));

    expect(encodes).toEqual(['image/webp', 'image/jpeg']);
    expect(out.type).toBe('image/jpeg');
  });

  it('diz em pt-BR quando não consegue abrir a imagem', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')));

    await expect(resizeToSquare(new Blob(['x'], { type: 'image/heic' }))).rejects.toThrow(
      'Não conseguimos abrir esta imagem. Envie uma foto em JPG, PNG ou WEBP.',
    );
  });
});
