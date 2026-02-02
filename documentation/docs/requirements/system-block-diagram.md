---
sidebar_position: 2
---

# System Block Diagram

<img src="/workspaces/project-professional-group-one-llc/documentation/static/img/Location Aware AAC.jpg" alt="System Block Diagram"/>

**Figure 1.** 
High level design of the Location Aware AAC application.

## Description

The Location Aware AAC application is a web based assistive communication system built using React for the frontend and Supabase as the backend data platform.
The system dynamically adapts its AAC interface based on the user's physical location, which is detected through Bluetooth beacon signals placed in administrator defined environments.

React manages the user interface, handles user input, displays context relevant icons, constructs sentences from selected symbols, and converts those sentences into speech using text-to-speech technology.

Supabase provides secure storage for user profiles, location metadata, and associated AAC content using a PostgreSQL database, enabling  the frontend to retrieve personalized, location specific communication options in real time.

Together, these components create a responsive and context aware AAC experience that reduces cognitive load and improves communication efficiency for users.


