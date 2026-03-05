#!/usr/bin/env node

/**
 * Build script to combine data_bundle.json and mech_prices.json
 * into an updated tukayyid_bundle.json with experience-based pricing
 */

const fs = require('fs');
const path = require('path');

// File paths
const DATA_BUNDLE_PATH = path.join(__dirname, '..', 'data', 'data_bundle.json');
const MECH_PRICES_PATH = path.join(__dirname, '..', 'data', 'mech_prices.json');
const TUKAYYID_BUNDLE_PATH = path.join(__dirname, '..', 'data', 'tukayyid_bundle.json');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

// Create backup directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Load source data
console.log('Loading source data...');
const dataBundle = JSON.parse(fs.readFileSync(DATA_BUNDLE_PATH, 'utf8'));
const mechPrices = JSON.parse(fs.readFileSync(MECH_PRICES_PATH, 'utf8'));

// Create backup of current bundle
if (fs.existsSync(TUKAYYID_BUNDLE_PATH)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `tukayyid_bundle_backup_${timestamp}.json`);
    fs.copyFileSync(TUKAYYID_BUNDLE_PATH, backupPath);
    console.log(`Created backup: ${backupPath}`);
}

// Step 1: Build mech key to weight class and faction mappings from assignment tables
console.log('Building mech classification mapping...');
const mechToClass = new Map();
const mechToFactions = new Map(); // Map mech key to array of factions it appears in

// Process each faction's assignment tables
for (const [factionName, unitTypes] of Object.entries(dataBundle.AssignmentTables)) {
    for (const [unitType, weightClasses] of Object.entries(unitTypes)) {
        for (const [weightClass, rollEntries] of Object.entries(weightClasses)) {
            for (const entry of rollEntries) {
                const mechKey = entry.mech;
                // Store weight class for this mech (first occurrence wins)
                if (!mechToClass.has(mechKey)) {
                    mechToClass.set(mechKey, weightClass);
                }
                // Store faction for this mech (can appear in multiple factions)
                if (!mechToFactions.has(mechKey)) {
                    mechToFactions.set(mechKey, new Set());
                }
                mechToFactions.get(mechKey).add(factionName);
            }
        }
    }
}

// Step 2: Generate unique IDs for mechs and organize by faction
console.log('Generating mech IDs and organizing by faction...');
const factionMechs = {
    'ComStar': [],
    'Clan Front-Line': [],
    'Clan Second-Line': []
};

// ID ranges by faction
const ID_RANGES = {
    'ComStar': { start: 100, current: 100 },
    'Clan Front-Line': { start: 200, current: 200 },
    'Clan Second-Line': { start: 300, current: 300 }
};

// Process all mechs from the mechs dictionary
for (const [mechKey, mechName] of Object.entries(dataBundle.mechs)) {
    const weightClass = mechToClass.get(mechKey);
    const factionsSet = mechToFactions.get(mechKey);
    
    if (!weightClass || !factionsSet || factionsSet.size === 0) {
        console.warn(`Warning: Mech "${mechKey}" not found in assignment tables, skipping`);
        continue;
    }
    
    // For mechs that appear in multiple factions, create duplicate entries in each faction
    // with different IDs
    for (const factionName of Array.from(factionsSet)) {
        // Get next ID for this faction
        const idRange = ID_RANGES[factionName];
        const mechId = idRange.current++;
        
        // Add to faction's mech list
        factionMechs[factionName].push({
            id: mechId,
            name: mechName,
            class: weightClass,
            key: mechKey  // Store original key for reference
        });
    }
}

// Debug: Check for "executioner_prime"
const execFactions = mechToFactions.get('executioner_prime');
console.log(`Debug: executioner_prime weightClass: ${mechToClass.get('executioner_prime')}, factions: ${execFactions ? Array.from(execFactions).join(', ') : 'none'}`);

// Step 3: Build the transformed assignment tables
console.log('Building transformed assignment tables...');
const transformedAssignmentTables = {};

for (const [factionName, unitTypes] of Object.entries(dataBundle.AssignmentTables)) {
    transformedAssignmentTables[factionName] = {};
    
    for (const [unitType, weightClasses] of Object.entries(unitTypes)) {
        transformedAssignmentTables[factionName][unitType] = {};
        
        for (const [weightClass, rollEntries] of Object.entries(weightClasses)) {
            transformedAssignmentTables[factionName][unitType][weightClass] = 
                rollEntries.map(entry => {
                    // Find the mech ID for this mech key
                    const mech = factionMechs[factionName].find(m => m.key === entry.mech);
                    if (!mech) {
                        throw new Error(`Mech "${entry.mech}" not found in faction "${factionName}" mechs list`);
                    }
                    return {
                        roll: entry.roll,
                        mechId: mech.id
                    };
                });
        }
    }
}

// Step 4: Build the final output structure
console.log('Building final output structure...');
const output = {
    factions: {
        ComStar: {
            unitSize: 6,
            mechs: factionMechs['ComStar'].map(({ id, name, class: weightClass }) => ({
                id,
                name,
                class: weightClass
            })),
            prices: mechPrices['ComStar'],
            assignmentTables: transformedAssignmentTables['ComStar']
        },
        Clan: {
            'Front-line': {
                unitSize: 5,
                mechs: factionMechs['Clan Front-Line'].map(({ id, name, class: weightClass }) => ({
                    id,
                    name,
                    class: weightClass
                })),
                prices: mechPrices['Clan Front-Line'],
                assignmentTables: transformedAssignmentTables['Clan Front-Line']
            },
            'Second-line': {
                unitSize: 5,
                mechs: factionMechs['Clan Second-Line'].map(({ id, name, class: weightClass }) => ({
                    id,
                    name,
                    class: weightClass
                })),
                prices: mechPrices['Clan Second-Line'],
                assignmentTables: transformedAssignmentTables['Clan Second-Line']
            }
        }
    }
};

// Step 5: Write the output
console.log('Writing output to tukayyid_bundle.json...');
fs.writeFileSync(
    TUKAYYID_BUNDLE_PATH,
    JSON.stringify(output, null, 2),
    'utf8'
);

// Step 6: Generate summary report
console.log('\n=== Build Summary ===');
console.log(`Total mechs processed: ${Object.values(factionMechs).flat().length}`);
console.log(`ComStar mechs: ${factionMechs['ComStar'].length} (IDs: ${ID_RANGES['ComStar'].start}-${ID_RANGES['ComStar'].current - 1})`);
console.log(`Clan Front-line mechs: ${factionMechs['Clan Front-Line'].length} (IDs: ${ID_RANGES['Clan Front-Line'].start}-${ID_RANGES['Clan Front-Line'].current - 1})`);
console.log(`Clan Second-line mechs: ${factionMechs['Clan Second-Line'].length} (IDs: ${ID_RANGES['Clan Second-Line'].start}-${ID_RANGES['Clan Second-Line'].current - 1})`);

// Verify all mechs in assignment tables were found
let missingMechs = 0;
for (const [factionName, unitTypes] of Object.entries(dataBundle.AssignmentTables)) {
    for (const [unitType, weightClasses] of Object.entries(unitTypes)) {
        for (const [weightClass, rollEntries] of Object.entries(weightClasses)) {
            for (const entry of rollEntries) {
                const mech = factionMechs[factionName].find(m => m.key === entry.mech);
                if (!mech) {
                    missingMechs++;
                    console.warn(`  Missing: ${entry.mech} in ${factionName} ${unitType} ${weightClass}`);
                }
            }
        }
    }
}

if (missingMechs > 0) {
    console.warn(`\nWarning: ${missingMechs} mechs in assignment tables not found in mechs dictionary`);
} else {
    console.log('\nAll assignment table entries successfully mapped to mech IDs.');
}

console.log('\nBuild completed successfully!');