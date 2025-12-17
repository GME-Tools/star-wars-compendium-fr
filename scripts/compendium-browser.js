class CompendiumBrowser extends Application {
    static get defaultOptions() {
        const options = super.defaultOptions;
        foundry.utils.mergeObject(options, {
            title: "Compendium Browser",
            tabs: [{navSelector: ".tabs", contentSelector: ".content", initial: "spell"}],
            classes: options.classes.concat('star-wars-compendium-fr'),
            template: "modules/star-wars-compendium-fr/template/browser.html",
            width: 800,
            height: 700,
            resizable: true,
            minimizable: true
        });
        return options;
    }

    async initialize() {
        this.hookCompendiumList();

        await loadTemplates([
            "modules/star-wars-compendium-fr/template/adversaries.html",
            "modules/star-wars-compendium-fr/template/items.html",
            "modules/star-wars-compendium-fr/template/species.html",
            "modules/star-wars-compendium-fr/template/species-list.html",
        ]);
    }

    hookCompendiumList() {
        Hooks.on('renderCompendiumDirectory', (app, html, data) => {
            this.hookCompendiumList();
        });

        let html = $('#compendium');
        const div = $(`<div class="og-character-import"></div>`);
        const divider = $("<hr><h4>Compendium Browser</h4>");
        const cbButton = $(`<button class="compendium-browser-btn">Recherche</button>`);
        div.append(divider, cbButton);
        html.find('.directory-footer').append(div);

        cbButton.click(ev => {
            ev.preventDefault();
            this.render(true);
        });
    }

    async loadAndFilterSpecies() {
        let speciesList = {}
        try {
            for (let pack of game.packs) {
                if (pack.metadata.name === "especes") {
                    await pack.getDocuments().then(content => speciesList = content)
                }
            }
        }
        catch (e) {
            console.error(e);
        }
        return speciesList;
    }

    async replaceList(html, browserTab, options = {reload : true}) {
        let elements = null;

        if (browserTab === 'species') {
            elements = html.find("tbody#CBSpecies");
        }

        if (elements?.length) {
            if (options?.reload || !elements[0].children.length) {
                let items = await this.loadAndFilterSpecies();
                items.sort((a, b) => {
                    let aName = a.name;
                    let bName = b.name;
                    if (aName < bName) return -1;
                    if (aName > bName) return 1;
                    return 0;
                });
                const htmlItems = await renderTemplate(`modules/star-wars-compendium-fr/template/species-list.html`, {listItems : items})
                elements[0].innerHTML = htmlItems;
            }
        }
    }

    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        console.log("on change tab")
        /*const html = this.element;
        this.replaceList(html, active, {reload : false})*/
    }

    activateListeners(html) {
        super.activateListeners(html);
        console.log("activate listeners");
        this.replaceList(html, 'species', {reload : false});
    }
}

Hooks.on('ready', async () => {
    
    if (game.compendiumBrowser === undefined) {
        game.compendiumBrowser = new CompendiumBrowser();
        await game.compendiumBrowser.initialize();
    }
});