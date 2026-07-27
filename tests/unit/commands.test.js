import { beforeEach, describe, expect, it, vi } from "vitest";

describe("commands", function () {
  beforeEach(function () {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  it("binds import, export, share, language, theme, and privacy commands without changing navigation", async function () {
    document.body.innerHTML = [
      '<button data-command="import"></button>',
      '<button data-command="export"></button>',
      '<button data-command="share"></button>',
      '<button data-command="language" data-locale="vi"></button>',
      '<button data-command="theme"></button>',
      '<button data-command="privacy"></button>',
    ].join("");
    var dependencies = {
      importFile: vi.fn(), exportData: vi.fn(), share: vi.fn(),
      setLanguage: vi.fn(), toggleTheme: vi.fn(), togglePrivacy: vi.fn(),
    };
    const { bindCommands } = await import("../../src/js/commands.js");
    bindCommands(document, dependencies);

    document.querySelectorAll("[data-command]").forEach(function (button) { button.click(); });

    expect(dependencies.importFile).toHaveBeenCalledOnce();
    expect(dependencies.exportData).toHaveBeenCalledOnce();
    expect(dependencies.share).toHaveBeenCalledOnce();
    expect(dependencies.setLanguage).toHaveBeenCalledWith("vi");
    expect(dependencies.toggleTheme).toHaveBeenCalledOnce();
    expect(dependencies.togglePrivacy).toHaveBeenCalledOnce();
  });

  it("runs commands from Enter and Space without changing the active destination", async function () {
    document.body.innerHTML = '<button data-command="export" class="active"></button>';
    var exportData = vi.fn();
    const { bindCommands } = await import("../../src/js/commands.js");
    const navigation = await import("../../src/js/navigation.js");
    navigation.setActive("overview");
    bindCommands(document, { exportData: exportData });
    var button = document.querySelector("[data-command]");
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    button.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    expect(exportData).toHaveBeenCalledTimes(2);
    expect(navigation.getActive()).toBe("overview");
  });
});
