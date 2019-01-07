const commandHistory = [];
let commandHistoryIndex = 1;
let bookmarks;
let showUsername = true;
let showTime = true;
let showCommandArea = true;
let militaryTime = false;
let hasLightMode = false;
let theme = 'dark';

init();

function init() {
	getTheme();
	getSettings();
	getBookmarks();
	startTime();
	createEventHandlers();
}

function getTheme() {
	chrome.storage.local.get("theme", value => {
		if(value.theme) {
			console.log(value.theme);
			theme = value.theme;
			document.body.dataset.theme = theme;
			document.querySelector(".theme-toggle").innerText = (theme == "light" ? "Dark" : "Light") + " Mode";
		}
	});

	google.payments.inapp.getPurchases({
		'parameters': {'env': 'prod'},
		'success': (response) => {
			console.log(response);
			if(response.response.details.length > 0) {
				hasLightMode = true;
				document.querySelector('.settings-menu li i.locked').classList.add('inactive');
			}
		},
		'failure': (response) => console.log(response)
	});
}

function getSettings() {
	let userInput = document.querySelector(".hello input");
	chrome.storage.local.get(["username", "showUsername", "showTime", "militaryTime"], values => {
		if (values.showUsername === false) {
			document.querySelector(".hello").style.display = "none"
			document.querySelector(".name-toggle").innerHTML = "Show Name";
			showUsername = false;
		} 
		else userInput.value = values.username ? values.username : '';
		
		if (values.showTime === false) {
			document.querySelector(".time").style.display = "none"
			document.querySelector(".time-toggle").innerHTML = "Show Time";
			showTime = false;
		}
		if (values.militaryTime) militaryTime = values.militaryTime;
		
		document.querySelector('header').setAttribute("class", "active");
		document.querySelector('footer').setAttribute("class", "active");
	});
}

function getBookmarks() {
	// get bookmarks
	chrome.bookmarks.getTree(response => bookmarks = response[0].children[0].children);
}

function startTime() {
	const today = new Date();
	let hours = today.getHours();
	let minutes = today.getMinutes();
	let seconds = today.getSeconds();
	const ampm = hours >= 12 ? "pm" : "am";
	if (!militaryTime) {
		if (hours > 12) hours -= 12;
		if (hours == 0) hours += 12;
	}

	minutes = (minutes < 10) ? ("0" + minutes) : minutes;
	//seconds = checkTime(seconds);
	document.querySelector(".time").innerHTML = hours + ":" + minutes /*+ ":" + seconds */ + (militaryTime ? "" : " " + ampm);
	const timer = setTimeout(startTime, 100);
}

function createEventHandlers() {
	const userInput = document.querySelector(".hello input");
	userInput.addEventListener("keyup", () => {
		chrome.storage.local.set({ "username": userInput.value }, () => {});
	});

	const commandInput = document.querySelector(".command-bar input");
	commandInput.addEventListener("keypress", () => processCommand(commandInput));
	commandInput.addEventListener("keydown", () => traverseHistory(commandInput));
	commandInput.addEventListener("focus", () => commandInput.placeholder = "Type \"help\" for more options");
	commandInput.addEventListener("blur", () => commandInput.placeholder = "Hit [tab] to quickly type");

	const settingsButton = document.querySelector('footer .settings-button');
	const settingsMenu = document.querySelector('footer .settings-menu');
	settingsButton.addEventListener("click", () => settingsMenu.classList.add('active'));

	// if clicked outside settings menu
	const bodyClickEvent = document.body.addEventListener("click", event => {
		if (!settingsMenu.contains(event.target) && !settingsButton.contains(event.target)) { // or use: event.target.closest(selector) === null
			settingsMenu.classList.remove('active');
			document.removeEventListener('click', bodyClickEvent);
		}
	});

	const settingsOptions = document.querySelectorAll(".settings-menu ul li");
	settingsOptions[0].addEventListener("click", () => {
		showUsername = !showUsername;
		chrome.storage.local.set({ "showUsername": showUsername }, () => {});
		settingsOptions[0].innerHTML = (showUsername ? "Hide" : "Show") + " Name";
		document.querySelector(".hello").style.display = showUsername ? "block" : "none";
	})

	settingsOptions[1].addEventListener("click", () => {
		showTime = !showTime;
		chrome.storage.local.set({
			"showTime": showTime
		}, () => {});
		settingsOptions[1].innerHTML = (showTime ? "Hide" : "Show") + " Time";
		document.querySelector(".time").style.display = showTime ? "block" : "none";
	})

	settingsOptions[2].addEventListener("click", () => {
		militaryTime = !militaryTime;
		chrome.storage.local.set({
			"militaryTime": militaryTime
		}, () => {});
		settingsOptions[2].innerHTML = (militaryTime ? "12hr" : "24hr") + " Time";
	})

	settingsOptions[3].addEventListener("click", () => {
		if(hasLightMode) {
			theme = theme == "light" ? "dark" : "light";
			chrome.storage.local.set({
				"theme": theme
			}, () => {});
			settingsOptions[3].innerText = (theme == "light" ? "Dark" : "Light") + " Mode";
			document.body.dataset.theme = theme;
		}
		else {
			// buy prompt
			google.payments.inapp.buy({
				'parameters': {'env': 'prod'},
				'sku': "com.ssparvez.dev_tab.light_mode",
				'success': () => {
					hasLightMode = true
					document.querySelector('.settings-menu li i.locked').classList.remove('inactive');
				},
				'failure': () => console.log('failure')
			});
		}
	});
}

function processCommand(input) {
	if (event.key === "Enter" && input.value.trim() != "") {
		let tokens = input.value.split(" ");
		let output = {
			response: '',
			success: true
		};
		if (tokens[0] == "ls") {
			for (let entry of bookmarks) {
				if (!entry.children) {
					output.response += "<a href=\"" + entry.url + "\">" + entry.title + "</a>\t"
				}
			}
		} 
		else if (tokens[0] == "rm") {
			let bookmark = getBookmark(tokens[1]);
			if (bookmark != null) {
				chrome.bookmarks.remove(bookmark.id);
				bookmarks = bookmarks.filter(currentBookmark => currentBookmark.id == bookmark.id);
			} else output = {
				response: "Couldn't find bookmark",
				success: false
			};
		} 
		else if (tokens[0] == "exit") {
			chrome.tabs.getCurrent(tab => chrome.tabs.remove(tab.id))
		} 
		else if (tokens[0] == "help") {
			output.response = createHelpResponse();
		} 
		else if (tokens[0] == "search") {
			tokens.splice(0, tokens[1] == '-n' ? 2 : 1);
			if (tokens[1] == '-n') chrome.tabs.create({
			url: "http://www.google.com/search?q=" + tokens.join("+")
			})
			else chrome.tabs.update({
				url: "http://www.google.com/search?q=" + tokens.join("+")
			})
		} 
		else if (tokens[0] == "open") {
			if (tokens[1] == '-n') chrome.tabs.create({
				url: "http://" + tokens[2]
			});
			else chrome.tabs.update({
				url: "http://" + tokens[1]
			});
		} 
		else if (tokens[0] == "chrome") {
			if (tokens[1] == '-n') chrome.tabs.create({
				url: "chrome://" + tokens[2]
			});
			else chrome.tabs.update({
				url: "chrome://" + tokens[1]
			});
		} 
		else if (tokens[0] == "clear") {
			document.querySelector(".command-list").innerHTML = "";
		}
		// user can just click on bookmark from ls
		else if (tokens[0] == "bookmark") {
			let page = tokens[1] == '-n' ? tokens[2] : tokens[1];

			let bookmark = getBookmark(page);
			if (bookmark != null) {
				if (tokens.length > 2) chrome.tabs.create({
					url: bookmark.url
				})
				else chrome.tabs.update({
					url: bookmark.url
				})
			} else output = {
				response: "Couldn't find bookmark",
				success: false
			};
		} 
		else output = {
			response: tokens[0] + " is not a command",
			success: false
		};

		addCommandElements(input, output);
		storeCommand(input);
	}
}

function createHelpResponse() {
	let response = "Welcome to lineTab! A fun way to browse.";
	response += "\n\nAvailable commands:";
	response += "\nhelp\t\t\t\tbrings up this list"
	response += "\nls\t\t\t\tlists your primary bookmarks"
	response += "\nrm &lt;bookmark&gt;\t\t\tremoves the specified bookmark"
	response += "\nopen [-n] &lt;url&gt;\t\t\tlaunches the url typed in"
	response += "\nbookmark [-n] &lt;name&gt;\t\tlaunches the bookmark page"
	response += "\nchrome [-n] &lt;page&gt;\t\topens the chrome page"
	response += "\nsearch [-n] &lt;keywords&gt;...\tsearches the specified keywords on Google"
	response += "\nclear\t\t\t\tremoves all previous output"
	response += "\nexit\t\t\t\tcloses this tab"
	response += "\n\nOptions:"
	response += "\n-n\t\t\t\t Runs command in a new tab"
	return response;
}

function getBookmark(name) {
	for (let bookmark of bookmarks) {
		if (!bookmark.children && bookmark.title.toLowerCase() == name.toLowerCase()) {
			return bookmark;
		}
	}
	return null;
}

function storeCommand(input) {
	// store command
	commandHistory.push(input.value);
	commandHistoryIndex = commandHistory.length;
	input.value = "";
}

function addCommandElements(input, output) {
	const list = document.querySelector(".command-list");
	const isScrolledToBottom = list.scrollHeight - list.clientHeight <= list.scrollTop + 1;

	// add command item node
	const command = document.createElement("div");
	command.className = "command " + (output.success ? "success" : "error");
	command.innerHTML = input.value;
	list.appendChild(command);

	// add command response
	const response = document.createElement("div");
	response.className = "response " + (output.success ? "success" : "error");
	response.innerHTML = output.success ? output.response : ("- lineTab: " + output.response);
	list.appendChild(response);

	// scroll to bottom if isScrolledToBotto
	if (isScrolledToBottom) list.scrollTop = list.scrollHeight - list.clientHeight;
	else list.scroll({
		top: list.scrollHeight,
		behavior: 'smooth'
	})
}

function traverseHistory(input) {
	if (commandHistory.length > 0) {
		if (event.key == "ArrowUp") {
			event.preventDefault();
			if (commandHistoryIndex > 0) {
				input.value = commandHistory[commandHistoryIndex - 1];
				commandHistoryIndex--;
			}
		} else if (event.key == "ArrowDown") {
			event.preventDefault();
			if (commandHistoryIndex < commandHistory.length - 1) {
				input.value = commandHistory[commandHistoryIndex + 1];
				commandHistoryIndex++;
			} else if (commandHistoryIndex == commandHistory.length - 1) {
				commandHistoryIndex = commandHistory.length;
				input.value = "";
			}
		}
	}
}