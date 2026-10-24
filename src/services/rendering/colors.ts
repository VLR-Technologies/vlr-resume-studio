/** Contrast on the templates' white paper. Stored accent values remain lossless. */
export function whiteContrast(hex: string) {
  const channels = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance =
    0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
  return 1.05 / (luminance + 0.05);
}
export function documentAccent(template: {
  templateId: string;
  accentColor: string;
}) {
  return template.templateId === 'classic' ||
    whiteContrast(template.accentColor) < 4.5
    ? '#20242a'
    : template.accentColor;
}
