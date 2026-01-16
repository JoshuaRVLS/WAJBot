# WAJBot 🤖✨

Yo! Welcome to **WAJBot**. This is a super cool WhatsApp bot that I built using Baileys. It's not just a boring script; it has a full-blown **Web Dashboard** to control it!

## Features 🚀

-   **Dashboard Control**: Start, Stop, and Restart the bot from your browser (`http://localhost:3000`).
-   **Real-time Logs**: See who's messaging you and what they're saying, right on the web.
-   **History**: We use SQLite so your logs are saved. Refresh the page and they're still there!
-   **Commands**:
    -   `!sticker` (or `!s`): Make stickers from images/videos.
    -   `!meme`: Add text to images like a pro.
    -   `!everyone`: Tag everyone in a group (shh, don't abuse it).
    -   `!toimg`: Turn stickers back into images.
    -   `!ping`: Check if the bot is awake.
    -   `!help`: See the menu.

## How to Run 🏃‍♂️

1.  **Install stuff**:
    ```bash
    pnpm install
    ```

2.  **Setup Database**:
    ```bash
    npx prisma generate
    npx prisma migrate dev --name init
    ```

3.  **Run it**:
    ```bash
    pnpm dev
    ```

4.  **Connect**:
    -   Scan the QR code in your terminal.
    -   Go to `http://localhost:3000` to see the magic.

## Tech Stack 🛠️

-   **Node.js**: The brain.
-   **Baileys**: The WhatsApp magic.
-   **Express + EJS**: The web dashboard.
-   **Socket.IO**: Real-time updates.
-   **Prisma + SQLite**: Saving your chats.

Enjoy the bot! Peace. ✌️
