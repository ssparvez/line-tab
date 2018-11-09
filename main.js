const commandHistory = [];
let commandHistoryIndex = 1;
let bookmarks;
let showUsername = true;
let showTime = true;
let showCommandArea = true;
let militaryTime = false;

init();

function init() {
    getSettings();
    getBookmarks();

    document.body.setAttribute("class", "active");
    startTime();
    createEventHandlers();
}

function getSettings() {
    let userInput = document.querySelector("#hello input");
    chrome.storage.local.get(["username", "showUsername", "showTime", "militaryTime", "showCommandArea"], values => {
        if(values.showUsername === false) {
            document.getElementById("hello").style.display = "none"
            document.querySelector(".settings-menu ul li:nth-child(1)").innerHTML = "Show Name";
            showUsername = false;
        }
        else userInput.value = values.username
        if(values.showTime === false) {
            document.getElementById("time").style.display = "none"
            document.querySelector(".settings-menu ul li:nth-child(2)").innerHTML = "Show Time";
            showTime = false;
        }
        if(values.militaryTime) militaryTime = values.militaryTime;
    });
}

function getBookmarks() {
    // get bookmarks
    chrome.bookmarks.getTree(response => {
        console.log(response[0].children[0].children);
        bookmarks = response[0].children[0].children;
    });
}

function startTime() {
    const today = new Date();
    let hours = today.getHours();
    let minutes = today.getMinutes();
    let seconds = today.getSeconds();
    const ampm = hours >= 12 ? "pm" : "am";
    if(!militaryTime) {    
        if(hours > 12) hours -= 12;
        if(hours == 0) hours += 12;
    }
    
    minutes = (minutes < 10) ? ("0" + minutes) : minutes;
    //seconds = checkTime(seconds);
    document.getElementById("time").innerHTML = hours + ":" + minutes /*+ ":" + seconds */ + (militaryTime ? "" : " " + ampm);
    const timer = setTimeout(startTime, 500);
}

function createEventHandlers() {
    let userInput = document.querySelector("#hello input");
    userInput.addEventListener("keyup", () => {
        chrome.storage.local.set({ "username": userInput.value }, () => {});
    });

    let commandInput = document.querySelector("#command input");
    commandInput.addEventListener("keypress", () => keyPress(commandInput));
    commandInput.addEventListener("keydown", () => keyDown(commandInput));
    commandInput.addEventListener("focus", () => commandInput.placeholder = "Type \"help\" for more options");
    commandInput.addEventListener("blur", () => commandInput.placeholder = "Hit [tab] to quickly type");

    let settingsButton = document.querySelector('footer i');
    let settingsMenu = document.querySelector('footer .settings-menu');
    settingsButton.addEventListener("click", () => settingsMenu.classList.add('active'));

    // if clicked outside settings menu
    let bodyClickEvent = document.body.addEventListener("click", event => {
        if (!settingsMenu.contains(event.target) && !settingsButton.contains(event.target)) { // or use: event.target.closest(selector) === null
            settingsMenu.classList.remove('active');
            document.removeEventListener('click', bodyClickEvent);
        }
    });

    settingsOptions = document.querySelectorAll(".settings-menu ul li");
    settingsOptions[0].addEventListener("click", () => {
        showUsername = !showUsername;
        chrome.storage.local.set({ "showUsername": showUsername }, () => {});
        settingsOptions[0].innerHTML = (showUsername? "Hide" : "Show") + " Name";
        document.getElementById("hello").style.display = showUsername? "block" : "none";

    })

    settingsOptions[1].addEventListener("click", () => {
        showTime = !showTime;
        chrome.storage.local.set({ "showTime": showTime }, () => {});
        settingsOptions[1].innerHTML = (showTime? "Hide" : "Show") + " Time";
        document.getElementById("time").style.display = showTime? "block" : "none";
    })

    settingsOptions[2].addEventListener("click", () => {
        militaryTime = !militaryTime;
        chrome.storage.local.set({ "militaryTime": militaryTime }, () => {});
        settingsOptions[2].innerHTML = (militaryTime? "12hr" : "24hr") + " Time";
    })

}

async function keyPress(commandInput) {
    if(event.key === "Enter" && commandInput.value.trim() != "") {
        let commandTokens = commandInput.value.split(" ");
        console.log(commandTokens)
        let commandSuccess = true;
        let commandResponse = "";
        if(commandTokens[0] == "ls") {
            console.log(bookmarks);
            for(let entry of bookmarks) {
                if(!entry.children) {
                    commandResponse += "<a style=\"color: #F3F7A2;\" href=\"" + entry.url + "\">" + entry.title + "</a>\t"
                }
            }
        }
        else if(commandTokens[0] == "rm") {
            let found = false;
            for(let i = 0; i < bookmarks.length; i++) {
                if(!bookmarks[i].children && bookmarks[i].title.toLowerCase() == commandTokens[1].toLowerCase()) {
                    if(bookmarks[i].children) chrome.bookmarks.removeTree(bookmarks[i].id);
                    else chrome.bookmarks.remove(bookmarks[i].id);
                    bookmarks.splice(i, 1);
                    found = true;
                    break;
                }
            }
            if(!found) {
                commandSuccess = false;
                commandResponse += "Couldn't find bookmark";
            }
        }
        else if(commandTokens[0] == "exit") {
            chrome.tabs.getCurrent(tab => chrome.tabs.remove(tab.id))
        }
        else if(commandTokens[0] == "help") {
            commandResponse += "Welcome to devTab! A fun way to browse.";
            commandResponse += "\n\nAvailable commands:";
            commandResponse += "\nhelp\t\t\t\tbrings up this list"
            commandResponse += "\nls\t\t\t\tlists your primary bookmarks"
            commandResponse += "\nrm &lt;bookmark&gt;\t\t\tremoves the specified bookmark"
            commandResponse += "\nopen [-n] &lt;url&gt;\t\t\tlaunches the url typed in"
            commandResponse += "\nchrome [-n] &lt;page&gt;\t\topens the chrome page"
            commandResponse += "\nsearch [-n] &lt;keywords&gt;...\tsearches the specified keywords on Google"
            commandResponse += "\nexit\t\t\t\tcloses this tab"
            commandResponse += "\n\nOptions:"
            commandResponse += "\n-n\t\t\t\t Runs command in a new tab"
        }
        else if(commandTokens[0] == "search") {
            if(commandTokens[1] == '-n') {
                commandTokens.splice(0, 2);
                chrome.tabs.create({ url:  "http://www.google.com/search?q=" + commandTokens.join("+")})     
            }
            else {
                commandTokens.splice(0, 1);
                chrome.tabs.update({ url:  "http://www.google.com/search?q=" + commandTokens.join("+")}) 
            }
        }
        else if(commandTokens[0] == "open") {
            if(commandTokens[1] == '-n') {
                chrome.tabs.create({url: "http://" + commandTokens[2]}); 
            }
            else {
                chrome.tabs.update({url: "http://" + commandTokens[1]}); 
            }
        }
        else if(commandTokens[0] == "chrome") {
            if(commandTokens[1] == '-n') {
                chrome.tabs.create({ url:  "chrome://" + commandTokens[2]})            
            }
            else {
                chrome.tabs.update({ url:  "chrome://" + commandTokens[1]})            
            }            
        }
        // user can just click on bookmark from ls
       /* else if(commandTokens[0] == "bookmark") {
            let found = false;
            for(let i = 0; i < bookmarks.length; i++) {
                if(!bookmarks[i].children && bookmarks[i].title.toLowerCase() == commandTokens[1].toLowerCase()) {
                    chrome.tabs.update({ url: bookmarks[i].url})
                    found = true;
                    break;
                }
            }
            if(!found) {
                commandSuccess = false;
                commandResponse += "Couldn't find bookmark";
            }
        }*/
        else {
            commandSuccess = false;
            commandResponse = commandTokens[0] + " is not a command";
        }

        addCommandElements(commandInput, commandResponse, commandSuccess);
        storeCommand(commandInput);
    }
}

function storeCommand(commandInput) {
    // store command
    commandHistory.push(commandInput.value);
    commandHistoryIndex = commandHistory.length;   
    commandInput.value = "";
}

function addCommandElements(commandInput, commandResponse, commandSuccess) {
    const commandList = document.getElementById("command-list");
    let isScrolledToBottom = commandList.scrollHeight - commandList.clientHeight <= commandList.scrollTop + 1;
    console.log(commandList.scrollHeight - commandList.clientHeight,  commandList.scrollTop + 1);

    // add command item node
    const commandItem = document.createElement("div");
    commandItem.className = "item";
    commandItem.innerHTML = commandInput.value;
    commandItem.style.color = commandSuccess ? "#0fa" : "#f07";
    commandList.appendChild(commandItem);

    // add command response
    console.log(commandResponse)
    const commandItemResponse = document.createElement("div");
    commandItemResponse.className = "response";
    commandItemResponse.innerHTML = commandSuccess ? commandResponse : ("- devTab: " + commandResponse);
    commandList.appendChild(commandItemResponse);

    // scroll to bottom if isScrolledToBotto
    if(isScrolledToBottom) commandList.scrollTop = commandList.scrollHeight - commandList.clientHeight;
    else commandList.scroll({top: commandList.scrollHeight, behavior: 'smooth' })
}

function keyDown(commandInput) {
    if(commandHistory.length > 0) {
        if(event.key == "ArrowUp") {
            event.preventDefault();
            if(commandHistoryIndex > 0) {
                commandInput.value = commandHistory[commandHistoryIndex - 1];
                commandHistoryIndex--;
            }
        }
        else if(event.key == "ArrowDown") {
            event.preventDefault();
            if(commandHistoryIndex < commandHistory.length - 1) {
                commandInput.value = commandHistory[commandHistoryIndex + 1];
                commandHistoryIndex++;
            }
            else if(commandHistoryIndex == commandHistory.length - 1) {
                commandHistoryIndex = commandHistory.length;
                commandInput.value = "";
            }
        }
    }   
}