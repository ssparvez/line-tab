const commandHistory = [];
let commandHistoryIndex = 1;

let acceptedCommands = {
    ls: console.log('run command'),
    help: console.log('help')
}   

chrome.identity.getProfileUserInfo((userInfo) => {
    console.log(userInfo);
});

init();

function init() {
    startTime();
    createEventHandlers();
}

function startTime() {
    const today = new Date();
    let hours = today.getHours();
    let minutes = today.getMinutes();
    let seconds = today.getSeconds();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours -= 12;
    minutes = (minutes < 10) ? ("0" + minutes) : minutes;
    //seconds = checkTime(seconds);
    document.getElementById('time').innerHTML = hours + ":" + minutes /*+ ":" + seconds */ + ' ' + ampm;
    const timer = setTimeout(startTime, 500);
}

function createEventHandlers() {
    let commandInput = document.querySelector('#command input');
    commandInput.addEventListener('keypress', () => keyPress(commandInput));
    commandInput.addEventListener('keydown', () => keyDown(commandInput));
}

function keyPress(commandInput) {
    if(event.key === 'Enter' && commandInput.value.trim() != '') {
        console.log(commandInput.value);

        let commandTokens = commandInput.value.split(' ');
        console.log(commandTokens)
        let commandSuccess = true;
        let commandResponse = '';
        if(commandTokens[0] == 'ls') chrome.bookmarks.getTree((bookmarkers) => console.log(bookmarkers));
        else if(commandTokens[0] == 'help') {
            commandResponse = 'The following commands are internally defined. Typing help brings up this list '
        }
        else if(commandTokens[0] == 'chrome') chrome.tabs.update({ url:  'chrome://' + commandTokens[1]})
        else if(commandTokens[0] == 'search') {
            commandTokens.splice(0, 1); 
            chrome.tabs.update({ url:  'http://www.google.com/search?q=' + commandTokens.join('+')}) 
        }
        else if(commandTokens[0] == 'goto') {
            //chrome.tabs.query({url: 'http://' + commandTokens[1]});
            // fetch('http://' + commandTokens[1])
            //     .then(response => console.log('success'))
            //     .catch(error => console.log(error));
            chrome.tabs.update({url: 'http://' + commandTokens[1]}); 
        }
        else {
            commandSuccess = false;
            commandResponse = commandTokens[0] + " is not a command";
        }

        // add command item node
        const commandItem = document.createElement('div');
        commandItem.className = 'command-list-item';
        commandItem.innerText = commandInput.value;
        commandItem.style.color = commandSuccess ? '#0fa' : '#f07';
        document.getElementById('command-list').appendChild(commandItem);

        const commandItemResponse = document.createElement('div');
        commandItemResponse.className = 'command-list-item';
        commandItemResponse.innerText = commandSuccess ? commandResponse : ('- devTab: ' + commandResponse);
        document.getElementById('command-list').appendChild(commandItemResponse);
        
        // store command
        commandHistory.push(commandInput.value);
        commandHistoryIndex = commandHistory.length;   
        console.log(commandHistory);
        commandInput.value = '';
    }
}

function keyDown(commandInput) {
    if(commandHistory.length > 0) {
        if(event.key == 'ArrowUp') {
            event.preventDefault();
            if(commandHistoryIndex > 0) {
                commandInput.value = commandHistory[commandHistoryIndex - 1];
                commandHistoryIndex--;
            }
        }
        else if(event.key == 'ArrowDown') {
            event.preventDefault();
            if(commandHistoryIndex < commandHistory.length - 1) {
                commandInput.value = commandHistory[commandHistoryIndex + 1];
                commandHistoryIndex++;
            }
            else if(commandHistoryIndex == commandHistory.length - 1) {
                commandHistoryIndex = commandHistory.length;
                commandInput.value = '';
            }
        }
    }
    
}