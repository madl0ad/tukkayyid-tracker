// UnitManager.js - Handles unit operations and rendering
class UnitManager {
    constructor(forceBuilder) {
        this.forceBuilder = forceBuilder;
    }

    renderUnit(unit) {
        const template = document.getElementById('lanceTemplate');
        const clone = template.content.cloneNode(true);
        const unitElement = clone.querySelector('.lance-item');
        
        unitElement.dataset.unitId = unit.id;
        
        // Update label based on faction
        const unitType = this.forceBuilder.currentFaction === 'ComStar' ? 'Level II' : 'Star';
        unitElement.querySelector('.lance-type').textContent = `${unit.type} ${unitType}`;
        
        const typeSelect = unitElement.querySelector('.lance-type-select');
        typeSelect.value = unit.type;
        
        typeSelect.addEventListener('change', (e) => {
            this.updateUnitType(unit.id, e.target.value);
        });
        
        const rollBtn = unitElement.querySelector('.btn-roll-lance');
        rollBtn.addEventListener('click', () => {
            this.rollUnit(unit.id);
        });
        
        const checkbox = unitElement.querySelector('.lance-checkbox');
        checkbox.addEventListener('change', () => {
            this.forceBuilder.updateRemoveButtonState();
        });
        
        // Render mech slots dynamically
        const mechSlotsContainer = unitElement.querySelector('.lance-mechs');
        mechSlotsContainer.innerHTML = '';
        
        unit.mechs.forEach((mech, index) => {
            const mechSlot = this.createMechSlot(index + 1);
            this.renderMechSlot(mechSlot, unit.id, index, mech, unit.type);
            mechSlotsContainer.appendChild(mechSlot);
        });
        
        this.updateUnitTotal(unitElement, unit);
        
        document.getElementById('lancesList').appendChild(unitElement);
    }

    createMechSlot(slotNumber) {
        const template = document.getElementById('mechSlotTemplate');
        const clone = template.content.cloneNode(true);
        const mechSlot = clone.querySelector('.mech-slot');
        
        mechSlot.dataset.slot = slotNumber;
        mechSlot.querySelector('.slot-label').textContent = `Mech ${slotNumber}:`;
        
        return mechSlot;
    }

    renderMechSlot(slot, unitId, mechIndex, mech, unitType) {
        // Set class selection
        const classSelect = slot.querySelector('.mech-class-select');
        classSelect.value = mech.selectedClass || this.forceBuilder.getMechClassForUnitType(unitType);
        
        // Update mech data with selected class
        mech.selectedClass = classSelect.value;
        
        // Add event listener for class selection change
        classSelect.addEventListener('change', (e) => {
            this.updateMechClass(unitId, mechIndex, e.target.value);
        });
        
        // Add event listener for individual roll button
        const rollMechBtn = slot.querySelector('.btn-roll-mech');
        rollMechBtn.addEventListener('click', () => {
            this.rollSingleMech(unitId, mechIndex);
        });
        
        // Update mech info display
        slot.querySelector('.mech-name').textContent = mech.name;
        slot.querySelector('.mech-roll').textContent = mech.roll ? `(Roll: ${mech.roll})` : '(Roll: -)';
        slot.querySelector('.mech-cost').textContent = mech.cost > 0 ? `Cost: ${mech.cost}` : 'Cost: -';
    }

    updateUnitType(unitId, newType) {
        const unit = this.forceBuilder.units.find(u => u.id === unitId);
        if (unit) {
            unit.type = newType;
            
            const unitElement = document.querySelector(`[data-unit-id="${unitId}"]`);
            if (unitElement) {
                const unitType = this.forceBuilder.currentFaction === 'ComStar' ? 'Level II' : 'Star';
                unitElement.querySelector('.lance-type').textContent = `${newType} ${unitType}`;
            }
            
            this.forceBuilder.setStatus(`Updated unit ${unitId} to ${newType} type`);
        }
    }

    updateMechClass(unitId, mechIndex, newClass) {
        const unit = this.forceBuilder.units.find(u => u.id === unitId);
        if (unit && unit.mechs[mechIndex]) {
            unit.mechs[mechIndex].selectedClass = newClass;
            
            if (unit.mechs[mechIndex].name !== '-') {
                this.forceBuilder.setStatus(`Updated mech ${mechIndex + 1} in unit ${unitId} to ${newClass} class`);
            }
        }
    }

    rollSingleMech(unitId, mechIndex) {
        const unit = this.forceBuilder.units.find(u => u.id === unitId);
        if (!unit || !unit.mechs[mechIndex]) return;
        
        const factionData = this.forceBuilder.getCurrentFactionData();
        if (!factionData) {
            this.forceBuilder.setStatus('Error: Faction data not loaded. Please load faction data first.', 'error');
            return;
        }
        
        const roll = window.electronAPI.rollD6();
        const mechClass = unit.mechs[mechIndex].selectedClass || this.forceBuilder.getMechClassForUnitType(unit.type);
        const mech = this.getMechFromRoll(roll, mechClass, unit.type, factionData);
        
        if (mech) {
            unit.mechs[mechIndex] = {
                name: mech.name,
                roll: roll,
                cost: mech.price,
                class: mech.class,
                selectedClass: mechClass
            };
            
            // Update UI
            const unitElement = document.querySelector(`[data-unit-id="${unitId}"]`);
            if (unitElement) {
                const mechSlot = unitElement.querySelector(`.mech-slot[data-slot="${mechIndex + 1}"]`);
                if (mechSlot) {
                    mechSlot.querySelector('.mech-name').textContent = mech.name;
                    mechSlot.querySelector('.mech-roll').textContent = `(Roll: ${roll})`;
                    mechSlot.querySelector('.mech-cost').textContent = `Cost: ${mech.price}`;
                }
                
                this.updateUnitTotal(unitElement, unit);
            }
            
            this.forceBuilder.updateSummary();
            this.forceBuilder.setStatus(`Rolled ${mech.name} (${mechClass}) for unit ${unitId}, mech ${mechIndex + 1}`);
        } else {
            this.forceBuilder.setStatus(`Error: Could not find mech for roll ${roll}, class ${mechClass} in ${unit.type} unit`, 'error');
        }
    }

    rollUnit(unitId) {
        const unit = this.forceBuilder.units.find(u => u.id === unitId);
        if (!unit) return;
        
        const factionData = this.forceBuilder.getCurrentFactionData();
        if (!factionData) {
            this.forceBuilder.setStatus('Error: Faction data not loaded. Please load faction data first.', 'error');
            return;
        }
        
        let totalCost = 0;
        
        unit.mechs = unit.mechs.map((mech, index) => {
            const roll = window.electronAPI.rollD6();
            const mechClass = mech.selectedClass || this.forceBuilder.getMechClassForUnitType(unit.type);
            const rolledMech = this.getMechFromRoll(roll, mechClass, unit.type, factionData);
            
            if (rolledMech) {
                totalCost += rolledMech.price;
                return {
                    name: rolledMech.name,
                    roll: roll,
                    cost: rolledMech.price,
                    class: rolledMech.class,
                    selectedClass: mechClass
                };
            } else {
                return {
                    name: 'Unknown',
                    roll: roll,
                    cost: 0,
                    class: null,
                    selectedClass: mechClass
                };
            }
        });
        
        // Update UI
        const unitElement = document.querySelector(`[data-unit-id="${unitId}"]`);
        if (unitElement) {
            const mechSlots = unitElement.querySelectorAll('.mech-slot');
            mechSlots.forEach((slot, index) => {
                if (index < unit.mechs.length) {
                    const mech = unit.mechs[index];
                    slot.querySelector('.mech-name').textContent = mech.name;
                    slot.querySelector('.mech-roll').textContent = `(Roll: ${mech.roll})`;
                    slot.querySelector('.mech-cost').textContent = `Cost: ${mech.cost}`;
                    
                    const classSelect = slot.querySelector('.mech-class-select');
                    if (classSelect) {
                        classSelect.value = mech.selectedClass;
                    }
                }
            });
            
            this.updateUnitTotal(unitElement, unit);
        }
        
        this.forceBuilder.updateSummary();
        this.forceBuilder.setStatus(`Rolled ${unit.type} unit (Total: ${totalCost} FP)`);
    }

    rollAllUnits() {
        const factionData = this.forceBuilder.getCurrentFactionData();
        if (!factionData) {
            this.forceBuilder.setStatus('Error: Faction data not loaded. Please load faction data first.', 'error');
            return;
        }
        
        this.forceBuilder.units.forEach(unit => {
            this.rollUnit(unit.id);
        });
        
        this.forceBuilder.setStatus('Rolled all units');
    }

    getMechFromRoll(roll, mechClass, unitType, factionData) {
        if (!factionData.assignmentTables || !factionData.assignmentTables[unitType] || !factionData.assignmentTables[unitType][mechClass]) {
            return null;
        }
        
        const table = factionData.assignmentTables[unitType][mechClass];
        const entry = table.find(item => item.roll === roll);
        
        if (entry && factionData.mechs) {
            const mech = factionData.mechs.find(mech => mech.id === entry.mechId);
            if (mech) {
                // Use the new pricing system
                mech.price = this.forceBuilder.getMechPrice(mech.class);
            }
            return mech;
        }
        
        return null;
    }

    updateUnitTotal(unitElement, unit) {
        const total = unit.mechs.reduce((sum, mech) => sum + mech.cost, 0);
        unitElement.querySelector('.lance-total-cost').textContent = total;
    }

    removeSelectedUnits() {
        const checkboxes = document.querySelectorAll('.lance-checkbox:checked');
        const unitIds = Array.from(checkboxes).map(cb => {
            const unitElement = cb.closest('.lance-item');
            return parseInt(unitElement.dataset.unitId);
        });
        
        // Remove from data
        this.forceBuilder.units = this.forceBuilder.units.filter(unit => !unitIds.includes(unit.id));
        
        // Remove from UI
        unitIds.forEach(id => {
            const element = document.querySelector(`[data-unit-id="${id}"]`);
            if (element) {
                element.remove();
            }
        });
        
        this.forceBuilder.updateRemoveButtonState();
        this.forceBuilder.updateSummary();
        this.forceBuilder.setStatus(`Removed ${unitIds.length} unit(s)`);
    }

    clearAllUnits() {
        this.forceBuilder.units = [];
        this.forceBuilder.nextUnitId = 1;
        
        const unitsList = document.getElementById('lancesList');
        unitsList.innerHTML = '';
        
        this.forceBuilder.addDefaultUnits();
        this.forceBuilder.updateSummary();
        this.forceBuilder.setStatus('Cleared all units');
    }
}