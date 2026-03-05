// Test script for Excel export functionality
const ExcelExporter = require('../js/ExcelExporter.js');
const MtfParser = require('../js/MtfParser.js');

// Create a mock forceBuilder object for testing
const mockForceBuilder = {
    units: [
        {
            id: 1,
            type: 'Assault',
            mechs: [
                {
                    name: 'Atlas AS7-D',
                    roll: 3,
                    cost: 170,
                    class: 'Assault',
                    selectedClass: 'Assault'
                },
                {
                    name: 'BattleMaster BLR-1G',
                    roll: 5,
                    cost: 170,
                    class: 'Assault',
                    selectedClass: 'Assault'
                },
                {
                    name: 'Awesome AWS-8Q',
                    roll: 2,
                    cost: 170,
                    class: 'Assault',
                    selectedClass: 'Assault'
                },
                {
                    name: 'Stalker STK-3F',
                    roll: 4,
                    cost: 170,
                    class: 'Assault',
                    selectedClass: 'Assault'
                },
                {
                    name: 'Zeus ZEU-6S',
                    roll: 6,
                    cost: 170,
                    class: 'Assault',
                    selectedClass: 'Assault'
                },
                {
                    name: 'Victor VTR-9B',
                    roll: 1,
                    cost: 170,
                    class: 'Assault',
                    selectedClass: 'Assault'
                }
            ]
        },
        {
            id: 2,
            type: 'Battle',
            mechs: [
                {
                    name: 'Archer ARC-2R',
                    roll: 3,
                    cost: 130,
                    class: 'Heavy',
                    selectedClass: 'Heavy'
                },
                {
                    name: 'Warhammer WHM-6R',
                    roll: 5,
                    cost: 130,
                    class: 'Heavy',
                    selectedClass: 'Heavy'
                },
                {
                    name: 'Marauder MAD-3R',
                    roll: 2,
                    cost: 130,
                    class: 'Heavy',
                    selectedClass: 'Heavy'
                },
                {
                    name: 'Rifleman RFL-3N',
                    roll: 4,
                    cost: 130,
                    class: 'Heavy',
                    selectedClass: 'Heavy'
                },
                {
                    name: 'Thunderbolt TDR-5S',
                    roll: 6,
                    cost: 130,
                    class: 'Heavy',
                    selectedClass: 'Heavy'
                },
                {
                    name: 'Orion ON1-K',
                    roll: 1,
                    cost: 130,
                    class: 'Heavy',
                    selectedClass: 'Heavy'
                }
            ]
        }
    ],
    currentFaction: 'ComStar',
    currentExperienceLevel: 'Veteran',
    currentEquipmentVariant: null,
    getTotalCost: () => 1800,
    getMechCountByClass: () => ({
        'Light': 0,
        'Medium': 0,
        'Heavy': 6,
        'Assault': 6
    })
};

async function testExport() {
    try {
        console.log('Starting Excel export test...');
        
        // Create exporter
        const exporter = new ExcelExporter(mockForceBuilder);
        
        // Test file path
        const testFilePath = './test_export.xlsx';
        
        // Export with progress updates
        const success = await exporter.exportToExcel(testFilePath, (percent, message) => {
            console.log(`Progress: ${percent}% - ${message}`);
        });
        
        if (success) {
            console.log(`✅ Excel export successful! File saved to: ${testFilePath}`);
            console.log('Test completed successfully!');
        } else {
            console.log('❌ Excel export failed.');
        }
        
    } catch (error) {
        console.error('❌ Error during export test:', error);
        console.error(error.stack);
    }
}

// Run the test
testExport();