const result = document.querySelector("#result");
const xmlInput = document.querySelector("#xml-input");
const tableContent = document.querySelector("#tableContent");
const resultCount = document.querySelector("#result-count");
const STORAGE_KEY = "farmingprice-products";
const monthNames = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
];

function render(products) {
    const table = document.createElement("table");
    const productCount = Object.values(products).reduce((count, items) => count + items.length, 0);
    resultCount.textContent = `${productCount} prodott${productCount === 1 ? "o" : "i"}`;
    table.className = "month-table";
    const header = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (const mese of Object.keys(products)) {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = mese;
        headerRow.append(cell);
    }
    header.append(headerRow);

    const body = document.createElement("tbody");
    const productRow = document.createElement("tr");
    const formatPrice = prezzo => new Intl.NumberFormat("it-IT", {
        maximumFractionDigits: 2
    }).format(prezzo);

    for (const prodottiDelMese of Object.values(products)) {
        const cell = document.createElement("td");
        const list = document.createElement("ul");
        list.className = "month-product-list";

        for (const prodotto of prodottiDelMese) {
            const item = document.createElement("li");
            item.className = "month-product";
            item.textContent = prodotto.name;
            item.title = `Prezzo massimo: ${formatPrice(prodotto.maxPrice)} · Prezzo minimo: ${formatPrice(prodotto.minPrice)}`;
            item.setAttribute("aria-label", `${prodotto.name}. ${item.title}`);
            list.append(item);
        }

        if (prodottiDelMese.length === 0) {
            cell.className = "month-empty";
            cell.textContent = "—";
        } else {
            cell.append(list);
        }
        productRow.append(cell);
    }

    body.append(productRow);
    table.append(header, body);
    const wrapper = document.createElement("div");
    wrapper.className = "month-table-wrap";
    wrapper.append(table);
    tableContent.replaceChildren(wrapper);
}

function mostraRisultati(products) {
    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "csv-download-button";
    downloadButton.textContent = "Scarica CSV";
    downloadButton.addEventListener("click", () => {
        const csv = Object.entries(products)
            .map(([mese, prodotti]) => [mese, ...prodotti.map(prodotto => prodotto.name)].map(valore => {
                const testo = String(valore);
                return /[;\"\r\n]/.test(testo) ? `"${testo.replaceAll("\"", "\"\"")}"` : testo;
            }).join(";"))
            .join("\r\n");
        const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = "prodotti-per-mese.csv";
        link.click();
        URL.revokeObjectURL(url);
    });

    render(products);
    result.replaceChildren(downloadButton);
}

function prodottiValidi(products) {
    return products && typeof products === "object" &&
        Object.keys(products).length === monthNames.length &&
        monthNames.every(mese => Array.isArray(products[mese]) && products[mese].every(prodotto =>
            prodotto && typeof prodotto.name === "string" &&
            Number.isFinite(prodotto.maxPrice) && Number.isFinite(prodotto.minPrice)
        ));
}

function caricaDatiSalvati() {
    try {
        const savedProducts = localStorage.getItem(STORAGE_KEY);
        if (savedProducts === null) return;

        const products = JSON.parse(savedProducts);
        if (!prodottiValidi(products)) throw new Error("Dati salvati non validi");
        mostraRisultati(products);
    } catch (errore) {
        console.warn("Impossibile caricare i dati salvati", errore);
    }
}

function estraiXml(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const products = Object.fromEntries(monthNames.map(mese => [mese, []]));
    const errore = xml.querySelector("parsererror");
    if (errore) {
        throw new Error("XML non valido");
    }
    const filltypes = xml.querySelectorAll("fillType");
    for (let filltype of filltypes) {
        const fillTypeName = filltype.getAttribute("fillType");
        const name = traduzione[fillTypeName] || fillTypeName;
        const history = filltype.querySelector(":scope > history");
        if (history) {
            const period = history.querySelectorAll('period');
            let maxPrice = -Infinity;
            let minPrice = Infinity;
            let bestMonth;
            for (let p of period) {
                const price = parseFloat(p.textContent);
                if (!Number.isFinite(price)) continue;
                if (price > maxPrice) {
                    maxPrice = price;
                    bestMonth = mesi[p.getAttribute("period")];
                }
                minPrice = Math.min(minPrice, price);
            }
            if (maxPrice > 0 && maxPrice !== minPrice && products[bestMonth]) {
                products[bestMonth].push({ name, maxPrice, minPrice });
            }
        }
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (errore) {
        console.warn("Impossibile salvare i dati localmente", errore);
    }
    mostraRisultati(products);
}

async function gestisciUploadXml() {
    const file = document.querySelector("#xml-file").files[0];
    if (!file) return;
    xmlInput.value = await file.text();
}

document.querySelector("#xml-file").addEventListener("change", gestisciUploadXml);

document.querySelector("#extract-button").addEventListener("click", () => {
    const xmlText = xmlInput.value;
    try {
        estraiXml(xmlText);
    } catch (errore) {
        console.error(errore.message);
        result.innerHTML = `<p class="error error-message">Errore: ${errore.message}</p>`;
    }
});

caricaDatiSalvati();

