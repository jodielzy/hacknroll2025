function closeRulesPopup() {
    document.getElementById('rulesPopup').style.display = 'none';
    document.getElementById('questionBox').style.display = 'block';
  }
  
  function openWindow(windowName) {
    alert(`Opening ${windowName} window!`);
  }
  
  let currentStep = 0; // Track the current step in the sequence
  let removedCatState = null; // Store the removed cat images for undo functionality
  
  document.addEventListener("keydown", function (event) {
    if (event.ctrlKey && event.key === "o") {
      event.preventDefault();
      if (currentStep === 0) {
        openEmbeddedPopup();
        updateQuestion("Select All");
        currentStep = 1;
      }
    }
    if (event.ctrlKey && event.key === "a") {
      event.preventDefault();
      if (currentStep === 1) {
        sendMessageToIframe({ action: "highlightAllCats" });
        updateQuestion("Copy");
        currentStep = 2;
      } else if (currentStep === 4) {
        sendMessageToIframe({ action: "highlightAllCats" });
        updateQuestion("Cut");
        currentStep = 5;
      }
    }
    if (event.ctrlKey && event.key === "c") {
      event.preventDefault();
      if (currentStep === 2) {
        updateQuestion("Paste");
        currentStep = 3;
      }
    }
    if (event.ctrlKey && event.key === "v") {
      event.preventDefault();
      if (currentStep === 3) {
        sendMessageToIframe({ action: "addCatAndUnhighlightFirst" });
        updateQuestion("Select All");
        currentStep = 4;
      }
    }
    if (event.ctrlKey && event.key === "x") {
      event.preventDefault();
      if (currentStep === 5) {
        sendMessageToIframe({ action: "removeAllCats" });
        updateQuestion("Undo");
        currentStep = 6;
      }
    }
    if (event.ctrlKey && event.key === "z") {
      event.preventDefault();
      if (currentStep === 6) {
        sendMessageToIframe({ action: "restoreCats" });
        updateQuestion("Save");
        currentStep = 7;
      }
    }
    if (event.ctrlKey && event.key === "s") {
      event.preventDefault();
      if (currentStep === 7) {
        closeEmbeddedPopup(); // Close the embedded app
        document.getElementById("questionBox").style.display = "none"; // Hide the question box
        setTimeout(() => {
          document.getElementById("completionPopup").style.display = "block"; // Show the completion popup
        }, 100); // Slight delay for smooth transition
      }
    }    
  });
  
  function sendMessageToIframe(message) {
    const iframe = document.getElementById("embeddedAppFrame");
    if (iframe) {
      iframe.contentWindow.postMessage(message, "*");
    }
  }
  
  function openEmbeddedPopup() {
    document.getElementById("embeddedPopup").style.display = "flex";
  }
  
  function closeEmbeddedPopup() {
    document.getElementById("embeddedPopup").style.display = "none";
  }
  
  function updateQuestion(newText) {
    const hints = {
      "Open File": "Hint: Use Ctrl + O to open a file.",
      "Select All": "Hint: Use Ctrl + A to highlight everything.",
      "Copy": "Hint: Use Ctrl + C to copy highlighted items.",
      "Paste": "Hint: Use Ctrl + V to paste the copied content.",
      "Cut": "Hint: Use Ctrl + X to cut the highlighted items.",
      "Undo": "Hint: Use Ctrl + Z to undo the last action.",
      "Save": "Hint: Use Ctrl + S to save your progress.",
    };
  
    const questionBox = document.getElementById("questionBox");
    const hint = hints[newText] || "Hint: Use Ctrl + O to open a file.";
    
    questionBox.innerHTML = `
      ${newText}.
      <div class="hint" onclick="alert('${hint}')">Need a hint?</div>
    `;
    questionBox.style.display = "flex";
  }

  function playAgain() {
    document.getElementById("completionPopup").style.display = "none";
    currentStep = 0; // Reset the game logic
    updateQuestion("Open File"); // Reset to the first question
  }
  
  function returnToMenu() {
    window.location.href = "../templates/index.html"; // Navigate to the main menu
  }  
  
  function showHint() {
    alert("Hint: Use Ctrl + O to open a file.");
  }

  //race script

const socket = io('http://127.0.0.1:5000'); // Use the backend's URL


const textToType = document.getElementById('text-to-type');
const playerProgress = document.getElementById('player-progress');
const opponentProgress = document.getElementById('opponent-progress');
const startButton = document.getElementById('start-game');
const roomNameInput = document.getElementById('room-name');
const playerNameInput = document.getElementById('player-name');

let room = '';
let username = '';
let countdownInterval;
let currentShortcutIndex = 0; // Track the player's current shortcut index
let shortcuts = [];           // List of shortcuts for the game

// Join a room when the player clicks the button
startButton.addEventListener('click', () => {
    username = playerNameInput.value.trim(); // Get the player's name
    room = roomNameInput.value.trim();
    if (!username || !room) {
        alert('Please enter both your name and room name.');
        return;
    }

    console.log(`Joining room: ${room}, Username: ${username}`); // Debugging log
    socket.emit('join', { room, username });

    startButton.disabled = true;
    roomNameInput.disabled = true;
    textToType.innerText = 'Waiting for another player to join...';
});

// Update the current shortcut description
function updateShortcut() {
    if (currentShortcutIndex < shortcuts.length) {
        textToType.innerText = `${shortcuts[currentShortcutIndex].description}`;
    } else {
        textToType.innerText = 'Waiting for result...';
    }
}

// Handle the start countdown event
socket.on('start_countdown', (data) => {
    console.log(data.message);

    let countdown = 5; // Countdown from 5 seconds
    textToType.innerText = `Game starting in ${countdown} seconds...`;

    countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            textToType.innerText = `Game starting in ${countdown} seconds...`;
        } else {
            clearInterval(countdownInterval);
            updateShortcut(); // Start displaying the first shortcut
        }
    }, 1000);
});


// Handle individual player progress updates
socket.on('player_progress', (data) => {
    if (data.username === username) {
        // Update your progress
        const totalShortcuts = shortcuts.length;
        playerProgress.innerText = `Your Progress: ${data.progress}/${totalShortcuts}`;

        // Update the current shortcut if it's your progress
        if (data.progress !== currentShortcutIndex) {
            currentShortcutIndex = data.progress;
            updateShortcut();
        }
    }
});

// Handle game state updates
socket.on('game_state', (data) => {
    console.log('Game state received:', data);
    shortcuts = data.shortcuts;
    const totalShortcuts = shortcuts.length;

    // Update opponent progress
    const opponent = Object.keys(data.progress).find((user) => user !== username);
    if (opponent) {
        const opponentProgressValue = data.progress[opponent] || 0;
        opponentProgress.innerText = `Opponent's Progress: ${opponentProgressValue}/${totalShortcuts}`;
    } else {
        opponentProgress.innerText = `Opponent's Progress: 0/${totalShortcuts}`;
    }
});

// Handle keybind input
document.addEventListener('keydown', (event) => {
    const keybind = getKeybind(event); // Capture the keybind
    console.log(`Keybind pressed: ${keybind}`);

    // Prevent default browser behavior for specific shortcuts
     if (keybind === "Ctrl+F" || keybind === "Ctrl+S" || keybind === "Ctrl+P"
        || keybind === "Ctrl+O"
     ) {
        event.preventDefault(); // Stop the browser's default action
        console.log(`Prevented default for: ${keybind}`);
    }

    // Emit the keybind to the backend for validation
    if (room && username) {
        socket.emit('input', { room, username, keybind });
    } else {
        console.warn('Room or username is not set.');
    }
});

function getKeybind(event) {
    let keys = [];
    if (event.ctrlKey) keys.push("Ctrl");
    if (event.shiftKey) keys.push("Shift");
    if (event.altKey) keys.push("Alt");

    // Handle special keys
    const specialKeys = ["Enter", "Backspace", "Tab"];
    if (specialKeys.includes(event.key)) {
        keys.push(event.key);
    } else {
        keys.push(event.key.toUpperCase());
    }

    return keys.join("+");
}

// Handle the game result (victory or loss)
socket.on('game_result', (data) => {
    if (!room) {
        console.warn("Game result received, but the player is not in a room.");
        return;
    }

    if (data.result === 'victory') {
        showVictoryScreen();
    } else if (data.result === 'loss') {
        showLossScreen();
    }
});

// Display the victory screen
function showVictoryScreen() {
    document.body.innerHTML = `
        <div style="text-align: center; margin-top: 50px;">
            <h1>Congratulations! You Win! 🏆</h1>
            <button onclick="restartGame()">Play Again</button>
        </div>
    `;
}

// Display the loss screen
function showLossScreen() {
    document.body.innerHTML = `
        <div style="text-align: center; margin-top: 50px;">
            <h1>Sorry, You Lost! 😔</h1>
            <button onclick="restartGame()">Try Again</button>
        </div>
    `;
}

// Restart the game
function restartGame() {
    location.reload(); // Reload the page to restart
}

  