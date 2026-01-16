async function controlBot(action) {
    try {
        await fetch(`/api/bot/${action}`, { method: 'POST' });
    } catch (err) {
        console.error('Failed to control bot:', err);
    }
}

const socket = io();
const logsDiv = document.getElementById('logs');
const statusSpan = document.getElementById('status');

// Buttons
const btnStart = document.querySelector('.btn-start');
const btnStop = document.querySelector('.btn-stop');
const btnRestart = document.querySelector('.btn-restart');

function updateButtons(status) {
    if (status === 'Online') {
        btnStart.style.display = 'none';
        btnStop.style.display = 'inline-block';
        btnRestart.style.display = 'inline-block';
        btnStart.disabled = false;
        btnStop.disabled = false;
        btnRestart.disabled = false;
        btnRestart.innerText = 'Restart';
    } else if (status === 'Offline') {
        btnStart.style.display = 'inline-block';
        btnStop.style.display = 'none';
        btnRestart.style.display = 'none';
        btnStart.disabled = false;
        btnStart.innerText = 'Start';
    } else {
        // Connecting or Restarting
        btnStart.disabled = true;
        btnStop.disabled = true;
        btnRestart.disabled = true;

        if (status === 'Restarting...') {
            btnRestart.style.display = 'inline-block';
            btnRestart.innerText = 'Restarting...';
            btnStop.style.display = 'inline-block';
            btnStart.style.display = 'none';
        } else {
            // Connecting...
            btnStart.style.display = 'inline-block';
            btnStart.innerText = 'Connecting...';
            btnStop.style.display = 'none';
            btnRestart.style.display = 'none';
        }
    }
}

// Initial check
updateButtons(statusSpan.innerText);

// startTime is defined in the global scope by index.ejs

socket.on('status_update', (status) => {
    statusSpan.innerText = status;
    statusSpan.style.color = status === 'Online' ? 'green' : 'red';
    updateButtons(status);
});

// Uptime Formatter
function updateUptime() {
    if (typeof startTime === 'undefined') return;

    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    let timeString = '';
    if (hours > 0) timeString += `${hours} hour${hours !== 1 ? 's' : ''} `;
    if (minutes > 0) timeString += `${minutes} minute${minutes !== 1 ? 's' : ''} `;
    timeString += `${seconds} second${seconds !== 1 ? 's' : ''}`;

    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) uptimeEl.innerText = timeString;
}

setInterval(updateUptime, 1000);
updateUptime();

socket.on('connect', () => {
    console.log('Connected to realtime server');
});

socket.on('msg_received', (data) => {
    // Remove "waiting" message if present
    if (logsDiv.innerText.includes('Waiting for messages...')) {
        logsDiv.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'log-item';
    item.innerHTML = `
        <span class="log-time">[${data.timestamp}]</span>
        <span class="log-sender">${data.sender.split('@')[0]}:</span>
        <span class="log-text">${data.text}</span>
    `;
    logsDiv.prepend(item);
});
