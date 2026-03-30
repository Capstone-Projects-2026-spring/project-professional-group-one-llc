---
sidebar_position: 4
---

# Features and Requirements

## Functional Requirements

-- CORE REQUIREMENTS --
* The Device tracks its location via proximity to an array of Bluetooth beacons representing different rooms or other areas
    * The beacon with the strongest signal relative to the Device's position is selected automatically as its location
    * Location is updated based on proximity changes in real time
* Suggestions are based on the device location, and the User's most frequently used words in that location
    * Each user has an associated User Context stored on the app
    * Each location has a library of words associated with that location
* The User sees two panes: suggested words on top, and a word library on the bottom
    * Interface follows typical AAC grid format
    * Automatic word suggestion and manual word library navigation all on one screen for ease of use
* Application responsively plays sounds selected by the user

-- CONFIGURABILITY --
* Administrators can pair new beacons and add them as locations
    * Admins can go back later and edit the title or details of those beacons/locations
* Administrators can view and edit User profiles
    * This includes the user's usage analytics and their favorite words  

-- ADMINISTRATIVE FUNCTIONALITY --
* Must sign up on the app to create an account
* Must designate an institution that they belong to
* Capable of creating other Admin and User accounts
* Capable of adding or removing location specific icons
* Capable of adding or removing locations
* Administrators should download the app for users and sign in for them
* Administrators will be able to download logging information


-- USER FUNCTIONALITY --
* Users can select icons to construct sentences
* Data about the user's actions on the app will be uploaded


## Nonfunctional Requirements

* Application displays cleanly on mobile, tablet, and laptop
* User profiles have profile pictures for easy identification

* Administrators can reorder words in location-specific libraries
* Administrators can add new words associated with a specific User account

* Locations near the current location are also factored into suggestions
* Application can also detect other AAC devices and port context

