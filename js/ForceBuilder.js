// ForceBuilder.js - Main application class
class ForceBuilder {
    constructor() {
        this.units = [];
        this.nextUnitId = 1;
        this.factionData = null;
        this.mechPrices = null; // New mech_prices.json data
        this.currentFaction = "ComStar";
        this.currentEquipmentVariant = null;
        this.currentExperienceLevel = "Veteran"; // Default experience level
        this.currentForcePoints = 500;
        this.unitSize = 6;
        
        // Initialize managers
        this.unitManager = null;
        this.dataManager = null;
        this.uiManager = null;
        
        this.init();
    }

    init() {
        // Initialize managers
        this.unitManager = new UnitManager(this);
        this.dataManager = new DataManager(this);
        this.uiManager = new UIManager(this);
        
        this.bindEvents();
        this.updateForcePoints();
        this.addDefaultUnits();
        this.updateSummary();
    }

    bindEvents() {
        // Faction selection
        document.getElementById('factionSelect').addEventListener('change', (e) => {
            this.handleFactionChange(e.target.value);
        });

        document.getElementById('equipmentVariant').addEventListener('change', (e) => {
            this.handleEquipmentVariantChange(e.target.value);
        });

        // Experience level selection
        document.getElementById('experienceLevel').addEventListener('change', (e) => {
            this.handleExperienceLevelChange(e.target.value);
        });

        // Force points selection
        document.getElementById('forcePoints').addEventListener('change', (e) => {
            this.handleForcePointsChange(e.target.value);
        });

        document.getElementById('customForcePointsInput').addEventListener('input', (e) => {
            const value = parseInt(e.target.value) || 0;
            if (value > 0) {
                this.currentForcePoints = value;
                this.updateForcePoints();
                this.updateSummary();
            }
        });

        // Unit management
        document.getElementById('addLanceBtn').addEventListener('click', () => {
            this.addUnit();
        });

        document.getElementById('removeLanceBtn').addEventListener('click', () => {
            this.removeSelectedUnits();
        });

        // Actions
        document.getElementById('rollAllBtn').addEventListener('click', () => {
            this.rollAllUnits();
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllUnits();
        });

        // File operations
        document.getElementById('loadDataBtn').addEventListener('click', () => {
            this.loadFactionData();
        });

        document.getElementById('saveForceBtn').addEventListener('click', () => {
            this.saveForce();
        });

        document.getElementById('loadForceBtn').addEventListener('click', () => {
            this.loadForce();
        });

        // MUL export buttons
        document.getElementById('exportMulBtn').addEventListener('click', () => {
            this.toggleMulExportOptions();
        });

        document.getElementById('exportCurrentUnitBtn').addEventListener('click', () => {
            this.exportCurrentUnitToMul();
        });

        document.getElementById('exportEntireForceBtn').addEventListener('click', () => {
            this.exportEntireForceToMul();
        });
    }

    handleForcePointsChange(value) {
        const customDiv = document.getElementById('customForcePoints');
        
        if (value === 'custom') {
            customDiv.classList.remove('hidden');
            const input = document.getElementById('customForcePointsInput');
            this.currentForcePoints = parseInt(input.value) || 500;
        } else {
            customDiv.classList.add('hidden');
            this.currentForcePoints = parseInt(value) || 500;
        }
        
        this.updateForcePoints();
        this.updateSummary();
    }

    handleFactionChange(faction) {
        this.currentFaction = faction;
        const clanEquipmentDiv = document.getElementById('clanEquipment');
        
        if (faction === 'Clan') {
            clanEquipmentDiv.classList.remove('hidden');
            this.currentEquipmentVariant = 'Front-line';
            this.unitSize = 5;
        } else {
            clanEquipmentDiv.classList.add('hidden');
            this.currentEquipmentVariant = null;
            this.unitSize = 6;
        }
        
        // Clear existing units and add new ones with correct size
        this.clearAllUnits();
        this.setStatus(`Switched to ${faction} faction`);
    }

    handleEquipmentVariantChange(variant) {
        this.currentEquipmentVariant = variant;
        this.setStatus(`Switched to ${variant} equipment`);
    }

    handleExperienceLevelChange(experienceLevel) {
        this.currentExperienceLevel = experienceLevel;
        
        // Recalculate all mech costs with new experience level
        if (this.mechPrices) {
            this.units.forEach(unit => {
                unit.mechs.forEach(mech => {
                    if (mech.class) {
                        mech.cost = this.getMechPrice(mech.class);
                    }
                });
            });
            
            // Update UI
            this.updateSummary();
            this.updateAllUnitTotals();
        }
        
        this.setStatus(`Switched to ${experienceLevel} experience level`);
    }

    updateForcePoints() {
        document.getElementById('totalForcePoints').textContent = this.currentForcePoints;
    }

    addDefaultUnits() {
        for (let i = 0; i < 3; i++) {
            this.addUnit();
        }
    }

    addUnit() {
        const unitId = this.nextUnitId++;
        const unit = {
            id: unitId,
            type: 'Assault',
            mechs: Array(this.unitSize).fill().map(() => ({
                name: '-',
                roll: null,
                cost: 0,
                class: null,
                selectedClass: 'Assault'
            }))
        };
        
        this.units.push(unit);
        if (this.unitManager) {
            this.unitManager.renderUnit(unit);
        }
        this.updateRemoveButtonState();
        this.updateSummary();
        
        const unitType = this.currentFaction === 'ComStar' ? 'Level II' : 'Star';
        this.setStatus(`Added new ${unit.type} ${unitType}`);
    }

    renderUnit(unit) {
        // Delegate to unitManager
        if (this.unitManager) {
            this.unitManager.renderUnit(unit);
        }
    }

    removeSelectedUnits() {
        if (this.unitManager) {
            this.unitManager.removeSelectedUnits();
        }
    }

    rollAllUnits() {
        if (this.unitManager) {
            this.unitManager.rollAllUnits();
        }
    }

    clearAllUnits() {
        if (this.unitManager) {
            this.unitManager.clearAllUnits();
        }
    }

    loadFactionData() {
        if (this.dataManager) {
            this.dataManager.loadFactionData();
        }
    }

    saveForce() {
        if (this.dataManager) {
            this.dataManager.saveForce();
        }
    }

    loadForce() {
        if (this.dataManager) {
            this.dataManager.loadForce();
        }
    }

    updateSummary() {
        if (this.uiManager) {
            this.uiManager.updateSummary();
        }
    }

    updateAllUnitTotals() {
        this.units.forEach(unit => {
            const unitElement = document.querySelector(`[data-unit-id="${unit.id}"]`);
            if (unitElement && this.unitManager) {
                this.unitManager.updateUnitTotal(unitElement, unit);
                
                // Also update individual mech costs in UI
                const mechSlots = unitElement.querySelectorAll('.mech-slot');
                mechSlots.forEach((slot, index) => {
                    if (index < unit.mechs.length) {
                        const mech = unit.mechs[index];
                        if (mech) {
                            slot.querySelector('.mech-cost').textContent = mech.cost > 0 ? `Cost: ${mech.cost}` : 'Cost: -';
                        }
                    }
                });
            }
        });
    }

    getCurrentFactionData() {
        if (!this.factionData) return null;
        
        if (this.currentFaction === 'ComStar') {
            return this.factionData.ComStar;
        } else if (this.currentFaction === 'Clan' && this.currentEquipmentVariant) {
            return this.factionData.Clan[this.currentEquipmentVariant];
        }
        return null;
    }

    getMechClassForUnitType(unitType) {
        const mappings = {
            'Assault': 'Assault',
            'Battle': 'Heavy',
            'Striker': 'Medium',
            'Fire': 'Light'
        };
        
        return mappings[unitType] || 'Medium';
    }

    getTotalCost() {
        return this.units.reduce((total, unit) => {
            return total + unit.mechs.reduce((unitTotal, mech) => unitTotal + mech.cost, 0);
        }, 0);
    }

    getMechCountByClass() {
        const counts = {
            'Light': 0,
            'Medium': 0,
            'Heavy': 0,
            'Assault': 0
        };
        
        this.units.forEach(unit => {
            unit.mechs.forEach(mech => {
                if (mech.class && counts.hasOwnProperty(mech.class)) {
                    counts[mech.class]++;
                }
            });
        });
        
        return counts;
    }

    getMechPrice(weightClass) {
        // If we have the new mech_prices.json data, use it
        if (this.mechPrices) {
            let factionKey = '';
            
            if (this.currentFaction === 'ComStar') {
                factionKey = 'ComStar';
            } else if (this.currentFaction === 'Clan') {
                if (this.currentEquipmentVariant === 'Front-line') {
                    factionKey = 'Clan Front-Line';
                } else if (this.currentEquipmentVariant === 'Second-line') {
                    factionKey = 'Clan Second-Line';
                }
            }
            
            if (factionKey && this.mechPrices[factionKey] && 
                this.mechPrices[factionKey][weightClass] && 
                this.mechPrices[factionKey][weightClass][this.currentExperienceLevel]) {
                return this.mechPrices[factionKey][weightClass][this.currentExperienceLevel];
            }
            
            // Fallback to default pricing if specific experience level not found
            if (factionKey && this.mechPrices[factionKey] && this.mechPrices[factionKey][weightClass]) {
                // Get the first available experience level
                const experienceLevels = Object.keys(this.mechPrices[factionKey][weightClass]);
                if (experienceLevels.length > 0) {
                    return this.mechPrices[factionKey][weightClass][experienceLevels[0]];
                }
            }
        }
        
        // Fallback to old pricing from faction data
        const factionData = this.getCurrentFactionData();
        if (factionData && factionData.prices && factionData.prices[weightClass]) {
            return factionData.prices[weightClass];
        }
        
        // Ultimate fallback
        const defaultPrices = {
            'Light': 50,
            'Medium': 85,
            'Heavy': 130,
            'Assault': 170
        };
        
        return defaultPrices[weightClass] || 0;
    }

    updateRemoveButtonState() {
        const checkboxes = document.querySelectorAll('.lance-checkbox:checked');
        const removeBtn = document.getElementById('removeLanceBtn');
        removeBtn.disabled = checkboxes.length === 0;
    }

    setStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        
        statusElement.className = 'status';
        
        if (type === 'error') {
            statusElement.classList.add('error');
            statusElement.style.color = '#ff6b6b';
            statusElement.style.borderColor = '#ff6b6b';
        } else if (type === 'success') {
            statusElement.classList.add('success');
            statusElement.style.color = '#81c784';
            statusElement.style.borderColor = '#81c784';
        } else {
            statusElement.style.color = '#a9b7c6';
            statusElement.style.borderColor = '#3d4a5d';
        }
    }

    /**
     * Toggle MUL export options visibility
     */
    toggleMulExportOptions() {
        const optionsDiv = document.getElementById('mulExportOptions');
        optionsDiv.classList.toggle('hidden');
        
        if (!optionsDiv.classList.contains('hidden')) {
            this.setStatus('Select export option: Current Unit or Entire Force');
        }
    }

    /**
     * Export current selected unit to MUL format
     */
    exportCurrentUnitToMul() {
        // Get selected unit
        const checkboxes = document.querySelectorAll('.lance-checkbox:checked');
        
        if (checkboxes.length === 0) {
            this.setStatus('Please select a unit to export (check the checkbox next to the unit)', 'error');
            return;
        }
        
        if (checkboxes.length > 1) {
            this.setStatus('Please select only one unit to export', 'error');
            return;
        }
        
        // Get unit ID from the selected checkbox
        const unitElement = checkboxes[0].closest('.lance-item');
        const unitId = parseInt(unitElement.dataset.unitId);
        
        if (this.dataManager) {
            this.dataManager.exportToMul('unit', unitId);
        }
        
        // Hide options after export
        document.getElementById('mulExportOptions').classList.add('hidden');
    }

    /**
     * Export entire force to MUL format
     */
    exportEntireForceToMul() {
        if (this.dataManager) {
            this.dataManager.exportToMul('force');
        }
        
        // Hide options after export
        document.getElementById('mulExportOptions').classList.add('hidden');
    }
}
