---
sidebar_position: 1
---

# System Overview

## Project Abstract

AAC Beacon is a smart communication aid intended to help people who use augmentative and alternative communication (AAC) access the words and phrases they need more quickly. Instead of requiring users to manually search through files, folders, or menus to find relevant vocabulary, AAC Beacon uses a room-based beacon connection to automatically present a personalized set of frequently used words for the user’s current environment. Each beacon represents a physical space (for example, a particular room) and is tailored to the user’s preferred vocabulary for that space, reducing the friction and improving communication speed and reliability.

## Conceptual Design

At a high level, the system consists of (1) one or more beacons placed in locations of interest and (2) a user-facing AAC client that reacts to the presence of those beacons by switching vocabulary views.

When the user enters a room, their device connects to (or detects) the room’s beacon and resolves it to a “room identity.” The client then loads the word set associated with that room for that specific user and displays it immediately, prioritizing the user’s frequently needed words for that environment. Word sets are user-configurable so each room can have its own personalized vocabulary.

To support this behavior, the system needs a way to store and retrieve user-specific, room-specific vocabulary mappings. This can be implemented as local storage on the device with optional synchronization, or backed by a shared data service that persists each user’s vocabulary sets and beacon-room associations.


## Background

Augmentative and Alternative Communication (AAC) systems are used by individuals with speech impairments. Many existing AAC systems require users to navigate through multiple pages and menus to manually search for the words they want to use. This process can be time-consuming and significantly slow down communication. Another limitation of these systems is their lack of awareness of the user’s physical environment, which can result in the display of irrelevant or unnecessary vocabulary. Adding the beacons and location awareness to help bring up key words depending where they are at will help with improving their communcation through AAC.