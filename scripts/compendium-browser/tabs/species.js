export class SpeciesTab {
  constructor(app) {
    this.app = app;
    this._cache = { loaded: false, items: [] };

    this.state = {
      sortKey: "name",
      sortDir: "asc",
      colFilters: {}
    };

    this._popoverCloseHandler = null;
  }

  templates() {
    return [
      "modules/star-wars-compendium-fr/template/species.html",
      "modules/star-wars-compendium-fr/template/species-list.html"
    ];
  }

  onClose() {
    this._closeAnyFilterPopover();
  }

  activateListeners(html) {
    html.on("click", ".cb-filter-btn", (ev) => {
      if (!$(ev.currentTarget).closest('[data-tab="species"]').length) return;
      this._openFilterPopover(ev);
    });

    html.on("click", ".cb-sortable", (ev) => {
      if (!$(ev.currentTarget).closest('[data-tab="species"]').length) return;
      const key = ev.currentTarget.dataset.sort;
      if (!key) return;

      if (this.state.sortKey === key) {
        this.state.sortDir = (this.state.sortDir === "asc") ? "desc" : "asc";
      } else {
        this.state.sortKey = key;
        this.state.sortDir = "desc";
      }

      this.render(this.app.element);
    });
  }

  async render(html) {
    if (!html.find('[data-tab="species"]').length) return;

    await this._loadIndexIfNeeded();
    await this._renderList(html);
    await this._refreshSortIndicators(html);
    this._refreshFilterButtons(html);
  }

  async _loadIndexIfNeeded() {
    if (this._cache.loaded) return;

    const pack = game.packs.get("star-wars-compendium-fr.especes");
    if (!pack) {
      console.error("Compendium pack introuvable: star-wars-compendium-fr.especes");
      this._cache.loaded = true;
      this._cache.items = [];
      return;
    }

    const fields = [
      "img",
      "system.startingXP",
      "system.attributes.Brawn.value",
      "system.attributes.Agility.value",
      "system.attributes.Intellect.value",
      "system.attributes.Cunning.value",
      "system.attributes.Willpower.value",
      "system.attributes.Presence.value",
      "system.attributes.Strain.value",
      "system.attributes.Wounds.value"
    ];

    const index = await pack.getIndex({ fields });

    this._cache.items = index.map((e) => this._normalizeIndexEntry(e));;
    this._cache.loaded = true;
  }

  _normalizeIndexEntry(e) {
    const gp = foundry.utils.getProperty;
    const setp = foundry.utils.setProperty;

    const doc = {
      _id: e._id,
      name: e.name,
      img: e.img,
      system: {}
    };

    const paths = [
      "system.startingXP",
      "system.attributes.Brawn.value",
      "system.attributes.Agility.value",
      "system.attributes.Intellect.value",
      "system.attributes.Cunning.value",
      "system.attributes.Willpower.value",
      "system.attributes.Presence.value",
      "system.attributes.Strain.value",
      "system.attributes.Wounds.value"
    ];

    for (const p of paths) setp(doc, p, gp(e, p) ?? 0);
    return doc;
  }

  _getColumnDefs() {
    return {
      name: { label: "Nom", type: "string", get: sp => sp.name ?? "" },
      Brawn: { label: "Vig", type: "number", get: sp => sp.system?.attributes?.Brawn?.value ?? 0 },
      Agility: { label: "Agi", type: "number", get: sp => sp.system?.attributes?.Agility?.value ?? 0 },
      Intellect:{ label: "Int", type: "number", get: sp => sp.system?.attributes?.Intellect?.value ?? 0 },
      Cunning: { label: "Ru",  type: "number", get: sp => sp.system?.attributes?.Cunning?.value ?? 0 },
      Willpower:{label:"Vol", type: "number", get: sp => sp.system?.attributes?.Willpower?.value ?? 0 },
      Presence:{ label:"Pré", type: "number", get: sp => sp.system?.attributes?.Presence?.value ?? 0 },
      Strain: { label: "Stress", type: "number", get: sp => sp.system?.attributes?.Strain?.value ?? 0 },
      Wounds: { label: "Bless",  type: "number", get: sp => sp.system?.attributes?.Wounds?.value ?? 0 },
      startingXP: { label: "XP", type: "number", get: sp => sp.system?.startingXP ?? 0 }
    };
  }

   _applyFilters(raw) {
        const defs = this._getColumnDefs();
        let out = raw;

        for (const [col, allowed] of Object.entries(this.state.colFilters ?? {})) {
            if (!(allowed instanceof Set)) continue;
            if (allowed.size === 0) return [];

            const def = defs[col];
            if (!def) continue;

            out = out.filter(sp => allowed.has(def.get(sp)));
        }

        const { sortKey, sortDir } = this.state;
        const dir = sortDir === "desc" ? -1 : 1;
        const def = defs[sortKey] ?? defs.name;

        out = out.slice().sort((a, b) => {
          const av = def.get(a);
          const bv = def.get(b);

          if (def.type === "number") return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
          return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
        });

        return out;
    }

  async _renderList(html) {
    const tbody = html.find("tbody#CBSpecies");
    if (!tbody.length) return;

    const filtered = this._applyFilters(this._cache.items);
    const htmlItems = await renderTemplate(
      "modules/star-wars-compendium-fr/template/species-list.html",
      { listItems: filtered }
    );
    tbody[0].innerHTML = htmlItems;
  }

  _refreshSortIndicators(html) {
    html.find('[data-tab="species"]').find(".cb-sortable").removeClass("cb-s-asc cb-s-desc");
    const sel = html.find(`.cb-sortable[data-sort="${this.state.sortKey}"]`);
    sel.addClass(this.state.sortDir === "asc" ? "cb-s-asc" : "cb-s-desc");
  }

  _refreshFilterButtons(html) {
    const filters = this.state.colFilters ?? {};
    html.find(".cb-filter-btn").each((_, btn) => {
      const col = btn.dataset.sort;
      const set = filters[col];
      const active = set instanceof Set;
      btn.classList.toggle("is-active", active);
    });
  }

  _openFilterPopover(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    const btn = ev.currentTarget;
    const col = btn.dataset.sort;
    const defs = this._getColumnDefs();
    const def = defs[col];
    if (!def) return;

    this._closeAnyFilterPopover();

    const raw = this._cache.items ?? [];
    const filters = this.state.colFilters ?? {};

    const saved = filters[col];
    const had = Object.prototype.hasOwnProperty.call(filters, col);
    if (had) delete filters[col];

    const base = this._applyFilters(raw);

    if (had) filters[col] = saved;

    const uniques = Array.from(new Set(base.map(def.get)));

    uniques.sort((a, b) => {
      if (def.type === "number") return (a ?? 0) - (b ?? 0);
      return String(a ?? "").localeCompare(String(b ?? ""));
    });

    const initialAllowed = saved instanceof Set ? new Set(saved) : null; // null => tout
    let workingAllowed = initialAllowed ? new Set(initialAllowed) : null;

    const pop = $(`
      <div class="cb-filter-popover" data-col="${col}">
        <div class="cb-head">
          <input class="cb-search" type="text" placeholder="Rechercher..." />
        </div>

        <div class="cb-actions">
          <button type="button" data-action="all">Tout</button>
          <button type="button" data-action="none">Aucun</button>
        </div>

        <div class="cb-values"></div>
      </div>
    `);

    const renderValues = (filterText = "") => {
      const ft = filterText.trim().toLowerCase();
      const container = pop.find(".cb-values");
      container.empty();

      for (const v of uniques) {
        const label = String(v);
        if (ft && !label.toLowerCase().includes(ft)) continue;

        const checked = (workingAllowed === null) ? true : workingAllowed.has(v);
        const id = `cbf-${col}-${label.replace(/\W/g, "_")}`;

        container.append(`
          <label class="cb-filter-item" for="${id}">
            <input id="${id}" type="checkbox" data-value="${label}" ${checked ? "checked" : ""}/>
            <span>${label}</span>
          </label>
        `);
      }
    };

    renderValues("");

    const isAllSelected = (set, allValues) =>
      set instanceof Set && allValues.every(v => set.has(v)) && set.size === allValues.length;

    const commit = (allowedOrNull) => {
      this.state.colFilters ??= {};
      if (allowedOrNull === null) delete this.state.colFilters[col];
      else {
        if (isAllSelected(allowedOrNull, uniques)) delete this.state.colFilters[col];
        else this.state.colFilters[col] = allowedOrNull;
      }

      this.render(this.app.element);
    };

    const rect = btn.getBoundingClientRect();
    pop.css({
      left: `${rect.left + window.scrollX}px`,
      top: `${rect.bottom + window.scrollY + 4}px`
    });

    $("body").append(pop);

    pop.find("input.cb-search").on("input", (e) => renderValues(e.currentTarget.value ?? ""));


    const setAllCheckboxes = (checked) => {
      pop.find(".cb-values input[type='checkbox']").prop("checked", checked);
    };

    pop.on("click", "button[data-action='all']", () => {
      setAllCheckboxes(true);
      commit(null);
    });
    pop.on("click", "button[data-action='none']", () => {
      setAllCheckboxes(false);
      commit(new Set())
    });

    pop.on("change", ".cb-values input[type='checkbox']", () => {
      const inputs = pop.find(".cb-values input[type='checkbox']").toArray();
      const selected = inputs.filter(i => i.checked).map(i => i.dataset.value);

      const next = new Set();
      for (const lab of selected) next.add(def.type === "number" ? Number(lab) : lab);

      commit(next);
    });

    this._popoverCloseHandler = (e) => {
      if (!pop[0].contains(e.target)) {
        pop.remove();
        this._closeAnyFilterPopover();
      }
    };
    document.addEventListener("mousedown", this._popoverCloseHandler, true);
  }

  _closeAnyFilterPopover() {
    $(".cb-filter-popover").remove();
    if (this._popoverCloseHandler) {
      document.removeEventListener("mousedown", this._popoverCloseHandler, true);
      this._popoverCloseHandler = null;
    }
  }
}