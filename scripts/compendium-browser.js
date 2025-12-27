class CompendiumBrowser extends Application {
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
        this._cache = {
            species: { loaded: false, items: [] },
            careers: { loaded: false, careers: [], specs: [], normCareers: [], normSpecs: [], specById: new Map(), careerById: new Map() }
        };

        this.state = {
            activeTab: "species",
            species: {
                sortKey: "name",
                sortDir: "asc",
                colFilters: {}
            }
        };

        this._onSpeciesSearchInput = foundry.utils.debounce(this._onSpeciesSearchInput.bind(this), 200);
    }

    async initialize() {
        await loadTemplates([
            "modules/star-wars-compendium-fr/template/adversaries.html",
            "modules/star-wars-compendium-fr/template/items.html",
            "modules/star-wars-compendium-fr/template/species.html",
            "modules/star-wars-compendium-fr/template/species-list.html",
            "modules/star-wars-compendium-fr/template/careers.html"
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
        this._closeAnyFilterPopover?.();
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

    // SPECIES ===============================================================================
    async _loadSpeciesIndexIfNeeded() {
        if (this._cache.species.loaded) return;

        const pack = game.packs.get("star-wars-compendium-fr.especes");
        if (!pack) {
            console.error("Compendium pack introuvable: star-wars-compendium-fr.especes");
            this._cache.species.loaded = true;
            this._cache.species.items = [];
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

        const items = index.map((e) => this._normalizeSpeciesIndexEntry(e));
        this._cache.species.items = items;
        this._cache.species.loaded = true;
    }

    _normalizeSpeciesIndexEntry(e) {
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

    _getSpeciesColumnDefs() {
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

    _applySpeciesFilters(raw) {
        const s = this.state.species;
        const defs = this._getSpeciesColumnDefs();
        const colFilters = this.state.species.colFilters ?? {};

        let out = raw;

        const dir = s.sortDir === "desc" ? -1 : 1;
        if (s.sortKey === "name") {
            out = out.slice().sort((a, b) => a.name.localeCompare(b.name) * dir);
        } else if (s.sortKey === "xp") {
            out = out.slice().sort(((a, b) => ((a.system?.startingXP ?? 0) - (b.system?.startingXP ?? 0)) * dir));
        }

        for (const [col, allowed] of Object.entries(colFilters)) {
            if (!(allowed instanceof Set)) continue;
            if (allowed.size === 0) return [];

            const def = defs[col];
            if (!def) continue;

            out = out.filter(sp => allowed.has(def.get(sp)));
        }

        return out;
    }

    async _renderSpeciesList(html) {
        await this._loadSpeciesIndexIfNeeded();
        const tbody = html.find("tbody#CBSpecies");
        if (!tbody.length) return;

        const filtered = this._applySpeciesFilters(this._cache.species.items);
        const htmlItems = await renderTemplate(
            "modules/star-wars-compendium-fr/template/species-list.html",
            { listItems: filtered }
        );

        tbody[0].innerHTML = htmlItems;
    }
    // !SPECIES ==============================================================================
    
    // CAREERS & SPECS =======================================================================
    async _loadCareerSpecDocsIfNeeded() {
      if (this._cache.careers.loaded) return;
      
      const careersPackId = "star-wars-compendium-fr.carrieres";
      const specsPackId   = "star-wars-compendium-fr.specialites";
      const pc = game.packs.get(careersPackId);
      const ps = game.packs.get(specsPackId);
      const careers = pc ? await pc.getDocuments() : [];
      const specs   = ps ? await ps.getDocuments() : [];
      this._cache.careers.careers = careers;
      this._cache.careers.specs = specs;
      
      const normSpecs = specs.map(s => this._normalizeSpec(s));
      const normCareers = careers.map(c => this._normalizeCareer(c));
      this._cache.careers.normSpecs = normSpecs;
      this._cache.careers.normCareers = normCareers;
      this._cache.careers.specById = new Map(normSpecs.map(s => [s.id, s]));
      this._cache.careers.careerById = new Map(normCareers.map(c => [c.id, c]));

      this._cache.careers.loaded = true;
    }

    _normalizeSpec(doc) {
      const o = doc.toObject?.() ?? doc;
      return {
        id: o._id,
        name: o.name,
        img: o.img,
        universal: Boolean(o.system?.universal),
        careerSkillsRaw: o.system?.careerSkills,
        talentsRaw: o.system?.talents,
        careerSkills: this._extractSkillSet(o.system?.careerSkills),
        talentCounts: this._extractTalentCounts(o.system?.talents),
        careerLinkRaw: {
          metadata: o.system?.metadata,
          collection: o.system?.collection
        }
      };
    }

    _normalizeCareer(doc) {
      const o = doc.toObject?.() ?? doc;
      return {
        id: o._id,
        name: o.name,
        img: o.img,
        careerSkillsRaw: o.system?.careerSkills,
        specializationsRaw: o.system?.specializations,
        careerSkills: this._extractSkillSet(o.system?.careerSkills),
        specializationIds: this._extractSpecIds(o.system?.specializations)
      };
    }
    
    _extractSkillSet(careerSkills) {
      const out = new Set();
      if (!careerSkills) return out;
      if (Array.isArray(careerSkills)) {
        for (const s of careerSkills) {
          if (typeof s === "string") out.add(s);
          else if (s && typeof s === "object") {
            out.add(s.key ?? s.id ?? s.name ?? JSON.stringify(s));
          }
        }
        return out;
      }
      
      if (typeof careerSkills === "object") {
        for (const [k, v] of Object.entries(careerSkills)) {
          if (v) out.add(k);
        }
      }
      return out;
    }

    _extractTalentCounts(talents) {
      const counts = new Map();
      if (!talents) return counts;
      
      if (Array.isArray(talents)) {
        for (const t of talents) {
          if (!t) continue;
          if (typeof t === "string") {
            counts.set(t, (counts.get(t) ?? 0) + 1);
          } else if (typeof t === "object") {
            const key = t.talentId ?? t.id ?? t.uuid ?? t.name ?? t.talent ?? "UNKNOWN_TALENT";
            const n = Number.isFinite(t.count) ? t.count :
              Number.isFinite(t.ranks) ? t.ranks :
              1;
            counts.set(key, (counts.get(key) ?? 0) + n);
          }
        }
        return counts;
      }
      
      if (typeof talents === "object") {
        for (const [k, v] of Object.entries(talents)) {
          if (!v) continue;
          const n = Number.isFinite(v) ? v : 1;
          counts.set(k, (counts.get(k) ?? 0) + n);
        }
      }
      
      return counts;
    }

    _extractSpecIds(specializations) {
      const out = [];
      if (!specializations) return out;

      if (Array.isArray(specializations)) {
        for (const sp of specializations) {
          if (!sp) continue;
          if (typeof sp === "string") out.push(sp);
          else if (typeof sp === "object") out.push(sp._id ?? sp.id ?? sp.uuid ?? sp.name ?? JSON.stringify(sp));
        }
        return out;
      }

      if (typeof specializations === "object") {
        for (const [k, v] of Object.entries(specializations)) {
          if (v) out.push(k);
        }
      }

      return out;
    }
    // !CAREERS & SPECS ======================================================================

    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        console.log("on change tab")
        const html = this.element;
        if (active === "species") this._renderSpeciesList(html);
        if (active === "careers") this._loadCareerSpecDocsIfNeeded();
    }

    activateListeners(html) {
        super.activateListeners(html);
        this._renderSpeciesList(html);

        html.find("#CBSpeciesSearch").on("input", (ev) => this._onSpeciesSearchInput(ev));

        html.find('[data-action="reset-species"]').on("click", (ev) => {
            ev.preventDefault();
            this.state.species.search = "";
            this.state.species.xpMin = null;
            this.state.species.xpMax = null;

            html.find("#CBSpeciesSearch").val("");
            html.find("#CBSpeciesXPMin").val("");
            html.find("#CBSpeciesXPMax").val("");

            this._renderSpeciesList(html);
        });

        html.on("click", ".cb-filter-btn", (ev) => this._openSpeciesFilterPopover(ev));
        
        html.find('[data-action="debug-careers"]')
          .on("click", (ev) => {
            ev.preventDefault();
            this._debug();
        });

        this._refreshSpeciesFilterButtons(html);
    }
    
    async _debug() {
      // List all packs
      const modulePrefix = "star-wars-compendium-fr.";
      const packs = Array.from(game.packs.values())
        .filter(p => p.metadata?.packageName === "star-wars-compendium-fr" || p.collection?.startsWith(modulePrefix))
        .map(p => ({
          collection: p.collection,
          label: p.metadata?.label,
          type: p.metadata?.type,
          documentName: p.documentName ?? p.metadata?.documentName
      }));
      console.group("[CB] Packs du module star-wars-compendium-fr");
      console.table(packs);
      console.groupEnd();
    
      // Career & Spec shapes
      const careers = this._cache.careers.careers;
      const specs = this._cache.careers.specs;
      const c0 = careers[0]?.toObject?.() ?? careers[0];
      const s0 = specs[0]?.toObject?.() ?? specs[0];

      console.group("[CB] Shapes Carrières/Spés");
      console.log("Career[0].system.careerSkills =", c0?.system?.careerSkills);
      console.log("Career[0].system.specializations =", c0?.system?.specializations);

      console.log("Spec[0].system.careerSkills =", s0?.system?.careerSkills);
      console.log("Spec[0].system.talents =", s0?.system?.talents);
      console.log("Spec[0].system.universal =", s0?.system?.universal);
      console.log("Spec[0].system.metadata =", s0?.system?.metadata);
      console.log("Spec[0].system.collection =", s0?.system?.collection);
      console.groupEnd();
      
      console.log(this._cache)

      ui.notifications.info("Debug packs: regarde la console (F12).");
    }

    _onSpeciesSearchInput(ev) {
        const html = this.element;
        this.state.species.search = ev.currentTarget.value ?? "";
        this._renderSpeciesList(html);
    }

    _refreshSpeciesFilterButtons(html) {
        const filters = this.state.species.colFilters ?? {};
        html.find(".cb-filter-btn").each((_, btn) => {
            const col = btn.dataset.col;
            const set = filters[col];
            const active = set instanceof Set; // Set => filtre actif (même si taille=0)
            btn.classList.toggle("is-active", active);
        });
    }

    _closeAnyFilterPopover() {
        $(".cb-filter-popover").remove();
        if (this._popoverCloseHandler) {
            document.removeEventListener("mousedown", this._popoverCloseHandler, true);
            this._popoverCloseHandler = null;
        }
    }


    _openSpeciesFilterPopover(ev) {
        ev.preventDefault();
        ev.stopPropagation();

        const btn = ev.currentTarget;
        const col = btn.dataset.col;
        const defs = this._getSpeciesColumnDefs();
        const def = defs[col];
        if (!def) return;

        this._closeAnyFilterPopover();

        const raw = this._cache.species.items ?? [];
        const filters = this.state.species.colFilters ?? {};

        const saved = filters[col];
        const had = Object.prototype.hasOwnProperty.call(filters, col);
        if (had) delete filters[col];

        const base = this._applySpeciesFilters(raw);

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
            this.state.species.colFilters ??= {};
            if (allowedOrNull === null) delete this.state.species.colFilters[col];
            else {
                if (isAllSelected(allowedOrNull, uniques)) delete this.state.species.colFilters[col];
                else this.state.species.colFilters[col] = allowedOrNull;
            }

            this._renderSpeciesList(this.element);
            this._refreshSpeciesFilterButtons(this.element);
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

}

Hooks.on('ready', async () => {
    
    if (game.compendiumBrowser === undefined) {
        game.compendiumBrowser = new CompendiumBrowser();
        await game.compendiumBrowser.initialize();
    }
});