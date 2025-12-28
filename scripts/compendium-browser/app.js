import { SpeciesTab } from "./tabs/species.js";
import { CareersTab } from "./tabs/careers.js";

export class CompendiumBrowserApp extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions;
      foundry.utils.mergeObject(options, {
        title: "Compendium Browser",
        tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "species"}],
        classes: options.classes.concat('star-wars-compendium-fr'),
        template: "modules/star-wars-compendium-fr/template/browser.html",
        width: 800,
        height: 700,
        resizable: true,
        minimizable: true
      });
    return options;
  }

  constructor(...args) {
    super(...args);
    
    this.tabsController = {
      species: new SpeciesTab(this),
      careers: new CareersTab(this)
    };

    this._cbSidebarHookRegistered = false;
    this._cbRenderHookRegistered = false;
  }

  async initialize() {
    await loadTemplates([
      "modules/star-wars-compendium-fr/template/browser.html",
      ...this.tabsController.species.templates(),
      ...this.tabsController.careers.templates(),
      "modules/star-wars-compendium-fr/template/items.html",
      "modules/star-wars-compendium-fr/template/adversaries.html",
    ]);

    this.hookCompendiumList($('#compendium'));

    if (!this._cbSidebarHookRegistered) {
      this._cbSidebarHookRegistered = true;
      Hooks.on("changeSidebarTab", (tab) => {
        if (tab === "compendium") this.hookCompendiumList($("#compendium"));
      });
    }

    if (!this._cbRenderHookRegistered) {
      this._cbRenderHookRegistered = true;
      Hooks.on("renderCompendiumDirectory", (app, html) => {
        this.hookCompendiumList(html);
      });
    }
  }

  async close(options = {}) {
    for (const t of Object.values(this.tabsController)) t?.onClose?.();
    return super.close(options);
  }

  hookCompendiumList(html) {
    if (!html?.length) return;

    const footer = html.find(".directory-footer");
    if (!footer.length) return;

    if (footer.find(".compendium-browser-btn").length) return;

    footer.find(".og-character-import.cb-browser-block").remove();

    const div = $(`<div class="og-character-import cb-browser-block"></div>`);
    const divider = $(`<hr><h4>Compendium Browser</h4>`);
    const cbButton = $(`<button type="button" class="compendium-browser-btn">Recherche</button>`);

    div.append(divider, cbButton);
    footer.append(div);

    cbButton.on("click", (ev) => {
      ev.preventDefault();
      this.render(true);
    });
  }

  _onChangeTab(event, tabs, active) {
    super._onChangeTab(event, tabs, active);
    const html = this.element;
    const tab = this.tabsController[active];
    tab?.render?.(html);
  }

  activateListeners(html) {
    super.activateListeners(html);
    for (const t of Object.values(this.tabsController)) t?.activateListeners?.(html);
    const active = this.options.tabs?.[0]?.initial ?? "species";
    this.tabsController[active]?.render?.(html);
  }
}