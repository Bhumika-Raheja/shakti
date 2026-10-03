# Shakti: women's safety app (student project for internships and placements)

## What it does
- A woman presses and holds an SOS button for 3 seconds. An alert is created with her live location.
- Her trusted contacts (max 5) get an SMS with a live location link.
- Nearby verified volunteers (within 1 km, online) get a real-time alert. The first volunteer to accept claims it.
- The woman sees the volunteer coming on a live map, with steps: Alerted, Accepted, On the way, Arrived.
- She can also send a silent alert, start a fake call, or call 112 (this only opens the phone dialer).
- Users can report unsafe places, shown as a safety map.

## Roles
user, volunteer, admin. Volunteers register with a government ID and must be approved by an admin (status: pending, verified, suspended).

## Tech stack
- Backend: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, zod for validation
- App: React Native with Expo (Expo Router), socket.io-client, axios, expo-location, expo-secure-store
- Folders: /backend, /app, /docs (design files exported from Google Stitch: each subfolder has a screen.png and a code.html)

## Design rules
- Pink and white theme. White background, blush pink cards (#FFF0F4), rose pink accent (#D81B60), deep red (#B71C1C) only for SOS and emergency elements. No blue or purple.
- Flat, clean, thin pink borders, rounded corners. Plain short wording. Body text at least 14px.
- The screens in /docs are the exact designs to match.

## Rules for the code
- Keep the code simple, commented in plain English, and beginner friendly.
- Never put secrets in code. Use .env files, and keep them out of git.
- Login uses a fixed test OTP 123456 in development (a real SMS provider would replace it in production).
- Honest scope: this is a support tool, not a replacement for police or ambulance. Do not claim police integration.
- Privacy: do not show the woman's name or photo to a volunteer until the volunteer accepts. Delete live location trails after an alert is resolved.