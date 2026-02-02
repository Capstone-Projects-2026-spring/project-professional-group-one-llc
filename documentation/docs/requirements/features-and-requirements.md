---
sidebar_position: 4
---

# Features and Requirements

## Functional Requirements

* Main Administrator must create an account and specify an organization/location name
    * A verification email will be sent when the Main Administrator registers the device for the first time.
    * This email address will be used as a security email address in case authentication issues
* Main Administrator can create additional Administrator accounts for other users to access administrative functions
    * Additional Administrator accounts are also linked to their own email addresses
* Administrator accounts can create individual User accounts
    * All Administrator accounts can access all User accounts once verified by the Main Administrator
    * User accounts are not attached to an email
    * An Admin must sign into the app first, who selects a User account to enter communication mode
* When signed in, a User sees two panes - their constructed sentence on top, and a word library on the bottom
    * Word library follows typical AAC grid format
    * However, the landing page is a 'Suggested' page 
* Suggestions are based on the device location, and the User's most frequently used words in that location
    * Each user account would have an associated User Context stored on the app
* The Device tracks its location via proximity to an array of Bluetooth beacons representing different rooms or other areas
    * The beacon with the strongest signal relative to the Device's position would be selected as its location
* Administrators can pair new beacons and add them as locations
    * Admins can go back later and edit the title or details of those beacons/locations
* Administrators can associate specific words with specific locations
    * Admins view this as a library of words associated with a specific location
* Application responsively plays sounds selected by User

## Nonfunctional Requirements

* Locations nearby the current location are also be factored into suggestions
* Administrators can weight words in location-specific libraries
* Administrators can add new words associated with a specific User account

* Application displays cleanly on mobile, tablet, and laptop
* Application can also detect other AAC devices and port context

