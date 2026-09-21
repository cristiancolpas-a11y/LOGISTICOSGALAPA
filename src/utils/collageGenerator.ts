/**
 * collageGenerator.ts
 * Generador de collage de alta fidelidad (1 a 4 imágenes) para evidencias Safety.
 * 
 * Reglas:
 * 1. 1 foto  -> La imagen completa original (sin collage).
 * 2. 2 fotos -> 2 columnas lado a lado (50% / 50%).
 * 3. 3 fotos -> 1 foto grande superior (ancho completo) y 2 fotos lado a lado inferiores.
 * 4. 4 fotos -> Cuadrícula 2x2.
 * 
 * Calidad y fidelidad:
 * - NO recorta (crop) fotos: usa 'contain' preservando la relación de aspecto original de cada una.
 * - Espacios sobrantes en la celda se rellenan con fondo neutro/blanco limpio (#FFFFFF).
 * - Mantiene la resolución nativa sin compresión destructiva (JPEG 0.95 de alta definición).
 * - Margen/separador sutil entre imágenes para distinción visual nítida.
 */

export interface CollageImageItem {
  id: string;
  file?: File;
  dataUrl: string;
  name: string;
  sizeBytes?: number;
}

export interface CollageResult {
  blob: Blob;
  dataUrl: string;
  base64Data: string; // Base64 sin prefijo "data:image/jpeg;base64," para transmisión limpia
  file: File;
  photoCount: number;
  width: number;
  height: number;
  layoutDescription: string;
}

/**
 * Carga un elemento de imagen HTML desde un dataURL o blob URL y espera su resolución nativa.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for remote URLs; never for data: or blob: URIs
    if (src.startsWith('http://') || src.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error('La imagen cargada tiene dimensiones inválidas.'));
        return;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('No fue posible cargar la imagen seleccionada.'));
    img.src = src;
  });
}

/**
 * Dibuja una imagen centrada dentro de una celda con comportamiento 'contain' (sin recortar contenido).
 */
function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number,
  cellIndex: number,
  totalCount: number
) {
  // Fondo de la celda en blanco puro
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cellX, cellY, cellW, cellH);

  const scale = Math.min(cellW / img.naturalWidth, cellH / img.naturalHeight);
  const drawW = Math.round(img.naturalWidth * scale);
  const drawH = Math.round(img.naturalHeight * scale);
  const drawX = Math.round(cellX + (cellW - drawW) / 2);
  const drawY = Math.round(cellY + (cellH - drawH) / 2);

  // Sombra suave en la foto interna para contraste
  ctx.save();
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  // Borde sutil alrededor de la foto si tiene áreas blancas
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(drawX, drawY, drawW, drawH);

  // Etiqueta numerada discreta en esquina superior izquierda si son múltiples fotos
  if (totalCount > 1) {
    const badgeText = `Foto ${cellIndex + 1}`;
    const badgePadX = 8;
    const badgeH = 22;
    ctx.font = 'bold 12px sans-serif';
    const textW = ctx.measureText(badgeText).width;
    const badgeW = textW + badgePadX * 2;
    const badgeX = cellX + 10;
    const badgeY = cellY + 10;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // slate-900 translúcido
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgeH / 2);
  }

  ctx.restore();
}

/**
 * Genera el collage en un HTML5 Canvas a resolución completa según la cantidad (1 a 4).
 */
export async function generateEvidenceCollage(
  items: CollageImageItem[],
  customFileName?: string
): Promise<CollageResult> {
  const count = Math.min(items.length, 4);
  if (count === 0) {
    throw new Error('Debe proporcionar al menos una imagen para generar la evidencia.');
  }

  // Cargar todas las imágenes de forma paralela
  const loadedImages = await Promise.all(
    items.slice(0, count).map((item) => loadImage(item.dataUrl))
  );

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo gráfico Canvas 2D.');
  }

  // Configuración de lienzo y distribución
  let totalWidth = 0;
  let totalHeight = 0;
  let layoutDescription = '';
  const MAX_CANVAS_DIM = 3840; // 4K Ultra HD límite óptico para evitar desbordes de memoria en base64

  if (count === 1) {
    // 1 FOTO: Imagen completa en resolución nativa, sin collage
    const img0 = loadedImages[0];
    let w = img0.naturalWidth;
    let h = img0.naturalHeight;
    if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
      const factor = Math.min(MAX_CANVAS_DIM / w, MAX_CANVAS_DIM / h);
      w = Math.round(w * factor);
      h = Math.round(h * factor);
    }
    totalWidth = w;
    totalHeight = h;
    layoutDescription = '1 foto individual (resolución nativa)';

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    drawContainedImage(ctx, img0, 0, 0, totalWidth, totalHeight, 0, 1);

  } else if (count === 2) {
    // 2 FOTOS: Dos columnas lado a lado (50% / 50%)
    const img0 = loadedImages[0];
    const img1 = loadedImages[1];

    let cellW = Math.max(img0.naturalWidth, img1.naturalWidth);
    let cellH = Math.max(img0.naturalHeight, img1.naturalHeight);
    let gap = Math.max(12, Math.round(Math.min(cellW, cellH) * 0.015));

    let tentativeW = cellW * 2 + gap;
    let tentativeH = cellH;
    if (tentativeW > MAX_CANVAS_DIM || tentativeH > MAX_CANVAS_DIM) {
      const factor = Math.min(MAX_CANVAS_DIM / tentativeW, MAX_CANVAS_DIM / tentativeH);
      cellW = Math.round(cellW * factor);
      cellH = Math.round(cellH * factor);
      gap = Math.max(8, Math.round(gap * factor));
    }

    totalWidth = cellW * 2 + gap;
    totalHeight = cellH;
    layoutDescription = 'Collage 2 fotos (dos columnas lado a lado 50%/50%)';

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Fondo general separador
    ctx.fillStyle = '#E2E8F0'; // Línea divisoria neutral
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Celda 1 (Izquierda)
    drawContainedImage(ctx, img0, 0, 0, cellW, cellH, 0, 2);

    // Celda 2 (Derecha)
    drawContainedImage(ctx, img1, cellW + gap, 0, cellW, cellH, 1, 2);

  } else if (count === 3) {
    // 3 FOTOS: 1 foto superior grande (ancho completo) y 2 inferiores lado a lado
    const img0 = loadedImages[0];
    const img1 = loadedImages[1];
    const img2 = loadedImages[2];

    let cellW_bot = Math.max(img1.naturalWidth, img2.naturalWidth);
    let cellH_bot = Math.max(img1.naturalHeight, img2.naturalHeight);
    let gap = Math.max(12, Math.round(Math.min(cellW_bot, cellH_bot) * 0.015));

    let tentativeW = cellW_bot * 2 + gap;
    const ratio0 = img0.naturalHeight / img0.naturalWidth;
    let computedH0 = Math.round(tentativeW * ratio0);
    let cellH_top = Math.max(img0.naturalHeight, Math.min(computedH0, cellH_bot * 1.5));
    let tentativeH = cellH_top + gap + cellH_bot;

    if (tentativeW > MAX_CANVAS_DIM || tentativeH > MAX_CANVAS_DIM) {
      const factor = Math.min(MAX_CANVAS_DIM / tentativeW, MAX_CANVAS_DIM / tentativeH);
      cellW_bot = Math.round(cellW_bot * factor);
      cellH_bot = Math.round(cellH_bot * factor);
      cellH_top = Math.round(cellH_top * factor);
      gap = Math.max(8, Math.round(gap * factor));
    }

    totalWidth = cellW_bot * 2 + gap;
    totalHeight = cellH_top + gap + cellH_bot;
    layoutDescription = 'Collage 3 fotos (1 superior destacada + 2 inferiores lado a lado)';

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Fondo general separador
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Celda 1 (Superior ancho completo)
    drawContainedImage(ctx, img0, 0, 0, totalWidth, cellH_top, 0, 3);

    // Celda 2 (Inferior izquierda)
    drawContainedImage(ctx, img1, 0, cellH_top + gap, cellW_bot, cellH_bot, 1, 3);

    // Celda 3 (Inferior derecha)
    drawContainedImage(ctx, img2, cellW_bot + gap, cellH_top + gap, cellW_bot, cellH_bot, 2, 3);

  } else {
    // 4 FOTOS: Cuadrícula 2x2
    let cellW = Math.max(...loadedImages.map((img) => img.naturalWidth));
    let cellH = Math.max(...loadedImages.map((img) => img.naturalHeight));
    let gap = Math.max(12, Math.round(Math.min(cellW, cellH) * 0.015));

    let tentativeW = cellW * 2 + gap;
    let tentativeH = cellH * 2 + gap;
    if (tentativeW > MAX_CANVAS_DIM || tentativeH > MAX_CANVAS_DIM) {
      const factor = Math.min(MAX_CANVAS_DIM / tentativeW, MAX_CANVAS_DIM / tentativeH);
      cellW = Math.round(cellW * factor);
      cellH = Math.round(cellH * factor);
      gap = Math.max(8, Math.round(gap * factor));
    }

    totalWidth = cellW * 2 + gap;
    totalHeight = cellH * 2 + gap;
    layoutDescription = 'Collage 4 fotos (cuadrícula 2x2)';

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Fondo general separador
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Celda 1 (Superior Izquierda)
    drawContainedImage(ctx, loadedImages[0], 0, 0, cellW, cellH, 0, 4);

    // Celda 2 (Superior Derecha)
    drawContainedImage(ctx, loadedImages[1], cellW + gap, 0, cellW, cellH, 1, 4);

    // Celda 3 (Inferior Izquierda)
    drawContainedImage(ctx, loadedImages[2], 0, cellH + gap, cellW, cellH, 2, 4);

    // Celda 4 (Inferior Derecha)
    drawContainedImage(ctx, loadedImages[3], cellW + gap, cellH + gap, cellW, cellH, 3, 4);
  }

  // Convertir canvas a Blob y dataUrl de alta definición (JPEG 0.90 para balance perfecto nitidez/peso)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Fallo al exportar el collage en formato de imagen.'));
          return;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        const base64Data = dataUrl.split(',')[1] || '';
        const name = customFileName || `evidencia_collage_${count}fotos_${Date.now()}.jpg`;
        const file = new File([blob], name, { type: 'image/jpeg' });

        resolve({
          blob,
          dataUrl,
          base64Data,
          file,
          photoCount: count,
          width: totalWidth,
          height: totalHeight,
          layoutDescription
        });
      },
      'image/jpeg',
      0.90
    );
  });
}
