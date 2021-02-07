(function() {

/*
 * return HTML node with allowedTags and text content of allowedTextContentTags, removing all other tags
 * no attributes are retained
 */
function sanitiseHtml(content, allowedTags = ["OL", "LI", "P", "BR"], allowedTextContentTags = ["A", "SPAN"]) {
	if(typeof content == "string") {
		return content;
	} else if(content.nodeType == 3) { // text node?
		return content.textContent;
	} else if(allowedTags.includes(content.tagName)) {
		let accumulator = "<"+content.tagName+">";
		for(let i = 0; i < content.childNodes.length; i++) {
			let child = content.childNodes[i];
			accumulator += sanitiseHtml(child, allowedTags, allowedTextContentTags);
		}
		accumulator += "</"+content.tagName+">";
		return accumulator;
	} else if(allowedTextContentTags.includes(content.tagName)) {
		return content.textContent;
	} else {
		return "";
	}
}

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
		return new Promise((resolve, reject) => {
			let url = "https://en.wiktionary.org/w/index.php?title="+encodeURIComponent(c);

			// other xml fetch + parse combinations do not seem to work out of firefox extension content script
			let request = new XMLHttpRequest();

			request.open("GET", url, true);
			request.responseType = "document";

			request.onload = (e) => {
				let result = "¯\\_(ツ)_/¯";
				if(request.readyState !== 4) return;
				if(request.status < 400)  {
					try {
						// parse xml, grab pinyin pronounciation and chinese definitions
						let doc = request.responseXML;
						let mainTitle = doc.querySelector("span.Hani").innerText;
						let pinyinPronounciation = doc.querySelector("span.pinyin-t-form-of")?.innerText || doc.querySelector("span.pinyin-ts-form-of")?.innerText;

						// construct tooltip html
						result = "<h4>" + mainTitle;
						if (pinyinPronounciation) result += " " + pinyinPronounciation
						result += "</h4>";

						// is simplified form with page reference to another character?
						let belements = doc.querySelectorAll("b");
						let redirectionElement = null;
						for (const b of belements) {
							if(b.textContent == "For pronunciation and definitions of ") {
								redirectionElement = b;
								break;
							}
						}
						if(redirectionElement != null) {
							let nextCharacter = redirectionElement.nextElementSibling.nextElementSibling.childNodes[1].textContent;
							result += "simplified form of " + nextCharacter + "<br/>";
							// find next character and append the result to tooltip html
							// FIXME: this should search cache first instead of retriggering a network request
							this.fetchCharacterInformation(nextCharacter).then((r) => {
								result += r;
								resolve(result);
							})
							.catch((err)=>{
								reject(err);
							});
						} else {
							// no redirections
							let definitions;
							let definitionTitles = doc.querySelectorAll("strong.Hani,headword[lang='zh']");
							for (let definitionTitle of definitionTitles) {
								if(definitionTitle.parentElement.nextElementSibling?.tagName === "OL" && definitionTitle.parentElement.previousElementSibling?.innerText === "Definitions[edit]") {
									definitions = definitionTitle.parentElement.nextElementSibling;
									break;
								}
							}
							// add definitions to html result
							if (definitions) result += sanitiseHtml(definitions);
							resolve(result);
						}
					} catch(err) {
						reject(err);
					}
				}
			};

			request.send(null);
		});
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
				this.fetchCharacterInformation(character)
				.then((result) => {
					this.store(character, result);
					// still waiting on this character? if so, update tooltip
					if(this.pendingOn == character) {
						this.show(result);
					}
				})
				.catch((err)=>{
					console.log(err);
				});
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
