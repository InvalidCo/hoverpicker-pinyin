(function(){
function errors(error) {
	console.log(this, error);
}

function turnon() {
	browser.tabs.query({active: true, currentWindow: true})
	.then(function(tabs) {
		browser.tabs.sendMessage(tabs[0].id, {
			command: "on"
		});
	})
	.catch(errors.bind("turnon"));
}

function turnoff() {
	browser.tabs.query({active: true, currentWindow: true})
	.then(function(tabs) {
		browser.tabs.sendMessage(tabs[0].id, {
			command: "off"
		});
	})
	.catch(errors.bind("turnoff"));
}

var isOn=false;
var togglebutton = document.getElementById("toggle");

togglebutton.addEventListener("click",function(evt) {
	if(isOn) {
		togglebutton.innerText = "OFF";
		turnoff();
	} else {
		togglebutton.innerText = "ON";
		turnon();
	}
	isOn = !isOn;
});
})();
