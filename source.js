(function() {

class PinyinPicker extends ToolTippify(HoverOverCharacterPicker) {
	constructor() {
		super();
		this.pendingOn = null;
	}

	store(character, data) {
		let o = {};
		o[character] = data;
		browser.storage.local.set(o);
	}

	// download html (can't do raw wiki markup as it does not have the template renderings baked in)
	fetchCharacterInformation(c) {
		let url = "https://en.wiktionary.org/w/index.php?title="+encodeURIComponent(c);

		// other xml fetch + parse combinations do not seem to work out of firefox extension content script
		let request = new XMLHttpRequest();

		request.open("GET", url, true);
		request.responseType = "document";

		request.onload = (e) => {
			let result = "¯\_(ツ)_/¯";
			if(request.readyState !== 4) return;
			if(request.status < 400)  {
				try {
					// parse xml, grab pinyin pronounciation and chinese definitions
					let doc = request.responseXML;
					let mainTitle = doc.querySelector("span.Hani").innerText;
					let pinyinPronounciation = doc.querySelector("span.pinyin-t-form-of")?.innerText || doc.querySelector("span.pinyin-ts-form-of")?.innerText || "???";
					let definitions;
					let definitionTitles = doc.querySelectorAll("strong.Hani,headword[lang='zh']");
					for (let definitionTitle of definitionTitles) {
						if(definitionTitle.parentElement.nextElementSibling?.tagName === "OL" && definitionTitle.parentElement.previousElementSibling?.innerText === "Definitions[edit]") {
							definitions = definitionTitle.parentElement.nextElementSibling;
							break;
						}
					}
					// construct tooltip html
					result = "<h4>" + mainTitle + " " + pinyinPronounciation + "</h4>";
					if (definitions) result += definitions.outerHTML;
				} catch(err) {
					console.log(err);
				}
			}
			this.store(c,result);
			// still waiting on this character? if so, update tooltip
			if(this.pendingOn === c) {
				this.show(result);
			}
		};

		request.send(null);
	}

	pick(character) {
		this.pendingOn = character;
		browser.storage.local.get(character)
		.then((result) => {
			let r = result[character];
			if (r) {
				this.show(r);
			} else {
				r = "" + character + "...";
				this.store(character, r);
				this.show(r);
				this.fetchCharacterInformation(character);
			}
		});
	}

	blur() {
		this.pendingOn = null;
		this.show();
	}
}

let picker = new PinyinPicker();

browser.runtime.onMessage.addListener((message) => {
	if (message.command === "on") {
		picker.turnOn();
	} else if (message.command === "off") {
		picker.turnOff();
	}
});
})();
