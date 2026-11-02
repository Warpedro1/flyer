/** Lado da foto de perfil, em pixels (Warpedro1/flyer-back#24). */
export const AVATAR_SIZE = 512;

const OPEN_FAILED = 'Não conseguimos abrir esta imagem. Envie uma foto em JPG, PNG ou WEBP.';
const ENCODE_FAILED = 'Não conseguimos preparar esta foto. Tente outra imagem.';

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, 0.85);
  });
}

/**
 * Recorta o centro e reduz para um quadrado de até `size` px antes do envio. A imagem é
 * sempre recodificada, o que também tira os dados EXIF (como a localização do GPS). Sai
 * em WebP, ou em JPEG no navegador que não gera WebP (Safari).
 */
export async function resizeToSquare(file: Blob, size: number = AVATAR_SIZE): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error(OPEN_FAILED);
  }
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const out = Math.min(size, side);
    const canvas = document.createElement('canvas');
    canvas.width = out;
    canvas.height = out;
    const context = canvas.getContext('2d');
    if (!context || side <= 0) throw new Error(ENCODE_FAILED);
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
    const webp = await toBlob(canvas, 'image/webp');
    if (webp?.type === 'image/webp') return webp;
    const jpeg = await toBlob(canvas, 'image/jpeg');
    if (!jpeg) throw new Error(ENCODE_FAILED);
    return jpeg;
  } finally {
    bitmap.close();
  }
}
