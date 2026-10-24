export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive through the browser's download dispatch, then release it.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function downloadText(
  text: string,
  filename: string,
  type = 'application/json',
) {
  downloadBlob(new Blob([text], { type }), filename);
}
