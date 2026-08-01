function runCommand(element, dependencies) {
  var command = element.getAttribute("data-command");
  if (command === "import") dependencies.importFile?.();
  if (command === "export") dependencies.exportData?.();
  if (command === "share") dependencies.share?.();
  if (command === "language") dependencies.setLanguage?.(element.getAttribute("data-locale"));
  if (command === "theme") dependencies.toggleTheme?.();
  if (command === "privacy") dependencies.togglePrivacy?.();
  if (command === "logout") dependencies.logout?.();
}

export function bindCommands(root, dependencies) {
  root.querySelectorAll("[data-command]").forEach(function (element) {
    element.addEventListener("click", function () {
      runCommand(element, dependencies);
    });
    element.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        element.click();
      }
    });
  });
}
