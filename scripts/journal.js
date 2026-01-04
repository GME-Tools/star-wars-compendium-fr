const PLANETS_CLASS = "planet-page";

Hooks.on("renderJournalSheet", (app, html) => {
  try {
    const doc = app?.document;
    if (!doc) return;

    const isFromTargetPack = doc.pack === "star-wars-compendium-fr.livres";
    const isPlanetsEntry = doc.name === "Planètes";

    html.toggleClass(PLANETS_CLASS, isFromTargetPack && isPlanetsEntry);
  } catch (err) {
    console.warn("SW Compendium FR | journal-backgrounds renderJournalSheet", err);
  }
});