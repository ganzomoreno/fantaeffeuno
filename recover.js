const fs = require('fs');
const path = require('path');

const chromeDbPath = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');
const edgeDbPath = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'Local Storage', 'leveldb');

function searchFolder(folderPath) {
    if (!fs.existsSync(folderPath)) return;
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        if (file.endsWith('.log') || file.endsWith('.ldb')) {
            try {
                const fullPath = path.join(folderPath, file);
                const content = fs.readFileSync(fullPath, 'utf8');

                let matchTeams = content.match(/ff1_teams\b.*?(?:\[.*?\])/g);
                let matchPilots = content.match(/ff1_pilots\b.*?(?:\[.*?\])/g);

                if (matchTeams) {
                    console.log("=== TEAMS FOUND IN " + file + " ===");
                    console.log(matchTeams[matchTeams.length - 1].substring(0, 300) + "...");
                }
                if (matchPilots) {
                    console.log("=== PILOTS FOUND IN " + file + " ===");
                    console.log(matchPilots[matchPilots.length - 1].substring(0, 300) + "...");
                }
            } catch (err) { }
        }
    }
}

searchFolder(chromeDbPath);
searchFolder(edgeDbPath);

console.log("Done searching.");
