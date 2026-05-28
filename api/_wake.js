let _restoreTriggered = false;

export function triggerRestore() {
  // Restore integration is disabled in this project clean-up.
  if (_restoreTriggered) return;
  _restoreTriggered = true;
  setTimeout(() => { _restoreTriggered = false; }, 60000);
}
