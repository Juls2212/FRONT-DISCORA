function readSynchsafeInteger(bytes: Uint8Array): number {
  return (bytes[0] << 21) | (bytes[1] << 14) | (bytes[2] << 7) | bytes[3];
}

function getTextDecoder(encodingByte: number): TextDecoder {
  if (encodingByte === 1 || encodingByte === 2) {
    return new TextDecoder('utf-16');
  }

  return new TextDecoder('iso-8859-1');
}

function arrayBufferToDataUrl(buffer: Uint8Array, mimeType: string): string {
  let binary = '';

  for (let index = 0; index < buffer.length; index += 1) {
    binary += String.fromCharCode(buffer[index]);
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}

export async function extractEmbeddedCover(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (bytes.length < 10 || String.fromCharCode(...bytes.slice(0, 3)) !== 'ID3') {
    return null;
  }

  const version = bytes[3];
  const tagSize = readSynchsafeInteger(bytes.slice(6, 10));
  let offset = 10;
  const end = Math.min(bytes.length, tagSize + 10);

  while (offset + 10 <= end) {
    const frameId = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const frameSize =
      version === 4
        ? readSynchsafeInteger(bytes.slice(offset + 4, offset + 8))
        : (bytes[offset + 4] << 24) |
          (bytes[offset + 5] << 16) |
          (bytes[offset + 6] << 8) |
          bytes[offset + 7];

    if (!frameId.trim() || frameSize <= 0) {
      break;
    }

    const frameStart = offset + 10;
    const frameEnd = frameStart + frameSize;

    if (frameEnd > bytes.length) {
      break;
    }

    if (frameId === 'APIC') {
      const frameBytes = bytes.slice(frameStart, frameEnd);
      const encoding = frameBytes[0];
      let cursor = 1;

      while (cursor < frameBytes.length && frameBytes[cursor] !== 0) {
        cursor += 1;
      }

      const mimeType = new TextDecoder('iso-8859-1').decode(frameBytes.slice(1, cursor)) || 'image/jpeg';
      cursor += 1;

      if (cursor >= frameBytes.length) {
        return null;
      }

      cursor += 1;
      const decoder = getTextDecoder(encoding);
      const separatorLength = encoding === 0 || encoding === 3 ? 1 : 2;

      while (cursor + separatorLength <= frameBytes.length) {
        const slice = frameBytes.slice(cursor, cursor + separatorLength);
        const isEnd = slice.every((value) => value === 0);

        if (isEnd) {
          cursor += separatorLength;
          break;
        }

        cursor += 1;
      }

      const imageBytes = frameBytes.slice(cursor);

      if (!imageBytes.length) {
        return null;
      }

      decoder.decode(frameBytes.slice(0, Math.max(0, cursor - imageBytes.length)));
      return arrayBufferToDataUrl(imageBytes, mimeType);
    }

    offset = frameEnd;
  }

  return null;
}

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('No se pudo leer la imagen.'));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('No se pudo leer la imagen.'));
    };

    reader.readAsDataURL(file);
  });
}
