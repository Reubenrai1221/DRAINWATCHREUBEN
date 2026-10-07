// Photo safeguards for drain check-ins.
//
// 1. Reject files that aren't images or are too big.
// 2. Redraw the image onto a canvas and export a fresh JPEG. The new file
//    contains only pixels, so EXIF metadata (GPS location, phone model,
//    timestamps) from the original photo is dropped.
// 3. Shrink large photos so uploads are fast on mobile data.

export const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_DIMENSION = 1600; // px on the longest side

export async function cleanPhoto(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image. Please choose a photo.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That photo is over 10 MB. Please choose a smaller one.');
  }

  let bitmap;
  try {
    // "from-image" applies the phone's rotation before the metadata is dropped.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error("We couldn't read that photo. Try a JPEG or PNG.");
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error('Something went wrong processing that photo.');
  return blob;
}
