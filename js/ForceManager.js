// ForceManager.js - Handles force management and pilot operations with separated pilot data model
class ForceManager {
    constructor() {
        this.currentForce = null;
        this.pilotCounter = 1;
        this.hasUnsavedChanges = false;
        
        // Experience level to pilot skill mapping
        this.experienceSkillMapping = {
            'Regular': { gunnery: 4, piloting: 5 },
            'Veteran': { gunnery: 3, piloting: 4 },
            'Elite': { gunnery: 2, piloting: 3 },
            'Heroic': { gunnery: 1, piloting: 2 }
        };
    }

    /**
     * Load a force file for management
     */
    async loadForce() {
        try {
            const result = await window.electronAPI.showOpenDialog({
                title: 'Load Force for Management',
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
                
                // Store the force data
                this.currentForce = forceData;
                this.currentForce.filePath = filePath;
                
                // Ensure force has pilots array (for new data model)
                if (!this.currentForce.pilots) {
                    this.currentForce.pilots = [];
                }
                
                // Ensure all mechs have pilot references
                this.ensurePilotReferencesExist();
                
                // Update UI
                this.updateForceInfo();
                this.renderUnits();
                this.renderMechsTable();
                
                // Enable save button
                document.getElementById('saveForceFromManagerBtn').disabled = false;
                
                // Show success message
                this.showStatus(`Force loaded from ${filePath}`, 'success');
            }
        } catch (error) {
            this.showStatus(`Error loading force: ${error.message}`, 'error');
            console.error('Force load error:', error);
        }
    }

    /**
     * Ensure all mechs have pilot references (convert old format if needed)
     */
    ensurePilotReferencesExist() {
        if (!this.currentForce || !this.currentForce.units) return;
        
        this.pilotCounter = 1;
        
        this.currentForce.units.forEach(unit => {
            if (unit.mechs && Array.isArray(unit.mechs)) {
                unit.mechs.forEach(mech => {
                    // If mech has embedded pilot (old format), convert to new format
                    if (mech.pilot && typeof mech.pilot === 'object') {
                        // Create a new pilot from embedded data
                        const pilotId = `pilot_${this.pilotCounter}`;
                        const newPilot = {
                            id: pilotId,
                            name: mech.pilot.name || `Pilot ${this.pilotCounter}`,
                            gunnery: mech.pilot.gunnery || 3,
                            piloting: mech.pilot.piloting || 4,
                            wounds: mech.pilot.wounds || 0,
                            status: mech.pilot.wounds >= 6 ? 'killed' : (mech.pilot.wounds > 0 ? 'wounded' : 'healthy'),
                            skills: mech.pilot.skills || {},
                            notes: mech.pilot.notes || ''
                        };
                        
                        // Add to pilots array
                        this.currentForce.pilots.push(newPilot);
                        
                        // Replace embedded pilot with reference
                        mech.pilotId = pilotId;
                        delete mech.pilot;
                        
                        this.pilotCounter++;
                    }
                    
                    // If mech has no pilot reference, create one
                    if (!mech.pilotId) {
                        const pilotId = `pilot_${this.pilotCounter}`;
                        const newPilot = this.createPilot(pilotId);
                        
                        // Add to pilots array
                        this.currentForce.pilots.push(newPilot);
                        
                        // Set pilot reference
                        mech.pilotId = pilotId;
                        
                        this.pilotCounter++;
                    }
                });
            }
        });
    }

    /**
     * Create a new pilot with default values
     */
    createPilot(id = null) {
        const experienceLevel = this.currentForce.experienceLevel || 'Veteran';
        const skills = this.experienceSkillMapping[experienceLevel] || { gunnery: 3, piloting: 4 };
        
        const pilotId = id || `pilot_${this.pilotCounter}`;
        
        const pilot = {
            id: pilotId,
            name: `Pilot ${this.pilotCounter}`,
            gunnery: skills.gunnery,
            piloting: skills.piloting,
            wounds: 0,
            status: 'healthy',
            skills: {},
            notes: ''
        };
        
        this.pilotCounter++;
        return pilot;
    }

    /**
     * Get pilot by ID
     */
    getPilotById(pilotId) {
        if (!this.currentForce || !this.currentForce.pilots) return null;
        return this.currentForce.pilots.find(p => p.id === pilotId);
    }

    /**
     * Get active pilots (not killed)
     */
    getActivePilots() {
        if (!this.currentForce || !this.currentForce.pilots) return [];
        return this.currentForce.pilots.filter(p => p.status !== 'killed');
    }

    /**
     * Get killed pilots
     */
    getKilledPilots() {
        if (!this.currentForce || !this.currentForce.pilots) return [];
        return this.currentForce.pilots.filter(p => p.status === 'killed');
    }

    /**
     * Update force information display
     */
    updateForceInfo() {
        if (!this.currentForce) return;
        
        // Update basic info
        document.getElementById('managerFaction').textContent = this.currentForce.faction || '-';
        document.getElementById('managerExperience').textContent = this.currentForce.experienceLevel || '-';
        document.getElementById('managerTotalFP').textContent = this.currentForce.forcePoints || 0;
        
        // Calculate used points and totals
        let totalCost = 0;
        let totalMechs = 0;
        let totalUnits = 0;
        
        if (this.currentForce.units) {
            totalUnits = this.currentForce.units.length;
            
            this.currentForce.units.forEach(unit => {
                if (unit.mechs && Array.isArray(unit.mechs)) {
                    totalMechs += unit.mechs.length;
                    
                    unit.mechs.forEach(mech => {
                        totalCost += mech.cost || 0;
                    });
                }
            });
        }
        
        document.getElementById('managerUsedFP').textContent = totalCost;
        document.getElementById('managerTotalMechs').textContent = totalMechs;
        document.getElementById('managerTotalUnits').textContent = totalUnits;
    }

    /**
     * Render units list
     */
    renderUnits() {
        const unitsContainer = document.getElementById('unitsContainer');
        
        if (!this.currentForce || !this.currentForce.units || this.currentForce.units.length === 0) {
            unitsContainer.innerHTML = '<p class="empty-message">No units in force.</p>';
            return;
        }
        
        let html = '';
        
        this.currentForce.units.forEach((unit, index) => {
            const unitName = `Unit ${index + 1} (${unit.type || 'Unknown'})`;
            let unitCost = 0;
            let mechCount = 0;
            
            if (unit.mechs && Array.isArray(unit.mechs)) {
                mechCount = unit.mechs.length;
                unitCost = unit.mechs.reduce((sum, mech) => sum + (mech.cost || 0), 0);
            }
            
            html += `
                <div class="unit-card">
                    <div class="unit-header">
                        <span class="unit-name">${unitName}</span>
                        <span class="unit-cost">${unitCost} FP</span>
                    </div>
                    <div class="unit-mechs">
                        ${mechCount} mech${mechCount !== 1 ? 's' : ''}
                    </div>
                </div>
            `;
        });
        
        unitsContainer.innerHTML = html;
    }

    /**
     * Render mechs table with pilot selection dropdowns
     */
    renderMechsTable() {
        const tableBody = document.getElementById('mechsTableBody');
        const totalCostElement = document.getElementById('totalMechCost');
        
        if (!this.currentForce || !this.currentForce.units || this.currentForce.units.length === 0) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No mechs loaded. Load a force to see details.</td></tr>';
            totalCostElement.textContent = '0';
            return;
        }
        
        let html = '';
        let totalCost = 0;
        
        this.currentForce.units.forEach((unit, unitIndex) => {
            if (unit.mechs && Array.isArray(unit.mechs)) {
                unit.mechs.forEach((mech, mechIndex) => {
                    const unitName = `Unit ${unitIndex + 1} (${unit.type || 'Unknown'})`;
                    const mechName = mech.name || '-';
                    const mechClass = mech.class || '-';
                    const mechCost = mech.cost || 0;
                    
                    totalCost += mechCost;
                    
                    // Get pilot data
                    const pilot = mech.pilotId ? this.getPilotById(mech.pilotId) : null;
                    const pilotName = pilot ? pilot.name : 'Unassigned';
                    const pilotGunnery = pilot ? pilot.gunnery : '-';
                    const pilotPiloting = pilot ? pilot.piloting : '-';
                    const pilotStatus = pilot ? pilot.status : 'healthy';
                    
                    // Get active pilots for dropdown
                    const activePilots = this.getActivePilots();
                    
                    html += `
                        <tr data-unit-index="${unitIndex}" data-mech-index="${mechIndex}" data-pilot-status="${pilotStatus}">
                            <td>${unitName}</td>
                            <td>${mechName}</td>
                            <td>${mechClass}</td>
                            <td>${mechCost}</td>
                            <td>
                                <select class="pilot-select" data-unit-index="${unitIndex}" data-mech-index="${mechIndex}">
                                    <option value="">Unassigned</option>
                                    ${activePilots.map(pilot => `
                                        <option value="${pilot.id}" ${mech.pilotId === pilot.id ? 'selected' : ''}>
                                            ${pilot.name} (${pilot.gunnery}/${pilot.piloting})
                                        </option>
                                    `).join('')}
                                </select>
                            </td>
                            <td>${pilotGunnery}</td>
                            <td>${pilotPiloting}</td>
                            <td>
                                <button class="btn btn-small btn-primary pilot-edit-btn" data-unit-index="${unitIndex}" data-mech-index="${mechIndex}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
        });
        
        tableBody.innerHTML = html;
        totalCostElement.textContent = totalCost;
        
        // Add event listeners
        this.addPilotSelectListeners();
        this.addEditButtonListeners();
    }

    /**
     * Add event listeners to pilot selection dropdowns
     */
    addPilotSelectListeners() {
        const pilotSelects = document.querySelectorAll('.pilot-select');
        pilotSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const unitIndex = parseInt(select.getAttribute('data-unit-index'));
                const mechIndex = parseInt(select.getAttribute('data-mech-index'));
                const pilotId = select.value;
                
                this.assignPilotToMech(unitIndex, mechIndex, pilotId);
            });
        });
    }

    /**
     * Assign pilot to mech
     */
    assignPilotToMech(unitIndex, mechIndex, pilotId) {
        if (!this.currentForce || !this.currentForce.units || 
            !this.currentForce.units[unitIndex] || 
            !this.currentForce.units[unitIndex].mechs ||
            !this.currentForce.units[unitIndex].mechs[mechIndex]) {
            this.showStatus('Cannot assign pilot: Invalid mech reference', 'error');
            return;
        }
        
        const mech = this.currentForce.units[unitIndex].mechs[mechIndex];
        
        if (pilotId) {
            const pilot = this.getPilotById(pilotId);
            if (!pilot) {
                this.showStatus('Cannot assign pilot: Pilot not found', 'error');
                return;
            }
            
            if (pilot.status === 'killed') {
                this.showStatus('Cannot assign killed pilot to mech', 'error');
                return;
            }
            
            mech.pilotId = pilotId;
            this.showStatus(`Assigned ${pilot.name} to ${mech.name}`, 'success');
        } else {
            delete mech.pilotId;
            this.showStatus('Pilot unassigned from mech', 'info');
        }
        
        // Mark as having unsaved changes
        this.hasUnsavedChanges = true;
        
        // Update UI
        this.renderMechsTable();
    }

    /**
     * Add event listeners to pilot edit buttons
     */
    addEditButtonListeners() {
        const editButtons = document.querySelectorAll('.pilot-edit-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const unitIndex = parseInt(button.getAttribute('data-unit-index'));
                const mechIndex = parseInt(button.getAttribute('data-mech-index'));
                
                // Get pilot ID from mech
                const mech = this.currentForce.units[unitIndex].mechs[mechIndex];
                const pilotId = mech.pilotId;
                
                if (pilotId) {
                    this.editPilot(pilotId);
                } else {
                    // Create new pilot if none assigned
                    this.createAndAssignPilot(unitIndex, mechIndex);
                }
            });
        });
    }

    /**
     * Create and assign a new pilot
     */
    createAndAssignPilot(unitIndex, mechIndex) {
        const pilotId = `pilot_${this.pilotCounter}`;
        const newPilot = this.createPilot(pilotId);
        
        // Add to pilots array
        this.currentForce.pilots.push(newPilot);
        
        // Assign to mech
        const mech = this.currentForce.units[unitIndex].mechs[mechIndex];
        mech.pilotId = pilotId;
        
        // Mark as having unsaved changes
        this.hasUnsavedChanges = true;
        
        // Update UI
        this.renderMechsTable();
        
        // Edit the new pilot
        this.editPilot(pilotId);
    }

    /**
     * Edit pilot information
     */
    editPilot(pilotId) {
        const pilot = this.getPilotById(pilotId);
        if (!pilot) {
            this.showStatus('Cannot edit pilot: Pilot not found', 'error');
            return;
        }
        
        // Create edit dialog
        const dialogHtml = `
            <div class="pilot-edit-dialog">
                <h3><i class="fas fa-user-edit"></i> Edit Pilot</h3>
                <div class="form-group">
                    <label for="pilotName">Pilot Name:</label>
                    <input type="text" id="pilotName" value="${pilot.name}" class="form-control">
                </div>
                <div class="form-group">
                    <label for="pilotGunnery">Gunnery Skill:</label>
                    <input type="number" id="pilotGunnery" value="${pilot.gunnery}" min="0" max="8" class="form-control">
                </div>
                <div class="form-group">
                    <label for="pilotPiloting">Piloting Skill:</label>
                    <input type="number" id="pilotPiloting" value="${pilot.piloting}" min="0" max="8" class="form-control">
                </div>
                <div class="form-group">
                    <label for="pilotWounds">Wounds (0-5, 6=killed):</label>
                    <input type="number" id="pilotWounds" value="${pilot.wounds}" min="0" max="6" class="form-control">
                    <small class="form-text">0 = healthy, 1-5 = wounded, 6 = killed</small>
                </div>
                <div class="form-group">
                    <label for="pilotNotes">Notes:</label>
                    <textarea id="pilotNotes" class="form-control" rows="3">${pilot.notes || ''}</textarea>
                </div>
                <div class="dialog-buttons">
                    <button id="savePilotBtn" class="btn btn-success">
                        <i class="fas fa-save"></i> Save
                    </button>
                    <button id="cancelPilotEditBtn" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.innerHTML = dialogHtml;
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('savePilotBtn').addEventListener('click', () => {
            this.savePilotEdit(pilotId, overlay);
        });
        
        document.getElementById('cancelPilotEditBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    /**
     * Save pilot edit
     */
    savePilotEdit(pilotId, overlay) {
        const pilotName = document.getElementById('pilotName').value.trim();
        const pilotGunnery = parseInt(document.getElementById('pilotGunnery').value);
        const pilotPiloting = parseInt(document.getElementById('pilotPiloting').value);
        const pilotWounds = parseInt(document.getElementById('pilotWounds').value);
        const pilotNotes = document.getElementById('pilotNotes').value.trim();
        
        if (!pilotName) {
            this.showStatus('Pilot name cannot be empty', 'error');
            return;
        }
        
        if (isNaN(pilotGunnery) || pilotGunnery < 0 || pilotGunnery > 8) {
            this.showStatus('Gunnery skill must be between 0 and 8', 'error');
            return;
        }
        
        if (isNaN(pilotPiloting) || pilotPiloting < 0 || pilotPiloting > 8) {
            this.showStatus('Piloting skill must be between 0 and 8', 'error');
            return;
        }
        
        if (isNaN(pilotWounds) || pilotWounds < 0 || pilotWounds > 6) {
            this.showStatus('Wounds must be between 0 and 6', 'error');
            return;
        }
        
        // Update pilot data
        const pilot = this.getPilotById(pilotId);
        if (!pilot) {
            this.showStatus('Cannot save pilot: Pilot not found', 'error');
            return;
        }
        
        pilot.name = pilotName;
        pilot.gunnery = pilotGunnery;
        pilot.piloting = pilotPiloting;
        pilot.wounds = pilotWounds;
        pilot.notes = pilotNotes;
        
        // Update status based on wounds
        if (pilotWounds >= 6) {
            pilot.status = 'killed';
        } else if (pilotWounds > 0) {
            pilot.status = 'wounded';
        } else {
            pilot.status = 'healthy';
        }
        
        // Mark as having unsaved changes
        this.hasUnsavedChanges = true;
        
        // Remove overlay
        document.body.removeChild(overlay);
        
        // Update UI
        this.renderMechsTable();
        this.showStatus(`Pilot "${pilotName}" updated`, 'success');
    }

    /**
     * Show Hall of Fame (killed pilots)
     */
    showHallOfFame() {
        const killedPilots = this.getKilledPilots();
        
        if (killedPilots.length === 0) {
            this.showStatus('No killed pilots in Hall of Fame', 'info');
            return;
        }
        
        // Create Hall of Fame dialog
        let dialogHtml = `
            <div class="pilot-edit-dialog" style="max-width: 700px;">
                <h3><i class="fas fa-trophy"></i> Hall of Fame</h3>
                <p>Pilots who gave their lives in battle:</p>
                <div class="table-wrapper" style="max-height: 400px; overflow-y: auto;">
                    <table class="mechs-table">
                        <thead>
                            <tr>
                                <th>Pilot Name</th>
                                <th>Gunnery</th>
                                <th>Piloting</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        killedPilots.forEach(pilot => {
            dialogHtml += `
                <tr>
                    <td>${pilot.name}</td>
                    <td>${pilot.gunnery}</td>
                    <td>${pilot.piloting}</td>
                    <td>${pilot.notes || ''}</td>
                </tr>
            `;
        });
        
        dialogHtml += `
                        </tbody>
                    </table>
                </div>
                <div class="dialog-buttons">
                    <button id="closeHallOfFameBtn" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.innerHTML = dialogHtml;
        document.body.appendChild(overlay);
        
        // Add event listener
        document.getElementById('closeHallOfFameBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    /**
     * Save force with changes
     */
    async saveForce() {
        if (!this.currentForce || !this.currentForce.filePath) {
            this.showStatus('No force loaded to save', 'error');
            return;
        }
        
        try {
            await window.electronAPI.writeJsonFile(this.currentForce.filePath, this.currentForce);
            this.hasUnsavedChanges = false;
            this.showStatus(`Force saved to ${this.currentForce.filePath}`, 'success');
        } catch (error) {
            this.showStatus(`Error saving force: ${error.message}`, 'error');
            console.error('Save error:', error);
        }
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        // Use the existing status element from the builder
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
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
        } else {
            console.log(`Status: ${message}`);
        }
    }
}
