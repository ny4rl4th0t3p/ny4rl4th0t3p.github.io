---
title: 'Build a multiplayer game in Go that survives a restart'
description: 'A tutorial for playhold, a self-hosted game backend in Go: tic-tac-toe from an empty folder to two browsers, with a turn timer, a score, and games that come back after the server restarts. Writing it found three things the backend kept quiet.'
slug: build-a-multiplayer-game-in-go-that-survives-a-restart
date: 2026-11-20
kind: journal
tags:
  - playhold
  - go
---

[playhold](https://github.com/ny4rl4th0t3p/playhold) is a self-hosted game backend in Go: your game's rules run on
your server, in rooms that handle one move at a time, and with a database, every room is saved as it changes, so a
match survives a restart, a crash or a deploy. It now has a [tutorial](https://ny4rl4th0t3p.github.io/playhold/tutorial/a-module.html)
that builds a game on it, from an empty folder to two people playing in their browsers.

<!-- more -->

## What it builds

Tic-tac-toe, small enough that each chapter adds one idea:

1. **A module:** the board's rules, and tests that play it, with no server.
2. **Its own messages,** in a `.proto` file.
3. **A server,** and a test that plays a game against it over real connections.
4. **A page** in the browser, on the TypeScript SDK: one player starts a game and sends the link, the other opens it.
5. **Saving** in PostgreSQL: stop the server mid-game, start it again, and both pages reconnect to the same board.
6. **Time, and a new version:** 30 seconds a move, and a change to what's saved, deployed over the old games.
7. **A second module,** the score across games.

A bonus runs it the way a host would for players: over TLS, behind Caddy, with the page on a host of its own.

Each chapter's finished code is a folder in
[playhold-tictactoe](https://github.com/ny4rl4th0t3p/playhold-tictactoe), built and tested in CI, and the pages import
their code from it rather than having it typed in: the code on a page is code that passed its tests, and a snippet that
goes missing fails the documentation's build.

## The page isn't served by the game server

The game server could serve the page too, and the tutorial deliberately doesn't. The page is hosted on its own, and
the server lets it connect by listing its address in an environment variable. Partly because a static host or a CDN
serves files closer to the players, but mostly because of what happens when one side changes: a new page doesn't restart the server and
disconnect every player, and when the server is down, the page still loads and says it's reconnecting, instead of
the browser showing an error page.

## A version change, deployed for real

Saving and the turn timer were meant to be one chapter. They became two, because the interesting part of a timer isn't
the timer: a game can now end a third way, on time, so what the board saves has to change shape, and every game saved
the old way has to move to the new one.

A migration only means something if there's a real old version to migrate. So chapter 5 saves the board at version 1,
and chapter 6 starts with an instruction: before changing any code, play a game to a win and stop the server. At the
end of the chapter, the new server starts on the same database, and that finished game comes back finished. The new
code only reads the new field, so the game comes back right only because the migration turned the old winner into it.

## Modules that never import each other

Chapter 7 adds the score as a module of its own. It never imports the board: it hears each result through an event,
and asks for a rematch through an interface it declares itself, which the board provides. The room type is the only
place that knows both. That's how a module written for one game can be used in the next.

## What writing it found

Following the tutorial step by step, as a stranger would, found three places where playhold did the right thing and
said nothing about it:

- **A page refused for its address.** Opened from another machine, the page said "Connection lost" in every browser,
  and the server's log was empty. The server was right to refuse it, but it only logged that at debug level.
- **A server with no database.** Started without `DATABASE_URL`, it ran happily in memory, and after a restart the game
  was simply gone, with "no room has this code". Nothing had said games weren't being saved.
- **A migration.** After the chapter 6 deploy, the game came back, and there was no way to tell from the log that a
  migration had run at all.

All three log now, in playhold v0.4.1: the refused address with the setting that would allow it, a server with no store
at startup, and each migration a restore runs, with how many rooms went through it. The tutorial was the first time
anyone used playhold without knowing how it works inside, even if that someone was me.

## Try it

The [tutorial](https://ny4rl4th0t3p.github.io/playhold/tutorial/a-module.html) needs Go, Node and Docker. I haven't yet
followed it myself from an empty folder on a clean machine, so if a step doesn't work as written, tell me in the
[Tutorial feedback](https://github.com/ny4rl4th0t3p/playhold/discussions/1) discussion, and I'll fix the page or the code.
playhold is a hobby project, early in development, and its API can still change.