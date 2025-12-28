import { CompendiumBrowserApp } from "./compendium-browser/app.js";

Hooks.on('ready', async () => {
  if (!game.compendiumBrowser) {
    game.compendiumBrowser = new CompendiumBrowserApp();
    await game.compendiumBrowser.initialize();
  }
});