# ArogyaEdge — SIH 2026 Digital Prototype Lab

**Edge-AI wearable health companion** for heat waves, floods, pollution & disasters in India.

## Live demo
After enabling **GitHub Pages** (Settings → Pages → Deploy from branch `main` / root):

**https://bodduadithya2006-hash.github.io/ArogyaEdge/**

Or open `index.html` locally in Chrome.

## Features
- Interactive 3D band with **real components** (ESP32-S3, MAX30102, MPU6050, Li-Po, coin motor)
- **Cutaway** view — click parts for specs
- Live telemetry + HR/SpO₂ sparklines
- Scenarios: Normal · Heat Wave · Fall · Dehydration
- Mode A (fully offline) · Mode B (hybrid)
- AI pipeline tab: Sensors → TinyML → Risk → Alert
- Alert banners + haptic visual feedback

## Problem statement
SIH 2026 · PS 26181 — Secure, AI-powered Personal Health Companion with privacy-preserving on-device monitoring.

## Stack
Three.js · Edge Impulse / TFLite Micro (target) · ESP32-S3

**Simulation only. Not a medical device.**
