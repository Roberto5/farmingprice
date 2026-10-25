const result = document.querySelector("#result");
const xmlInput = document.querySelector("#xml-input");

function estraiXml(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    let filltypes = [];
    let products = {
        gennaio: [],
        febbraio: [],
        marzo: [],
        aprile: [],
        maggio: [],
        giugno: [],
        luglio: [],
        agosto: [],
        settembre: [],
        ottobre: [],
        novembre: [],
        dicembre: []
    };
    const errore = xml.querySelector("parsererror");
    if (errore) {
        throw new Error("XML non valido");
    }
    filltypes = xml.querySelectorAll("fillType");
    //console.log(filltypes);
    for (let filltype of filltypes) {
        let name = traduzione[filltype.getAttribute("fillType")];
        const history = filltype.querySelector(":scope > history");
        if (history) {
            const period = history.querySelectorAll('period');
            console.log(period);
            // calcolo il mese del massimo prezzo 
            let max = {
                mese: mesi[period[0].getAttribute('period')],
                prezzo: 0
            };
            let prev_prezzo=parseFloat(period[0].textContent);
            let equal=true;
            for (let p of period) {
                let prezzo = parseFloat(p.textContent);
                if (equal && prev_prezzo!=prezzo) {
                    equal=false;
                }
                if (prezzo > max.prezzo) {
                    max = { mese: mesi[p.getAttribute('period')], prezzo: prezzo };
                }
            }
            if ((max.prezzo > 0)&& !equal)
                products[max.mese].push(name);
            //if (equal) console.log('uguale '+name);
        }
    }
    let resultText='';
    for (let mese in products) {
        resultText+=mese+';';
        resultText+=products[mese].join(';')+'\n';
    }
    //console.log(products);
    const output = document.createElement("pre");
    output.textContent = resultText;

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "csv-download-button";
    downloadButton.textContent = "Scarica CSV";
    downloadButton.addEventListener("click", () => {
        const csv = Object.entries(products)
            .map(([mese, nomi]) => [mese, ...nomi].map(valore => {
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

    result.replaceChildren(output, downloadButton);
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

