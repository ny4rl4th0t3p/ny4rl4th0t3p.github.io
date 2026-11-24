---
title: 'A Godot client for a game server you host'
description: 'playhold, a self-hosted game backend, has a Godot SDK: a GDScript client that reconnects by itself, keeps the player''s seat and finds them a match, shown with the tutorial''s tic-tac-toe playing against a browser on the same server.'
slug: a-godot-client-for-a-game-server-you-host
date: 2026-11-24
kind: journal
tags:
  - playhold
  - godot
---

A Godot game can now keep its multiplayer rules on a server you host, with
[playhold-sdk-godot](https://github.com/ny4rl4th0t3p/playhold-sdk-godot). [playhold](https://github.com/ny4rl4th0t3p/playhold)
is a self-hosted game backend: the game's rules run on the server, in rooms that handle one move at a time, and each
player only receives what they're allowed to see. The server is written in Go; the game stays in GDScript.

<!-- more -->

## What it is

A node, `PlayholdClient`, written in GDScript with no native code, that a game usually adds as an autoload, so the
connection outlives a change of scene. The game connects, creates or joins a room, or asks to be matched, and from then
on sends its moves and gets the player's view of the room through signals. What it does by itself:

- **A lost connection** comes back after a delay that starts at half a second and doubles up to 15, and the client
  goes back to its room, where the server kept the player's seat.
- **The guest's identity** is saved in a `ConfigFile` under `user://`, so the player is the same player next time.
- **A match that falls through,** because a matched player never came, puts the player back in the queue.
- **The same player opening the game somewhere else** stops the older copy, instead of the two taking the game from
  each other forever.

## The same game, two clients

The SDK's sample is the tic-tac-toe of playhold's [tutorial](https://ny4rl4th0t3p.github.io/playhold/tutorial/a-module.html),
as a client of the tutorial's last server: the board, a clock for each turn, the score across games, a rematch. The
tutorial's own client is a browser page, and the two play each other, one in Godot and one in a browser, over the same
server, since the server only knows rooms and messages, not what draws them.

So the tutorial now says on its first page that it builds a server and a client, either a page or a Godot game, and has
a page for the Godot one: [A Godot client](https://ny4rl4th0t3p.github.io/playhold/tutorial/a-godot-client.html).

## A Godot API, not a port

The first draft of the SDK's design followed the TypeScript SDK: the same names, the same shape, translated. That was
the wrong goal. Someone writing a Godot game expects what Godot's own classes do, not what a web page's library does,
so the SDK became Godot's instead: methods that return an `Error`, signals instead of callbacks, a `Status` enum, the
identity in a `ConfigFile`, the client as an autoload. What the SDKs share is only what the server expects of any
client, such as forgetting a room that refused the player, or never reconnecting after being replaced.

## A second client cleaned up the protocol

Clients talk to playhold in protobuf, and the Godot SDK generates its GDScript from playhold's own `.proto` file with
[Godobuf](https://github.com/oniksan/godobuf). With the Godobuf commit the SDK uses, on Godot 4.7.2, the first try
didn't get far: it refused a field named `message`, and a message named `Error` clashed with Godot's own `Error` as
soon as typed code used it.

The quick fix was a patched copy of the `.proto` for Godot alone, and it would have left anyone reading the SDK next to
the others wondering why the names didn't match. So playhold renamed the three in its own `.proto`, in
[v0.5.0](https://ny4rl4th0t3p.github.io/playhold/changelog.html): the SDKs moved to the new names, and the sample game
and the tutorial to the new version. Not one byte on the wire changed: a client built before the renames still talks
to a server built after them.

## What the tests found

The SDK's tests run its client against a small playhold server, headless, in CI. Getting them to fail when they should
took three fixes:

- **A test file that doesn't parse passed.** The test framework, GUT, skipped it with a warning, ran the others, and
  reported the run as passed. A broken client test would have gone green. A hook after the run now checks that every
  test file loaded, and fails the run if one didn't.
- **A failed generation looked fine.** Godobuf ends with success even when it can't generate, so the old file stayed in
  place and nothing said so. The build now fails unless Godobuf reports the file as written.
- **The tests tripped the server's own protection.** Every test player is a new guest, all from one address, and once
  the burst of 20 new guests a server allows per address by default was spent, the server refused the rest, as it
  should on a real server. The test server turns that limit off, and the one on connections per address; a game's
  server keeps both.

## Try it

The SDK is at [v0.5.0](https://github.com/ny4rl4th0t3p/playhold-sdk-godot/tree/v0.5.0), for playhold v0.5, tested with
Godot 4.7.2. Copy its `addons/playhold/` into a project, and start from the tutorial's
[Godot page](https://ny4rl4th0t3p.github.io/playhold/tutorial/a-godot-client.html) or the
[reference](https://ny4rl4th0t3p.github.io/playhold/reference/sdk-godot.html). If something doesn't work as written, or
feels wrong for Godot, tell me in the [Godot SDK feedback](https://github.com/ny4rl4th0t3p/playhold/discussions/2)
discussion. playhold is a hobby project, early in development, and its API can still change.
