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

Similar products include [My Study Life](https://www.mystudylife.com/) and [Quizlet](https://quizlet.com/). These are both closed-source products that aim to help students improve their academic performance. My Study Life is an online student planner which allows students to keep track of their deadlines and classes. Quizlet allows students to create flashcards and quizzes to study for their classes. The Virtual Pet Study Buddy App is similar to these products in that the goal is to provide resources to help students succeed academically and stay on top of their coursework. However, this app also incorporates the unique aspect of a virtual pet companion to help them stay motivated to study. The Virtual Pet Study Buddy app will include some of the same features as Quizlet and My Study Life, like setting reminders or creating and linking to study materials. 
<br/>

Another closed-source mobile application, titled [Finch](https://finchcare.com/), involves taking care of a virtual pet to achieve self-care goals. [Habitica](https://habitica.com/static/home) is an open-source web application which helps users gamify their life by allowing them to set goals for keeping up with personal habits. Incorporating the concept of caring for a pet and gamifying personal and academic tasks, as in this application, with the features of a study app, will allow users a more personalized and fun experience to succeed in their academic pursuits.
