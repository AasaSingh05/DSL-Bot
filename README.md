# DSLBot

Simple Discord bot for small servers with:
- Starboard (forward messages with ⭐ reactions)
- Rotating presence (Playing / Listening)
- Message commands using `&` prefix
- A sample slash command (`/ping`)

## Requirements
- Node.js 18+ (tested on Node 22)
- npm
- A Discord bot application & token

## Setup

1. Install dependencies:
   ```bash
   npm install
   npm install jimp@^1.0.0
   ```

2. Create a `.env` in the project root (same folder as `index.js`) and add the following keys:

   Example `.env`:
   ```
   BOT_TOKEN=your_bot_token_here
   CLIENT_ID=your_application_id_here

   # Starboard
   STARBOARD_CHANNEL_ID=123456789012345678
   STAR_THRESHOLD=2

   # Presence rotation (pipe-separated lists)
   PRESENCE_PLAYING=House Party|Working on DSLBot|Coding challenges
   PRESENCE_LISTENING=lofi beats|the community|requests
   PRESENCE_INTERVAL_MS=30000

   # Other optional values
   DO_IT_GIF=https://media.giphy.com/...
   KEET_IMAGE=https://i.imgur.com/...
   ```

3. Start the bot:
   ```bash
   npm start
   ```

## Features / Commands

- Starboard
  - Forwards a message to the configured `STARBOARD_CHANNEL_ID` when it receives at least `STAR_THRESHOLD` ⭐ reactions.
  - Forwarded message includes an embed (color sampled from the author's avatar) and a "Jump to message" link button.
  - Note: `STARBOARD_CHANNEL_ID` must be set or starboard posts will be skipped.

- Presence rotation
  - Controlled by `PRESENCE_PLAYING` and `PRESENCE_LISTENING` env keys (use `|` to separate entries).
  - Rotates in round-robin between the two activity types at `PRESENCE_INTERVAL_MS` milliseconds.

- Text commands (prefix: `&`)
  - `&yourmom` or `&ym` — reply to a message with this command; the bot replies to the original message with:
    ```
    your mom is a <original message content>
    ```
    Must be used as a reply to a message.
  - `&keet` — bot replies with an image. Use `KEET_IMAGE` env var to change the image.

- Automatic responses
  - If anyone says "do it" (or "dewit"), the bot replies with a GIF (set by `DO_IT_GIF`).

- Slash commands
  - `/ping` — replies with latency info (registered globally on startup).

## Troubleshooting

- "STARBOARD_CHANNEL_ID is not set" — add `STARBOARD_CHANNEL_ID` to `.env` with the channel ID (enable Developer Mode in Discord to copy IDs).
- Jimp errors (e.g. `Jimp.read is not a function`) — ensure you installed `jimp@^1.0.0`.
- Presence not changing / `client.user` null — rotation must start after the bot is ready (the code starts rotation on `ClientReady`).

## Contributing / Extending
- Slash commands live in the `commands/` folder.
- Message-based command logic is in `index.js` — consider moving each `&` command into its own module for cleanliness.
- For persistence (starboard map, config), add a small JSON DB or sqlite.

License: MIT
```// filepath: c:\Users\epics\OneDrive\Desktop\work\Programming-practice\DSLBot\README.md

# DSLBot

Simple Discord bot for small servers with:
- Starboard (forward messages with ⭐ reactions)
- Rotating presence (Playing / Listening)
- Message commands using `&` prefix
- A sample slash command (`/ping`)

## Requirements
- Node.js 18+ (tested on Node 22)
- npm
- A Discord bot application & token

## Setup

1. Install dependencies:
   ```bash
   npm install
   npm install jimp@^1.0.0
   ```

2. Create a `.env` in the project root (same folder as `index.js`) and add the following keys:

   Example `.env`:
   ```
   BOT_TOKEN=your_bot_token_here
   CLIENT_ID=your_application_id_here

   # Starboard
   STARBOARD_CHANNEL_ID=123456789012345678
   STAR_THRESHOLD=2

   # Presence rotation (pipe-separated lists)
   PRESENCE_PLAYING=House Party|Working on DSLBot|Coding challenges
   PRESENCE_LISTENING=lofi beats|the community|requests
   PRESENCE_INTERVAL_MS=30000

   # Other optional values
   DO_IT_GIF=https://media.giphy.com/...
   KEET_IMAGE=https://i.imgur.com/...
   ```

3. Start the bot:
   ```bash
   npm start
   ```

## Features / Commands

- Starboard
  - Forwards a message to the configured `STARBOARD_CHANNEL_ID` when it receives at least `STAR_THRESHOLD` ⭐ reactions.
  - Forwarded message includes an embed (color sampled from the author's avatar) and a "Jump to message" link button.
  - Note: `STARBOARD_CHANNEL_ID` must be set or starboard posts will be skipped.

- Presence rotation
  - Controlled by `PRESENCE_PLAYING` and `PRESENCE_LISTENING` env keys (use `|` to separate entries).
  - Rotates in round-robin between the two activity types at `PRESENCE_INTERVAL_MS` milliseconds.

- Text commands (prefix: `&`)
  - `&yourmom` or `&ym` — reply to a message with this command; the bot replies to the original message with:
    ```
    your mom is a <original message content>
    ```
    Must be used as a reply to a message.
  - `&keet` — bot replies with an image. Use `KEET_IMAGE` env var to change the image.

- Automatic responses
  - If anyone says "do it" (or "dewit"), the bot replies with a GIF (set by `DO_IT_GIF`).

- Slash commands
  - `/ping` — replies with latency info (registered globally on startup).

## Troubleshooting

- "STARBOARD_CHANNEL_ID is not set" — add `STARBOARD_CHANNEL_ID` to `.env` with the channel ID (enable Developer Mode in Discord to copy IDs).
- Jimp errors (e.g. `Jimp.read is not a function`) — ensure you installed `jimp@^1.0.0`.
- Presence not changing / `client.user` null — rotation must start after the bot is ready (the code starts rotation on `ClientReady`).

## Contributing / Extending
- Slash commands live in the `commands/` folder.
- Message-based command logic is in `index.js` — consider moving each `&` command into its own module for cleanliness.
- For persistence (starboard map, config), add a small JSON DB or sqlite.
