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
      skillsMode: "ALL",
      skillsSelected: [],
      talentsMode: "ANY",
      talentsSelected: [],
      minTalentName: "",
      minTalentCount: 2,
      hasForceTalent: false,
      hasForceRatingTalent: false
    }

    this._rendering = false;
  }

  templates() {
    return ["modules/star-wars-compendium-fr/template/careers.html"];
  }

  activateListeners(html) {
    html.on(
      "change input",
      "#CBQBSkillsMode, #CBQBTalentsMode, #CBQBSkills, #CBQBTalents, #CBQBTalentMinName, #CBQBTalentMinCount, #CBQBForceTalent, #CBQBForceRating",
      async () => {
        if (this._rendering) return;
        this._readDomToState(html);
        await this.render(html);
      }
    );

    html.on("click", "[data-action='reset-qb']", async (ev) => {
      ev.preventDefault();
      Object.assign(this.state, {
        skillsMode: "ALL",
        skillsSelected: [],
        talentsMode: "ANY",
        talentsSelected: [],
        minTalentName: "",
        minTalentCount: 2,
        hasForceTalent: false,
        hasForceRatingTalent: false,
      });
      await this.render(html);
    });

    html.on("click", "[data-action='clear-skills']", async (ev) => {
      ev.preventDefault();
      this.state.skillsSelected = [];
      await this.render(html);
    });

    html.on("click", "[data-action='clear-talents']", async (ev) => {
      ev.preventDefault();
      this.state.talentsSelected = [];
      await this.render(html);
    });

    this._bindChips(html);
  }

  async render(html) {
    if (!html.find('[data-tab="careers"]').length) return;

    if (this._rendering) return;
    this._rendering = true;
    try {
      await this._loadDocsIfNeeded();
      await this._ensureSelectsPopulated(html);

      this._applyStateToDom(html);

      const query = this._queryFromState();
      const seeds = this._buildSeeds();
      const res = this._filterSeeds(seeds, query);

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
      skills: this._extractCareerSkillsSet(o.system?.careerSkills),
      specializationIds: this._extractSpecIds(o.system?.specializations)
    };
  }

  _normalizeSpec(doc) {
    const o = doc.toObject?.() ?? doc;
    const talents = this._extractTalentCounts(o.system?.talents);

    return {
      id: o._id,
      name: o.name,
      universal: Boolean(o.system?.universal),
      skills: this._extractCareerSkillsSet(o.system?.careerSkills),
      talentCountsByName: talents.byName,
      hasForceTalent: talents.hasForceTalent,
      hasForceRatingTalent: talents.hasForceRatingTalent
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
    let hasForceTalent = false;
    let hasForceRatingTalent = false;

    if (!talents || typeof talents !== "object") {
      return { byName, hasForceTalent, hasForceRatingTalent };
    }

    for (const t of Object.values(talents)) {
      if (!t || typeof t !== "object") continue;
      const name = t.name ?? "INCONNU";
      byName.set(name, (byName.get(name) ?? 0) + 1);
      if (t.isForceTalent) hasForceTalent = true;
      if (name === "Valeur de Force") hasForceRatingTalent = true;
    }

    return { byName, hasForceTalent, hasForceRatingTalent };
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
    const minNameSel = html.find("#CBQBTalentMinName");
    if (!skillsSel.length) return;

    if (skillsSel.children().length && talentsSel.children().length && minNameSel.children().length) return;

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

    minNameSel.empty();
    minNameSel.append(`<option value="">(none)</option>`);
    for (const t of facets.talentNames) {
      minNameSel.append(`<option value="${Handlebars.escapeExpression(t)}">${Handlebars.escapeExpression(t)}</option>`);
    }
  }

  _applyStateToDom(html) {
    const s = this.state;

    html.find("#CBQBSkillsMode").val(s.skillsMode);
    html.find("#CBQBTalentsMode").val(s.talentsMode);
    html.find("#CBQBSkills").val(s.skillsSelected);
    html.find("#CBQBTalents").val(s.talentsSelected);
    html.find("#CBQBTalentMinName").val(s.minTalentName);
    html.find("#CBQBTalentMinCount").val(s.minTalentCount);

    const ft = html.find("#CBQBForceTalent")[0];
    if (ft) ft.checked = !!s.hasForceTalent;
    
    const fr = html.find("#CBQBForceRating")[0];
    if (fr) fr.checked = !!s.hasForceRatingTalent;
  }

  _readDomToState(html) {
    const s = this.state;
    s.skillsMode = html.find("#CBQBSkillsMode").val() || "ALL";
    s.talentsMode = html.find("#CBQBTalentsMode").val() || "ANY";
    s.skillsSelected = (html.find("#CBQBSkills").val() || []).filter(Boolean);  
    s.talentsSelected = (html.find("#CBQBTalents").val() || []).filter(Boolean);
    s.minTalentName = html.find("#CBQBTalentMinName").val() || "";
    s.minTalentCount = Number(html.find("#CBQBTalentMinCount").val() || 0);
    s.hasForceTalent = !!html.find("#CBQBForceTalent")[0]?.checked;
    s.hasForceRating = !!html.find("#CBQBForceRating")[0]?.checked;
  }

  _queryFromState() {
    const s = this.state;
    return {
      skills: { mode: s.skillsMode, selected: s.skillsSelected },
      talents: {
        mode: s.talentsMode,
        selected: s.talentsSelected,
        minCounts: (s.minTalentName && s.minTalentCount >= 1)
          ? [{ name: s.minTalentName, min: s.minTalentCount }]
          : []
      },
      force: {
        hasForceTalent: !!s.hasForceTalent,
        hasForceRatingTalent: !!s.hasForceRating
      }
    };
  }

  _buildSeeds() {
    const seeds = [];
    const specById = this._cache.specById;

    for (const c of this._cache.normCareers) {
      for (const sid of c.specializationIds) {
        const sp = specById.get(sid);
        if (!sp) continue;

        seeds.push({
          careerId: c.id,
          careerName: c.name,
          specId: sp.id,
          specName: sp.name,
          universal: sp.universal,
          skills: new Set([...c.skills, ...sp.skills]),
          talentCountsByName: sp.talentCountsByName,
          hasForceTalent: sp.hasForceTalent,
          hasForceRatingTalent: sp.hasForceRatingTalent,
        });
      }
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

    if (query?.talents?.minCounts?.length) {
      out = out.filter(s => query.talents.minCounts.every(rule => {
        const n = s.talentCountsByName.get(rule.name) ?? 0;
        return n >= (rule.min ?? 1);
      }));
    } 

    if (query?.force?.hasForceTalent) out = out.filter(s => s.hasForceTalent);
    if (query?.force?.hasForceRatingTalent) out = out.filter(s => s.hasForceRatingTalent);

    return out;
  }

  _renderResults(html, seeds) {
    const target = html.find("#CBQBResults");
    const meta = html.find("#CBQBMeta");
    if (!target.length) return;

    target.empty();
    meta.text(`${seeds.length} résultat(s)`);

    const byCareer = new Map();
    const universal = [];

    for (const s of seeds) {
      if (s.universal) { universal.push(s); continue; }
      const arr = byCareer.get(s.careerName) ?? [];
      arr.push(s);
      byCareer.set(s.careerName, arr);
    }

    for (const [careerName, arr] of Array.from(byCareer.entries()).sort((a,b)=>a[0].localeCompare(b[0]))) {
      arr.sort((a,b)=>a.specName.localeCompare(b.specName));
      const block = $(`<div class="cb-career-block"></div>`);
      block.append(`<div class="cb-career-title">${Handlebars.escapeExpression(careerName)} (${arr.length})</div>`);
      const ul = $(`<ul></ul>`);
      for (const s of arr) ul.append(`<li>${Handlebars.escapeExpression(s.specName)}</li>`);
      block.append(ul);
      target.append(block);
    }

    if (universal.length) {
      universal.sort((a,b)=>a.specName.localeCompare(b.specName));
      const block = $(`<div class="cb-career-block"></div>`);
      block.append(`<div class="cb-career-title">Spés universelles (${universal.length})</div>`);
      const ul = $(`<ul></ul>`);
      for (const s of universal) ul.append(`<li>${Handlebars.escapeExpression(s.specName)}</li>`);
      block.append(ul);
      target.append(block);
    }
  }

  _bindChips(html) {
    const refresh = () => this._refreshChips(html);
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
}