let observers = 0;
let activation: HTMLElement | null = null;
function remember(event: Event) {
  const target =
    event.target instanceof Element
      ? event.target.closest('button, a, input, select, textarea')
      : null;
  if (target instanceof HTMLElement) activation = target;
}
/** Safari does not focus clicked buttons. Track activation rather than assuming activeElement is the opener. */
export function observeDialogOpeners() {
  if (observers++ === 0) {
    document.addEventListener('click', remember, true);
    document.addEventListener('change', remember, true);
  }
  return () => {
    if (--observers === 0) {
      document.removeEventListener('click', remember, true);
      document.removeEventListener('change', remember, true);
      activation = null;
    }
  };
}
export function dialogOpener() {
  return activation?.isConnected
    ? activation
    : document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
}
