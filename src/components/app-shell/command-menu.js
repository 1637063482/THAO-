export function renderCommandMenu(host) {
  if (!host) throw new Error("App command menu host is required");
  host.innerHTML = `
    <div id="nav-secondary" class="nav-secondary-group">
      <div id="sync-status" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-sm font-medium">
        <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span></span>
        <span id="sync-status-text" data-i18n="loading"></span>
      </div>
      <button type="button" data-command="import" class="btn-ghost text-xs py-2" title="" data-i18n="import_label">
        <span data-icon="download" data-icon-class="w-4 h-4"></span>
        <span id="import-label-text" data-i18n="import_label"></span>
      </button>
      <input type="file" id="import-file" class="hidden" accept=".json" onchange="window.importData(event)">
      <button type="button" data-command="share" class="btn-ghost text-xs py-2" title="" data-i18n="share">
        <span data-icon="link" data-icon-class="w-4 h-4"></span>
        <span id="invite-label-text" data-i18n="share"></span>
      </button>
      <button type="button" data-command="export" class="btn-primary text-xs py-2">
        <span data-icon="download" data-icon-class="w-4 h-4"></span>
        <span id="export-label-text" data-i18n="export_csv"></span>
      </button>
    </div>
  `;
  return host;
}

export function bindCommandMenu(root = document) {
  const panel = root.getElementById("nav-secondary");
  const button = root.getElementById("nav-more-btn");
  if (!panel || !button) return () => {};

  function toggle(event) {
    event.stopPropagation();
    panel.classList.toggle("open");
  }

  function closeFromOutside(event) {
    if (!panel.classList.contains("open")) return;
    if (!panel.contains(event.target) && !button.contains(event.target)) {
      panel.classList.remove("open");
    }
  }

  button.addEventListener("click", toggle);
  root.addEventListener("click", closeFromOutside);

  return function unbindCommandMenu() {
    button.removeEventListener("click", toggle);
    root.removeEventListener("click", closeFromOutside);
  };
}
