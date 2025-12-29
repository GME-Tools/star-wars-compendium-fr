export class CareersTab {
  constructor(app) {
    this.app = app;

    this._cache = {
      loaded: false,
      careers: [],
      specs: [],
      normCareers: [],
      normSpecs: [],
      specById: new Map(),
      careerById: new Map()
    }

    this.state = {
      filtersCollapsed: true,
      viewMode: "CAREER",
      skillsSearch: "",
      talentsSearch: "",
      skillsMode: "ALL",
      skillsSelected: [],
      talentsMode: "ANY",
      talentsSelected: [],
      talentMin: {},
      resultsSort: { key: "name", dir: "asc" },
      specSort: { key: "spec", dir: "asc" },
      expandedCareerIds: new Set(),
    }

    this._rendering = false;
  }

  templates() {
    return ["modules/star-wars-compendium-fr/template/careers.html"];
  }

  activateListeners(html) {
    const getHtml = () => this.app.element;

    html.on("click", '[data-action="toggle-filters"]', async (ev) => {
      ev.preventDefault();
      this.state.filtersCollapsed = !this.state.filtersCollapsed;
      await this.render(getHtml());
    });

    html.on("input", "#CBQBSkillsSearch", async () => {
      this._readDomToState(getHtml());
      this._filterSelectOptions(getHtml().find("#CBQBSkills")[0], this.state.skillsSearch);
    });

    html.on("input", "#CBQBTalentsSearch", async () => {
      this._readDomToState(getHtml());
      this._filterSelectOptions(getHtml().find("#CBQBTalents")[0], this.state.talentsSearch);
    });

    html.on(
      "change input",
      `input[name="CBQBViewMode"], #CBQBSkillsMode, #CBQBTalentsMode, #CBQBSkills, #CBQBTalents`,
      async () => {
        if (this._rendering) return;
        this._readDomToState(getHtml());
        await this.render(getHtml());
      }
    );

    html.on("input change", "#CBQBTalentRules .cb-rule-min", async (ev) => {
      if (this._rendering) return;
      const row = $(ev.currentTarget).closest(".cb-rule");
      const name = row.data("talent");
      if (!name) return;
      this.state.talentMin[name] = Math.max(1, Number(ev.currentTarget.value || 1));
      await this.render(getHtml());
    });

    html.on("click", "#CBQBTalentRules .cb-rule-remove", async (ev) => {
      ev.preventDefault();
      if (this._rendering) return;
      const row = $(ev.currentTarget).closest(".cb-rule");
      const name = row.data("talent");
      if (!name) return;

      this.state.talentsSelected = (this.state.talentsSelected ?? []).filter(t => t !== name);
      delete this.state.talentMin[name];

      await this.render(getHtml());
    });

    html.on("click", "[data-action='clear-skills']", async (ev) => {
      ev.preventDefault();
      this.state.skillsSelected = [];
      this.state.skillsSearch = "";
      await this.render(getHtml());
    });

    html.on("click", "[data-action='clear-talents']", async (ev) => {
      ev.preventDefault();
      this.state.talentsSelected = [];
      this.state.talentMin = {};
      this.state.talentsSearch = "";
      await this.render(getHtml());
    });

    html.on("click", "[data-action='toggle-career']", async (ev) => {
      ev.preventDefault();
      const id = ev.currentTarget.dataset.careerId;
      if (!id) return;

      this.state.expandedCareerIds ??= new Set();
      if (this.state.expandedCareerIds.has(id)) this.state.expandedCareerIds.delete(id);
      else this.state.expandedCareerIds.add(id);

      await this.render(getHtml());
    });

    html.off("click.cbSort").on("click.cbSort", "button.cb-sortbtn[data-sort]", async (ev) => {
      ev.preventDefault();
      const key = ev.currentTarget.dataset.sort;

      if (this.state.viewMode === "SPEC") {
        const s = this.state.specSort ??= { key: "spec", dir: "asc" };
        if (s.key === key) s.dir = (s.dir === "asc" ? "desc" : "asc");
        else { s.key = key; s.dir = "asc"; }
      } else {
        const s = this.state.resultsSort ??= { key: "name", dir: "asc" };
        if (s.key === key) s.dir = (s.dir === "asc" ? "desc" : "asc");
        else { s.key = key; s.dir = "asc"; }
      }

      await this.render(getHtml());
    });

    this._bindChips(getHtml());

    setTimeout(() => {
      const h = this.app.element;
      if (h?.length) this.render(h);
    }, 0);
  }

  async render(html) {
    if (!html.find('[data-tab="careers"]').length) return;

    if (this._rendering) return;
    this._rendering = true;
    try {
      await this._loadDocsIfNeeded();
      await this._ensureSelectsPopulated(html);

      this._applyStateToDom(html);
      this._renderTalentMinRules(html);
      this._renderTalentRules(html);

      const activeCount = this._countActiveFilters();
      html.find("#CBQBActiveCount").text(activeCount);

      const query = this._queryFromState();
      const seeds = this._buildSeeds();
      const res = this._filterSeeds(seeds, query);

      const skillsEl = html.find("#CBQBSkills")[0];
      if (skillsEl) this._filterSelectOptions(skillsEl, this.state.skillsSearch);

      const talentsEl = html.find("#CBQBTalents")[0];
      if (talentsEl) this._filterSelectOptions(talentsEl, this.state.talentsSearch);


      this._renderResults(html, res, seeds.length);
      this._refreshChips(html);
    }
    finally {
      this._rendering = false;
    }
  }

  async _loadDocsIfNeeded() {
    if (this._cache.loaded) return;

    const pc = game.packs.get("star-wars-compendium-fr.carrieres");
    const ps = game.packs.get("star-wars-compendium-fr.specialites");

    const careers = pc ? await pc.getDocuments() : [];
    const specs   = ps ? await ps.getDocuments() : [];

    this._cache.careers = careers;
    this._cache.specs = specs;
    this._cache.normCareers = careers.map(c => this._normalizeCareer(c));
    this._cache.normSpecs = specs.map(s => this._normalizeSpec(s));
    this._cache.specById = new Map(this._cache.normSpecs.map(s => [s.id, s]));

    this._cache.loaded = true;
  }

  _normalizeCareer(doc) {
    const o = doc.toObject?.() ?? doc;

    return {
      id: o._id,
      name: o.name,
      img: o.img,
      uuid: `Compendium.star-wars-compendium-fr.carrieres.Item.${o._id}`,
      sourceShort: this._sourceShort(o.system?.metadata?.sources),
      skills: this._extractCareerSkillsSet(o.system?.careerSkills),
      specializationIds: this._extractSpecIds(o.system?.specializations),
      raw: o
    };
  }

  _normalizeSpec(doc) {
    const o = doc.toObject?.() ?? doc;
    const talents = this._extractTalentCounts(o.system?.talents);

    return {
      id: o._id,
      name: o.name,
      img: o.img,
      uuid: `Compendium.star-wars-compendium-fr.specialites.Item.${o._id}`,
      universal: Boolean(o.system?.universal),
      skills: this._extractCareerSkillsSet(o.system?.careerSkills),
      talentCountsByName: talents.byName,
      sourceShort: this._sourceShort(o.system?.metadata?.sources),
      raw: o
    };
  }

  _extractCareerSkillsSet(careerSkills) {
    const out = new Set();
    if (!careerSkills || typeof careerSkills !== "object") return out;
    for (const v of Object.values(careerSkills)) {
      if (!v || typeof v !== "string") continue;
      if (v === "(none)") continue;
      out.add(v);
    }
    return out;
  }

  _extractTalentCounts(talents) {
    const byName = new Map();

    if (!talents || typeof talents !== "object") {
      return { byName };
    }

    for (const t of Object.values(talents)) {
      if (!t || typeof t !== "object") continue;
      const name = t.name ?? "INCONNU";
      byName.set(name, (byName.get(name) ?? 0) + 1);
    }

    return { byName };
  }

  _extractSpecIds(specializations) {
    const out = [];
    if (!specializations || typeof specializations !== "object") return out;
    for (const [specId, data] of Object.entries(specializations)) {
      out.push(data?.id ?? specId);
    }
    return out;
  }

  _buildFacets() {
    const skills = new Set();
    const talentsByName = new Map();

    for (const c of this._cache.normCareers) for (const s of c.skills) skills.add(s);
    for (const sp of this._cache.normSpecs) {
      for (const s of sp.skills) skills.add(s);
      for (const [name, n] of sp.talentCountsByName.entries()) {
        talentsByName.set(name, (talentsByName.get(name) ?? 0) + n);
      }
    }

    return {
      skills: Array.from(skills).sort((a, b) => a.localeCompare(b)),
      talentNames: Array.from(talentsByName.keys()).sort((a, b) => a.localeCompare(b))
    };
  }

  async _ensureSelectsPopulated(html) {
    const skillsSel = html.find("#CBQBSkills");
    const talentsSel = html.find("#CBQBTalents");
    if (!skillsSel.length) return;

    if (skillsSel.children().length && talentsSel.children().length) return;

    const facets = this._buildFacets();

    skillsSel.empty();
    for (const raw of facets.skills) {
      const label = this._skillLabel(raw);
      skillsSel.append(`<option value="${Handlebars.escapeExpression(raw)}">${Handlebars.escapeExpression(label)}</option>`);
    }

    talentsSel.empty();
    for (const t of facets.talentNames) {
      talentsSel.append(`<option value="${Handlebars.escapeExpression(t)}">${Handlebars.escapeExpression(t)}</option>`);
    }
  }

  _applyStateToDom(html) {
    const s = this.state;

    html.find("#CBQBSkillsMode").val(s.skillsMode);
    html.find("#CBQBTalentsMode").val(s.talentsMode);
    html.find("#CBQBSkills").val(s.skillsSelected);
    html.find("#CBQBTalents").val(s.talentsSelected);
    html.find("#CBQBViewMode").val(s.viewMode);
    html.find(".cb-filters").toggleClass("is-collapsed", !!this.state.filtersCollapsed);
    html.find(`input[name="CBQBViewMode"][value="${this.state.viewMode}"]`).prop("checked", true);
    html.find("#CBQBSkillsSearch").val(this.state.skillsSearch ?? "");
    html.find("#CBQBTalentsSearch").val(this.state.talentsSearch ?? "");
  }

  _readDomToState(html) {
    const s = this.state;

    s.skillsMode = html.find("#CBQBSkillsMode").val() || "ALL";
    s.talentsMode = html.find("#CBQBTalentsMode").val() || "ANY";
    s.skillsSelected = (html.find("#CBQBSkills").val() || []).filter(Boolean);  
    s.talentsSelected = (html.find("#CBQBTalents").val() || []).filter(Boolean);
    s.viewMode = html.find("#CBQBViewMode").val() || "CAREER";
    s.viewMode = html.find('input[name="CBQBViewMode"]:checked').val() || "CAREER";
    s.skillsSearch = html.find("#CBQBSkillsSearch").val() ?? "";
    s.talentsSearch = html.find("#CBQBTalentsSearch").val() ?? "";

    this._syncTalentMinRules();
  }

  _queryFromState() {
    const s = this.state;
    return {
      skills: { mode: s.skillsMode, selected: s.skillsSelected },
      talents: {
        mode: s.talentsMode,
        selected: s.talentsSelected,
        minByName: s.talentMin ?? {}
      }
    };
  }

  _syncTalentMinRules() {
    const selected = new Set(this.state.talentsSelected ?? []);
    const next = {};

    for (const name of selected) {
      next[name] = Math.max(1, Number(this.state.talentMin?.[name] ?? 1));
    }
    this.state.talentMin = next;
  }

  _buildSeeds() {
    const seeds = [];
    const careers = this._cache.normCareers;
    const specs = this._cache.normSpecs;
    const specById = this._cache.specById;

    // Career specs
    for (const c of this._cache.normCareers) {
      for (const sid of c.specializationIds) {
        const sp = specById.get(sid);
        if (!sp) continue;

        seeds.push({
          careerId: c.id,
          careerName: c.name,
          careerUuid: c.uuid,
          careerSource: c.sourceShort,

          specId: sp.id,
          specName: sp.name,
          specUuid: sp.uuid,
          specSource: sp.sourceShort,

          universal: sp.universal,

          skills: new Set([...c.skills, ...sp.skills]),
          careerSkillsRaw: c.skills,
          specSkillsRaw: sp.skills,

          talentCountsByName: sp.talentCountsByName,          
        });
      }
    }

    // Universal specs
    for (const sp of specs) {
      if (!sp.universal) continue;
      seeds.push({
        careerId: null,
        careerName: "Universelle",
        careerUuid: null,
        careerSource: "",

        specId: sp.id,
        specName: sp.name,
        specUuid: sp.uuid,
        specSource: sp.sourceShort,

        universal: sp.universal,

        skills: new Set([...sp.skills]),
        careerSkillsRaw: new Set(),
        specSkillsRaw: sp.skills,

        talentCountsByName: sp.talentCountsByName,
      });
    }

    return seeds;
  }

  _filterSeeds(seeds, query) {
    let out = seeds;

    if (query?.skills?.selected?.length) {
      const selected = query.skills.selected;
      const mode = query.skills.mode ?? "ALL";
      out = (mode === "ALL") 
        ? out.filter(s => selected.every(sk => s.skills.has(sk)))
        : out.filter(s => selected.some(sk => s.skills.has(sk)));
    }

    if (query?.talents?.selected?.length) {
      const selected = query.talents.selected;
      const mode = query.talents.mode ?? "ANY";

      out = (mode === "ALL")
        ? out.filter(s => selected.every(tn => (s.talentCountsByName.get(tn) ?? 0) > 0))
        : out.filter(s => selected.some(tn => (s.talentCountsByName.get(tn) ?? 0) > 0));
    }

    const minRules = query?.talents?.minByName;
    if (minRules && typeof minRules === "object") {
      const entries = Object.entries(minRules).filter(([,n]) => Number(n) >= 2 || Number(n) >= 1);
      if (entries.length) {
        out = out.filter(s => entries.every(([name, min]) => (s.talentCountsByName.get(name) ?? 0) >= Number(min)));
      }
    }

    return out;
  }


  _renderResults(html, seeds, totalCount) {
    const target = html.find("#CBQBResults");
    const meta = html.find("#CBQBMeta");
    if (!target.length) return;

    target.empty();
    meta.text(`${seeds.length} résultat(s) / ${totalCount}`);

    if (this.state.viewMode === "SPEC") {
      this._renderResultsBySpec(html, seeds);
    } else {
      this._renderResultsByCareer(html, seeds);
    }
  }

  _renderResultsByCareer(html, seeds) {
    const target = html.find("#CBQBResults");
    target.empty();

    const normal = seeds.filter(s => !s.universal);
    const universal = seeds.filter(s => s.universal);

    const map = new Map();

    for (const s of normal) {
      const k = s.careerId;
      if (!k) continue;
      const entry = map.get(k) ?? {
        careerId: s.careerId,
        careerName: s.careerName,
        careerUuid: s.careerUuid,
        careerSource: s.careerSource,
        careerSkillsRaw: s.careerSkillsRaw,
        specs: []
      };
      entry.specs.push(s);
      map.set(k, entry);
    }

    let careers = Array.from(map.values());

    const { key, dir } = this.state.resultsSort ?? { key: "name", dir: "asc" };
    const mul = dir === "desc" ? -1 : 1;
    careers.sort((a,b) => {
      if (key === "source") return (a.careerSource ?? "").localeCompare(b.careerSource ?? "") * mul || a.careerName.localeCompare(b.careerName) * mul;
      return a.careerName.localeCompare(b.careerName) * mul;
    });

    target.append(this._careerTableHtml(careers));

    if (universal.length) {
      target.append(`<div style="height:10px"></div>`);
      target.append(this._universalTableHtml(universal));
    }
  }

  _careerTableHtml(careers) {
    const sort = this.state.resultsSort ?? { key: "name", dir: "asc" };
    const arrow = (k) => (sort.key === k ? (sort.dir === "asc" ? "▲" : "▼") : "↕");

    const rows = careers.map(c => {
      const expanded = this.state.expandedCareerIds?.has(c.careerId);
      const btnIcon = expanded ? "fa-caret-down" : "fa-caret-right";

      const specs = (c.specs ?? []).slice().sort((a,b)=>a.specName.localeCompare(b.specName));

      const specList = expanded ? `
        <div class="cb-sublist">
          ${specs.map(s => `
            <div class="cb-subitem">
              <div class="cb-subitem-top">
                <div class="cb-subname">${this._uuidLinkHtml(s.specUuid, s.specName)}</div>
                <div class="cb-subsource">${this._sourceInlineHtml(s.specSource)}</div>
              </div>
              <div class="cb-row-skills">${this._skillsChipsHtml(s.specSkillsRaw)}</div>
            </div>
          `).join("")}
        </div>
      ` : "";

      return `
        <tr>
          <td>
            <div class="cb-row-card">
              <div class="cb-row-top">
                <div class="cb-row-title">
                  <button type="button" class="cb-collapse-btn"
                    data-action="toggle-career"
                    data-career-id="${Handlebars.escapeExpression(c.careerId)}">
                      <i class="fas ${btnIcon}"></i>
                  </button>
                  <div class="cb-name">${this._uuidLinkHtml(c.careerUuid, c.careerName)}</div>
                </div>
                <div class="cb-source">${this._sourceInlineHtml(c.careerSource)}</div>
              </div>

              <div class="cb-row-skills">${this._skillsChipsHtml(c.careerSkillsRaw)}</div>
              ${specList}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    return `
      <table class="cb-table">
        <thead>
          <tr>
            <div class="cb-th-sortbar">
              <button type="button" class="cb-sortbtn" data-sort="name" title="Trier par Nom">
                Carrière <span class="cb-sort">${arrow("name")}</span>
              </button>

              <button type="button" class="cb-sortbtn" data-sort="source" title="Trier par Source">
                Source <span class="cb-sort">${arrow("source")}</span>
              </button>
            </div>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td class="cb-muted">Aucun résultat</td></tr>`}
        </tbody>
      </table>
    `;
  }

  _sourceInlineHtml(src) {
    const s = (src ?? "").trim();
    return s ? Handlebars.escapeExpression(s) : `<span class="cb-muted">(source inconnue)</span>`;
  }

  _universalTableHtml(universalSeeds) {
    const rows = (universal ?? []).map(s => `
      <tr>
        <td>
          <div class="cb-row-card">
            <div class="cb-row-top">
              <div class="cb-row-title">
                <div class="cb-name">${this._uuidLinkHtml(s.specUuid, s.specName)}</div>
                <div class="cb-source">${this._sourceInlineHtml(s.specSource)}</div>
              </div>
            </div>
            <div class="cb-row-skills">${this._skillsChipsHtml(s.specSkillsRaw)}</div>
          </div>
        </td>
      </tr>
    `).join("");

    return `
      <table class="cb-table" style="margin-top:10px;">
        <thead>
          <tr><th>Spés universelles</th></tr>
        </thead>
        <tbody>
          ${rows || `<tr><td class="cb-muted">Aucune spé universelle</td></tr>`}
        </tbody>
      </table>
    `;
  }

  _renderResultsBySpec(html, seeds) {
    const target = html.find("#CBQBResults");
    target.empty();

    const map = new Map();

    for (const s of seeds) {
      let row = map.get(s.specId);
      if (!row) {
        row = {
          specId: s.specId,
          specName: s.specName,
          specUuid: s.specUuid,
          specSource: s.specSource,
          specSkillsRaw: s.specSkillsRaw,
          universal: !!s.universal,
          careers: []
        };
        map.set(s.specId, row);
      }
      if (!s.universal && s.careerId) {
        if (!row.careers.some(c => c.careerId === s.careerId)) {
          row.careers.push({ careerId: s.careerId, careerName: s.careerName, careerUuid: s.careerUuid });
        }
      }
    }

    let rows = Array.from(map.values());
    for (const r of rows) r.careers.sort((a,b)=>a.careerName.localeCompare(b.careerName));

    const sort = this.state.specSort ?? { key: "spec", dir: "asc" };
    const mul = sort.dir === "desc" ? -1 : 1;

    rows.sort((a,b) => {
      if (sort.key === "career") {
        const ac = a.universal ? "Universelle" : (a.careers[0]?.careerName ?? "");
        const bc = b.universal ? "Universelle" : (b.careers[0]?.careerName ?? "");
        return ac.localeCompare(bc) * mul || a.specName.localeCompare(b.specName) * mul;
      }
      if (sort.key === "source") {
        return (a.specSource ?? "").localeCompare(b.specSource ?? "") * mul || a.specName.localeCompare(b.specName) * mul;
      }
      return a.specName.localeCompare(b.specName) * mul;
    });

    const arrow = (k) => (sort.key === k ? (sort.dir === "asc" ? "▲" : "▼") : "↕");

    const body = rows.map(r => {
      const careerCell = r.universal
        ? `<span class="cb-chip">Universelle</span>`
        : r.careers.map(c => this._uuidLinkHtml(c.careerUuid, c.careerName)).join(", ");

      return `
        <tr>
          <td>${this._uuidLinkHtml(r.specUuid, r.specName)}</td>
          <td>${careerCell || `<span class="cb-muted">(?)</span>`}</td>
          <td>${this._skillsChipsHtml(r.specSkillsRaw)}</td>
          <td class="cb-source">${Handlebars.escapeExpression(r.specSource ?? "")}</td>
        </tr>
      `;
    }).join("");

    target.append(`
      <table class="cb-table">
        <thead>
          <tr>
            <th data-sort="spec">Spécialité <span class="cb-sort">${arrow("spec")}</span></th>
            <th data-sort="career" style="width: 220px">Carrière <span class="cb-sort">${arrow("career")}</span></th>
            <th>Compétences</th>
            <th data-sort="source" style="width: 180px">Source <span class="cb-sort">${arrow("source")}</span></th>
          </tr>
        </thead>
        <tbody>${body || `<tr><td colspan="4" class="cb-muted">Aucun résultat</td></tr>`}</tbody>
      </table>
    `);
  }

  _filterSelectOptions(selectEl, text) {
    const ft = String(text ?? "").trim().toLowerCase();
    for (const opt of selectEl.options) {
      const label = (opt.text ?? "").toLowerCase();
      opt.hidden = ft ? !label.includes(ft) : false;
    }
  }

  _bindChips(html) {
    const getHtml = () => this.app.element;
    const refresh = () => this._refreshChips(getHtml());
    html.find("#CBQBSkills").off("change.cbchips").on("change.cbchips", refresh);
    html.find("#CBQBTalents").off("change.cbchips").on("change.cbchips", refresh);
  }

  _refreshChips(html) {
    this._renderSelectedChips(html, "#CBQBSkills", "#CBQBSkillsSelected", true);
    this._renderSelectedChips(html, "#CBQBTalents", "#CBQBTalentsSelected", false);
  };

  _renderSelectedChips(html, selectId, targetId, isSkill) {
    const sel = html.find(selectId);
    const target = html.find(targetId);
    if (!sel.length || !target.length) return;

    const values = (sel.val() || []).filter(Boolean);
    target.empty();

    for (const v of values) {
      const label = isSkill ? this._skillLabel(v) : v;
      const chip = $(`<span class="cb-chip"></span>`);
      chip.append(`<span>${Handlebars.escapeExpression(label)}</span>`);

      const x = $(`<button type="button" title="Retirer"><i class="fas fa-times"></i></button>`);
      x.on("click", () => {
        const next = values.filter(a => a !== v);
        sel.val(next);
        sel.trigger("change");
      });
      
      chip.append(x);
      target.append(chip);
    }
  }

  _renderTalentMinRules(html) {
    const box = html.find("#CBQBTalentMinRules");
    if (!box.length) return;

    box.empty();

    const names = (this.state.talentsSelected ?? []).slice().sort((a,b)=>a.localeCompare(b));
    if (!names.length) {
      box.append(`<div class="cb-muted">(Sélectionne des talents pour définir un minimum)</div>`);
      return;
    }

    for (const name of names) {
      const val = Number(this.state.talentMin?.[name] ?? 1) || 1;
      const row = $(`
        <div class="cb-minrule-row" data-talent="${Handlebars.escapeExpression(name)}">
          <div class="cb-minrule-name">${Handlebars.escapeExpression(name)}</div>
          <input class="cb-minrule-input" type="number" min="1" step="1" value="${val}">
        </div>
      `);
      box.append(row);
    }
  }

  _renderTalentRules(html) {
    const box = html.find("#CBQBTalentRules");
    if (!box.length) return;
    box.empty();

    const names = (this.state.talentsSelected ?? []).slice().sort((a,b)=>a.localeCompare(b));
    if (!names.length) {
      box.append(`<div class="cb-muted"></div>`);
      return;
    }

    for (const name of names) {
      const min = Math.max(1, Number(this.state.talentMin?.[name] ?? 1));
      const row = $(`
        <div class="cb-rule" data-talent="${Handlebars.escapeExpression(name)}">
          <div class="cb-rule-name">${Handlebars.escapeExpression(name)}</div>
          <input class="cb-rule-min" type="number" min="1" step="1" value="${min}">
          <button type="button" class="cb-rule-remove" title="Retirer"><i class="fas fa-times"></i></button>
        </div>
      `);
      box.append(row);
    }
  }

  _countActiveFilters() {
    let n = 0;

    if ((this.state.skillsSelected ?? []).length) n++;
    if ((this.state.talentsSelected ?? []).length) n++;

    const tm = this.state.talentMin ?? {};
    for (const [_, v] of Object.entries(tm)) {
      if ((Number(v) || 1) > 1) { n++; break; }
    }

    if ((this.state.skillsMode ?? "ALL") !== "ALL") n++;
    if ((this.state.talentsMode ?? "ANY") !== "ANY") n++;

    return n;
  }

  _skillLabel(raw) {
    if (!raw || raw === "(none)") return "";
    const key = this._skillKeyFromLabel(raw);
    if (!key) return raw;
    const i18nKey = `SWFFG.SkillsName${key}`;
    return game.i18n.has(i18nKey) ? game.i18n.localize(i18nKey) : raw;
  }

  _skillKeyFromLabel(raw) {
    if (!raw || typeof raw !== "string") return null;
    const parts = raw.trim().split(":").map(p => p.trim());
    if (parts.length === 1) return this._toPascalKey(parts[0]);
    return this._toPascalKey(parts[0]) + this._toPascalKey(parts[1]);
  }

  _toPascalKey(text) {
    return String(text)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  }

  _sourceShort(sources) {
    const s = Array.isArray(sources) ? (sources[0] ?? "") : (sources ?? "");
    if (!s) return "";
    return String(s).replace(/,\s*p\.?\s*\d+\s*$/i, "").trim();
  }

  _skillsChipsHtml(skillSet) {
    const labels = Array.from(skillSet ?? []).map(k => this._skillLabel(k)).filter(Boolean);
    labels.sort((a,b)=>a.localeCompare(b));
    if (!labels.length) return `<span class="cb-muted">(aucune)</span>`;
    return `<div class="cb-chips">${labels.map(l => `<span class="cb-chip">${Handlebars.escapeExpression(l)}</span>`).join("")}</div>`;
  }

  _uuidLinkHtml(uuid, text) {
    const t = Handlebars.escapeExpression(text ?? "");
    if (!uuid) return t;
    const u = Handlebars.escapeExpression(uuid);
    return `<a class="cb-uuid-link" draggable="true" data-link data-uuid="${u}">${t}</a>`;
  }

}