
# Initial commit

AAC Beacon is a smart communication tool designed to make finding and using frequently needed words faster and easier. When a user connects to the beacon in a room, it automatically provides access to a personalized set of words without the need to search through files or menus. Each beacon is tailored to the user’s favorite words for that specific room, saving time and improving communication efficiency.

## Collaborators
- Walid Parast
- Joey Slepski
- Junwei Chen
- Cian Brownlee
- Benjamin No
- Joshua Slootsky
- Daniel Galvez

## Initial Website setup
1. Install git on your computer
2. Clone the project files with https://github.com/Capstone-Projects-2026-spring/project-professional-group-one-llc.git
    - open the terminal in the project folder and use git fetch --all (use git branch -a to make sure you downloaded the branches)
    - use git checkout vitetest to move to the website branch
3. Install Node.js
    - Go to https://nodejs.org/en/download and install using the prebuilt version
4. Navigate to the AACapp folder in the cloned Github files
5. Install vite
    - Open Command Prompt and enter the command: npm install
    - Then enter the command: npm run dev
    - Common error is that your machine will not let you run scripts
        - Open powershell and enter the command: Set-ExecutionPolicy Unrestricted -Scope CurrentUser
6. Open a brower and put localhost:5173