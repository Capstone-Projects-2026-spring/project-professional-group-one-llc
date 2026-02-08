---
sidebar_position: 4
---

# Features and Requirements

## Functional Requirements

-- CORE REQUIREMENTS --
* The Device tracks its location via proximity to an array of Bluetooth beacons representing different rooms or other areas
    * The beacon with the strongest signal relative to the Device's position is selected automatically as its location
    * Location is updated based on proximity changes in real time
* The User sees two panes: suggested words on top, and a word library on the bottom
    * Interface follows typical AAC grid format
    * Automatic word suggestion and manual word library navigation all on one screen for ease of use
* Suggestions are based on the device location, and the User's most frequently used words in that location
    * Each user has an associated User Context stored on the app
    * Each location has a library of words associated with that location
* Application responsively plays sounds selected by User

-- CONFIGURABILITY --
* Administrators can pair new beacons and add them as locations
    * Admins can go back later and edit the title or details of those beacons/locations
* Administrators can associate specific words with specific locations
    * Admins view this as a library of words associated with a specific location
* Administrators can view and edit User profiles
    * This includes the user's usage analytics and their favorite words  

-- ADMINISTRATITIVE FUNCTIONALITY --
* Main Administrator can create additional Administrator accounts for other users to access administrative functions
    * Additional Administrator accounts are also linked to their own email addresses
* Administrator accounts can create individual User accounts
    * All Administrator accounts can access all User accounts once verified by the Main Administrator
    * User accounts are not attached to an email
    * An Admin must sign into the app first, who selects a User account to enter communication mode
* Main Administrator must create an account and specify an organization/location name
    * A verification email will be sent when the Main Administrator registers the device for the first time.
    * This email address will be used as a security email address in case authentication issues



## Nonfunctional Requirements

* Application displays cleanly on mobile, tablet, and laptop
* User profiles have profile pictures for easy identification

* Administrators can reorder words in location-specific libraries
* Administrators can add new words associated with a specific User account

* Locations nearby the current location are also be factored into suggestions
* Application can also detect other AAC devices and port context

