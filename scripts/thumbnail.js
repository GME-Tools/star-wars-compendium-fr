class Thumbnail {
  static MODULE_ID = "star-wars-compendium-fr";

  static async addCovers(app, html) {
    const pack = app.collection;
    if (!pack || pack.metadata.name !== "livres") return;
    if (!game.settings.get(this.MODULE_ID, "enableBookThumbnails")) return;

    const position = game.settings.get(this.MODULE_ID, "bookThumbnailPosition");
    const entries = html.querySelectorAll("li.directory-item.entry.document.journalentry");

    for (const li of entries) {
      if (li.querySelector(".book-thumb")) continue;

      const id = li.dataset.entryId ?? li.dataset.documentId;
      if (!id) continue;

      const entry = await pack.getDocument(id);
      if (!entry) continue;

      const thumb = entry.getFlag(this.MODULE_ID, "thumbnail");
      if (!thumb) continue;

      li.classList.add("has-book-thumb", `book-thumb-${position}`);

      const img = document.createElement("img");
      img.className = "book-thumb";
      img.src = thumb;
      img.alt = entry.name ?? "";

      if (position === "right") {
        li.appendChild(img);
      } else {
        li.insertAdjacentElement("afterbegin", img);
      }
    }
  }

  static rerenderOpenBookCompendiums() {
    for (const app of Object.values(ui.windows)) {
      const pack = app?.collection;
      if (pack?.metadata?.name === "livres") app.render(false);
    }
  }
}

Hooks.once("init", () => {
  game.settings.register(Thumbnail.MODULE_ID, "enableBookThumbnails", {
    name: "Afficher les thumbnails des livres",
    hint: "Ajoute la miniature des livres dans le compendium Livres.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => Thumbnail.rerenderOpenBookCompendiums()
  });

  game.settings.register(Thumbnail.MODULE_ID, "bookThumbnailPosition", {
    name: "Position du thumbnail des livres",
    hint: "Affiche la miniature à gauche ou à droite du titre.",
    scope: "client",
    config: true,
    type: String,
    choices: {
      left: "Gauche",
      right: "Droite"
    },
    default: "left",
    onChange: () => Thumbnail.rerenderOpenBookCompendiums()
  });
});

Hooks.on("renderCompendium", (...args) => Thumbnail.addCovers(...args));