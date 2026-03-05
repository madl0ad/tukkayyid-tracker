// DataManager.js - Handles faction data loading and file operations
class DataManager {
    constructor(forceBuilder) {
        this.forceBuilder = forceBuilder;
    }

    async loadFactionData() {
        try {
            const result = await window.electronAPI.showOpenDialog({
                title: 'Load Faction Data Bundle',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const data = await window.electronAPI.readJsonFile(filePath);
                
                // Check if this is a faction data bundle
                if (data.factions && data.factions.ComStar && data.factions.Clan) {
                    // Tukayyid faction bundle - need to load mech_prices.json for pricing
                    this.forceBuilder.factionData = data.factions;
                    
                    // Try to load mech_prices.json from the same directory
                    try {
                        const pricesPath = filePath.replace(/[^\/\\]+$/, 'mech_prices.json');
                        const pricesData = await window.electronAPI.readJsonFile(pricesPath);
                        this.forceBuilder.mechPrices = pricesData;
                        this.forceBuilder.setStatus(`Loaded Tukayyid faction data with experience-based pricing from ${filePath}`);
                    } catch (priceError) {
                        // If mech_prices.json not found, use default pricing from bundle
                        this.forceBuilder.mechPrices = null;
                        this.forceBuilder.setStatus(`Loaded Tukayyid faction data (using default pricing) from ${filePath}`);
                    }
                } else if (data.mechs && data.prices && data.assignmentTables) {
                    // Legacy bundled data file
                    this.forceBuilder.factionData = {
                        ComStar: {
                            unitSize: 4,
                            mechs: data.mechs,
                            prices: data.prices,
                            assignmentTables: data.assignmentTables
                        }
                    };
                    this.forceBuilder.mechPrices = null;
                    this.forceBuilder.setStatus(`Loaded legacy bundled data: ${data.mechs.length} mechs from ${filePath}`);
                } else if (Array.isArray(data)) {
                    // Individual mechs file
                    this.forceBuilder.factionData = {
                        ComStar: {
                            unitSize: 4,
                            mechs: data,
                            prices: { Light: 50, Medium: 85, Heavy: 130, Assault: 170 },
                            assignmentTables: this.createDefaultAssignmentTables(data)
                        }
                    };
                    this.forceBuilder.mechPrices = null;
                    this.forceBuilder.setStatus(`Loaded ${data.length} mechs from ${filePath}`);
                } else {
                    this.forceBuilder.setStatus('Error: Invalid JSON format', 'error');
                }
            }
        } catch (error) {
            this.forceBuilder.setStatus(`Error loading file: ${error.message}`, 'error');
        }
    }

    createDefaultAssignmentTables(mechs) {
        // Create simple assignment tables for legacy data
        const tables = {
            Assault: { Light: [], Medium: [], Heavy: [], Assault: [] },
            Battle: { Light: [], Medium: [], Heavy: [], Assault: [] },
            Striker: { Light: [], Medium: [], Heavy: [], Assault: [] },
            Fire: { Light: [], Medium: [], Heavy: [], Assault: [] }
        };
        
        // Simple assignment: assign mechs to tables based on class
        mechs.forEach((mech, index) => {
            const roll = (index % 6) + 1;
            const entry = { roll: roll, mechId: mech.id };
            
            // Add to all unit types for simplicity
            Object.keys(tables).forEach(unitType => {
                if (tables[unitType][mech.class]) {
                    tables[unitType][mech.class].push(entry);
                }
            });
        });
        
        return tables;
    }

    /**
     * Create a pilot for a mech
     * @param {number} mechIndex - Index of the mech in the unit
     * @param {string} experienceLevel - Experience level for pilot skills
     */
    createPilotForMech(mechIndex, experienceLevel = 'Veteran') {
        // Experience level to pilot skill mapping
        const experienceSkillMapping = {
            'Regular': { gunnery: 4, piloting: 5 },
            'Veteran': { gunnery: 3, piloting: 4 },
            'Elite': { gunnery: 2, piloting: 3 },
            'Heroic': { gunnery: 1, piloting: 2 }
        };
        
        const skills = experienceSkillMapping[experienceLevel] || { gunnery: 3, piloting: 4 };
        
        return {
            name: `Pilot ${mechIndex + 1}`,
            gunnery: skills.gunnery,
            piloting: skills.piloting,
            skills: {},
            notes: ''
        };
    }

    async saveForce() {
        try {
            // Prepare units with pilot data
            const unitsWithPilots = this.forceBuilder.units.map(unit => {
                const unitCopy = { ...unit };
                
                // Ensure each mech has a pilot
                if (unitCopy.mechs && Array.isArray(unitCopy.mechs)) {
                    unitCopy.mechs = unitCopy.mechs.map((mech, index) => {
                        const mechCopy = { ...mech };
                        
                        // Add pilot if not present
                        if (!mechCopy.pilot) {
                            mechCopy.pilot = this.createPilotForMech(index, this.forceBuilder.currentExperienceLevel);
                        }
                        
                        return mechCopy;
                    });
                }
                
                return unitCopy;
            });
            
            const forceData = {
                name: `Force_${new Date().toISOString().split('T')[0]}`,
                faction: this.forceBuilder.currentFaction,
                equipmentVariant: this.forceBuilder.currentEquipmentVariant,
                experienceLevel: this.forceBuilder.currentExperienceLevel,
                forcePoints: this.forceBuilder.currentForcePoints,
                units: unitsWithPilots,
                totalCost: this.forceBuilder.getTotalCost(),
                createdAt: new Date().toISOString()
            };
            
            const result = await window.electronAPI.showSaveDialog({
                title: 'Save Force',
                defaultPath: `force_${Date.now()}.json`,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (!result.canceled && result.filePath) {
                await window.electronAPI.writeJsonFile(result.filePath, forceData);
                this.forceBuilder.setStatus(`Force saved to ${result.filePath}`);
            }
        } catch (error) {
            this.forceBuilder.setStatus(`Error saving force: ${error.message}`, 'error');
        }
    }

    async loadForce() {
        try {
            const result = await window.electronAPI.showOpenDialog({
                title: 'Load Force',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const forceData = await window.electronAPI.readJsonFile(filePath);
                
                // Validate force data
                if (!forceData.units || !Array.isArray(forceData.units)) {
                    throw new Error('Invalid force file format');
                }
                
                // Clear current units
                this.forceBuilder.units = [];
                this.forceBuilder.nextUnitId = 1;
                document.getElementById('lancesList').innerHTML = '';
                
                // Load faction and equipment
                if (forceData.faction) {
                    this.forceBuilder.currentFaction = forceData.faction;
                    document.getElementById('factionSelect').value = forceData.faction;
                    
                    if (forceData.faction === 'Clan') {
                        document.getElementById('clanEquipment').classList.remove('hidden');
                        if (forceData.equipmentVariant) {
                            this.forceBuilder.currentEquipmentVariant = forceData.equipmentVariant;
                            document.getElementById('equipmentVariant').value = forceData.equipmentVariant;
                        }
                        this.forceBuilder.unitSize = 5;
                    } else {
                        document.getElementById('clanEquipment').classList.add('hidden');
                        this.forceBuilder.currentEquipmentVariant = null;
                        this.forceBuilder.unitSize = 6;
                    }
                }
                
                // Load experience level
                if (forceData.experienceLevel) {
                    this.forceBuilder.currentExperienceLevel = forceData.experienceLevel;
                    // Note: We'll need to add UI for experience level selection later
                }
                
                // Load force points
                if (forceData.forcePoints) {
                    this.forceBuilder.currentForcePoints = forceData.forcePoints;
                    const forcePointsSelect = document.getElementById('forcePoints');
                    if (forceData.forcePoints === 250 || forceData.forcePoints === 500 || forceData.forcePoints === 750) {
                        forcePointsSelect.value = forceData.forcePoints.toString();
                        document.getElementById('customForcePoints').classList.add('hidden');
                    } else {
                        forcePointsSelect.value = 'custom';
                        document.getElementById('customForcePoints').classList.remove('hidden');
                        document.getElementById('customForcePointsInput').value = forceData.forcePoints;
                    }
                    this.forceBuilder.updateForcePoints();
                }
                
                // Load units
                forceData.units.forEach(unitData => {
                    const unitId = this.forceBuilder.nextUnitId++;
                    const unit = {
                        id: unitId,
                        type: unitData.type || 'Assault',
                        mechs: unitData.mechs || Array(this.forceBuilder.unitSize).fill().map(() => ({
                            name: '-',
                            roll: null,
                            cost: 0,
                            class: null,
                            selectedClass: 'Assault'
                        }))
                    };
                    
                    this.forceBuilder.units.push(unit);
                    
                    // Render unit
                    if (this.forceBuilder.unitManager) {
                        this.forceBuilder.unitManager.renderUnit(unit);
                        
                        // Update mech slots with loaded data
                        const unitElement = document.querySelector(`[data-unit-id="${unitId}"]`);
                        if (unitElement && unitData.mechs) {
                            const mechSlots = unitElement.querySelectorAll('.mech-slot');
                            mechSlots.forEach((slot, index) => {
                                if (index < unit.mechs.length) {
                                    const mech = unit.mechs[index];
                                    if (mech) {
                                        slot.querySelector('.mech-name').textContent = mech.name;
                                        slot.querySelector('.mech-roll').textContent = mech.roll ? `(Roll: ${mech.roll})` : '(Roll: -)';
                                        slot.querySelector('.mech-cost').textContent = mech.cost > 0 ? `Cost: ${mech.cost}` : 'Cost: -';
                                        
                                        const classSelect = slot.querySelector('.mech-class-select');
                                        if (classSelect && mech.selectedClass) {
                                            classSelect.value = mech.selectedClass;
                                        }
                                    }
                                }
                            });
                            if (this.forceBuilder.unitManager) {
                                this.forceBuilder.unitManager.updateUnitTotal(unitElement, unit);
                            }
                        }
                    }
                });
                
                this.forceBuilder.updateRemoveButtonState();
                this.forceBuilder.updateSummary();
                this.forceBuilder.setStatus(`Force loaded from ${filePath}`);
            }
        } catch (error) {
            this.forceBuilder.setStatus(`Error loading force: ${error.message}`, 'error');
        }
    }

    /**
     * Export force to MUL format
     * @param {string} exportType - 'unit' or 'force'
     * @param {number|null} unitId - Unit ID for unit export, null for force export
     */
    async exportToMul(exportType = 'force', unitId = null) {
        try {
            // Check if there are any mechs to export
            const hasMechs = this.forceBuilder.units.some(unit => 
                unit.mechs.some(mech => mech.name && mech.name !== '-')
            );
            
            if (!hasMechs) {
                this.forceBuilder.setStatus('No mechs to export. Please roll some mechs first.', 'error');
                return;
            }
            
            // Determine default filename
            let defaultFilename = '';
            if (exportType === 'unit' && unitId) {
                const unit = this.forceBuilder.units.find(u => u.id === unitId);
                defaultFilename = `unit_${unitId}_${Date.now()}.mul`;
            } else {
                defaultFilename = `force_export_${Date.now()}.mul`;
            }
            
            // Show save dialog
            const result = await window.electronAPI.showSaveDialog({
                title: exportType === 'unit' ? 'Export Unit to MUL' : 'Export Force to MUL',
                defaultPath: defaultFilename,
                filters: [
                    { name: 'MUL Files', extensions: ['mul'] },
                    { name: 'XML Files', extensions: ['xml'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (!result.canceled && result.filePath) {
                // Use Electron's IPC to handle the export in the main process
                const success = await window.electronAPI.exportToMul({
                    filePath: result.filePath,
                    forceData: {
                        units: this.forceBuilder.units,
                        exportType: exportType,
                        unitId: unitId
                    }
                });
                
                if (success) {
                    this.forceBuilder.setStatus(
                        `${exportType === 'unit' ? 'Unit' : 'Force'} exported to ${result.filePath}`, 
                        'success'
                    );
                } else {
                    this.forceBuilder.setStatus('MUL export failed. Check console for details.', 'error');
                }
            }
        } catch (error) {
            this.forceBuilder.setStatus(`Error exporting to MUL: ${error.message}`, 'error');
            console.error('MUL export error:', error);
        }
    }
}
