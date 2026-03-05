// BattleTech Campaign Force Builder - Renderer Process
class ForceBuilder {
    constructor() {
        this.units = []; // Changed from lances to units for generic terminology
        this.nextUnitId = 1;
        this.factionData = null; // Changed from mechData/assignmentTables/mechPrices to factionData
        this.currentFaction = "ComStar";
        this.currentEquipmentVariant = null; // Only for Clan
        this.currentForcePoints = 500;
        this.unitSize = 6; // Default for ComStar
        
        this.init();
    }

    init() {
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

        // Unit management (renamed from Lance management)
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

    updateForcePoints() {
        document.getElementById('totalForcePoints').textContent = this.currentForcePoints;
    }

    addDefaultUnits() {
        // Add 3 default units (approx 250 FP = 3 units)
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
                selectedClass: 'Assault'  // Default based on unit type
            }))
        };
        
        this.units.push(unit);
        this.renderUnit(unit);
        this.updateRemoveButtonState();
        this.updateSummary();
        
        const unitType = this.currentFaction === 'ComStar' ? 'Level II' : 'Star';
        this.setStatus(`Added new ${unit.type} ${unitType}`);
    }

    // Helper method to get current faction data
    getCurrentFactionData() {
        if (!this.factionData) return null;
        
        if (this.currentFaction === 'ComStar') {
            return this.factionData.ComStar;
        } else if (this.currentFaction === 'Clan' && this.currentEquipmentVariant) {
            return this.factionData.Clan[this.currentEquipmentVariant];
        }
        return null;
    }

    // Helper method to get mech from roll using faction data
    getMechFromRoll(roll, mechClass, unitType) {
        const factionData = this.getCurrentFactionData();
        if (!factionData || !factionData.assignmentTables || !factionData.assignmentTables[unitType] || !factionData.assignmentTables[unitType][mechClass]) {
            return null;
        }
        
        const table = factionData.assignmentTables[unitType][mechClass];
        const entry = table.find(item => item.roll === roll);
        
        if (entry && factionData.mechs) {
            const mech = factionData.mechs.find(mech => mech.id === entry.mechId);
            if (mech && factionData.prices) {
                // Add price from faction prices
                mech.price = factionData.prices[mech.class] || 0;
            }
            return mech;
        }
        
        return null;
    }

    renderLance(lance) {
        const template = document.getElementById('lanceTemplate');
        const clone = template.content.cloneNode(true);
        const lanceElement = clone.querySelector('.lance-item');
        
        lanceElement.dataset.lanceId = lance.id;
        lanceElement.querySelector('.lance-type').textContent = `${lance.type} Lance`;
        
        const typeSelect = lanceElement.querySelector('.lance-type-select');
        typeSelect.value = lance.type;
        
        typeSelect.addEventListener('change', (e) => {
            this.updateLanceType(lance.id, e.target.value);
        });
        
        const rollBtn = lanceElement.querySelector('.btn-roll-lance');
        rollBtn.addEventListener('click', () => {
            this.rollLance(lance.id);
        });
        
        const checkbox = lanceElement.querySelector('.lance-checkbox');
        checkbox.addEventListener('change', () => {
            this.updateRemoveButtonState();
        });
        
        // Render mech slots with class selection and individual roll buttons
        const mechSlots = lanceElement.querySelectorAll('.mech-slot');
        mechSlots.forEach((slot, index) => {
            const mech = lance.mechs[index];
            
            // Set class selection
            const classSelect = slot.querySelector('.mech-class-select');
            classSelect.value = mech.selectedClass || this.getMechClassForLanceType(lance.type);
            
            // Update mech data with selected class
            mech.selectedClass = classSelect.value;
            
            // Add event listener for class selection change
            classSelect.addEventListener('change', (e) => {
                this.updateMechClass(lance.id, index, e.target.value);
            });
            
            // Add event listener for individual roll button
            const rollMechBtn = slot.querySelector('.btn-roll-mech');
            rollMechBtn.addEventListener('click', () => {
                this.rollSingleMech(lance.id, index);
            });
            
            // Update mech info display
            slot.querySelector('.mech-name').textContent = mech.name;
            slot.querySelector('.mech-roll').textContent = mech.roll ? `(Roll: ${mech.roll})` : '(Roll: -)';
            slot.querySelector('.mech-cost').textContent = mech.cost > 0 ? `Cost: ${mech.cost}` : 'Cost: -';
        });
        
        this.updateLanceTotal(lanceElement, lance);
        
        document.getElementById('lancesList').appendChild(lanceElement);
    }

    updateLanceType(lanceId, newType) {
        const lance = this.lances.find(l => l.id === lanceId);
        if (lance) {
            lance.type = newType;
            
            const lanceElement = document.querySelector(`[data-lance-id="${lanceId}"]`);
            if (lanceElement) {
                lanceElement.querySelector('.lance-type').textContent = `${newType} Lance`;
            }
            
            this.setStatus(`Updated lance ${lanceId} to ${newType} type`);
        }
    }

    updateMechClass(lanceId, mechIndex, newClass) {
        const lance = this.lances.find(l => l.id === lanceId);
        if (lance && lance.mechs[mechIndex]) {
            lance.mechs[mechIndex].selectedClass = newClass;
            
            // If mech is already rolled, we might want to clear it or keep it
            // For now, we'll just update the class but keep the roll
            if (lance.mechs[mechIndex].name !== '-') {
                this.setStatus(`Updated mech ${mechIndex + 1} in lance ${lanceId} to ${newClass} class`);
            }
        }
    }

    rollSingleMech(lanceId, mechIndex) {
        const lance = this.lances.find(l => l.id === lanceId);
        if (!lance || !lance.mechs[mechIndex]) return;
        
        if (!this.mechData || !this.assignmentTables || !this.mechPrices) {
            this.setStatus('Error: Mech data not loaded. Please load mech data first.', 'error');
            return;
        }
        
        const roll = window.electronAPI.rollD6();
        const mechClass = lance.mechs[mechIndex].selectedClass || this.getMechClassForLanceType(lance.type);
        const mech = this.getMechFromRoll(roll, mechClass, lance.type);
        
        if (mech) {
            lance.mechs[mechIndex] = {
                name: mech.name,
                roll: roll,
                cost: mech.price,
                class: mech.class,
                selectedClass: mechClass
            };
            
            // Update UI
            const lanceElement = document.querySelector(`[data-lance-id="${lanceId}"]`);
            if (lanceElement) {
                const mechSlot = lanceElement.querySelector(`.mech-slot[data-slot="${mechIndex + 1}"]`);
                if (mechSlot) {
                    mechSlot.querySelector('.mech-name').textContent = mech.name;
                    mechSlot.querySelector('.mech-roll').textContent = `(Roll: ${roll})`;
                    mechSlot.querySelector('.mech-cost').textContent = `Cost: ${mech.price}`;
                }
                
                this.updateLanceTotal(lanceElement, lance);
            }
            
            this.updateSummary();
            this.setStatus(`Rolled ${mech.name} (${mechClass}) for lance ${lanceId}, mech ${mechIndex + 1}`);
        } else {
            this.setStatus(`Error: Could not find mech for roll ${roll}, class ${mechClass} in ${lance.type} lance`, 'error');
        }
    }

    rollLance(lanceId) {
        const lance = this.lances.find(l => l.id === lanceId);
        if (!lance) return;
        
        if (!this.mechData || !this.assignmentTables || !this.mechPrices) {
            this.setStatus('Error: Mech data not loaded. Please load mech data first.', 'error');
            return;
        }
        
        let totalCost = 0;
        
        lance.mechs = lance.mechs.map((mech, index) => {
            const roll = window.electronAPI.rollD6();
            const mechClass = mech.selectedClass || this.getMechClassForLanceType(lance.type);
            const rolledMech = this.getMechFromRoll(roll, mechClass, lance.type);
            
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
        const lanceElement = document.querySelector(`[data-lance-id="${lanceId}"]`);
        if (lanceElement) {
            const mechSlots = lanceElement.querySelectorAll('.mech-slot');
            mechSlots.forEach((slot, index) => {
                const mech = lance.mechs[index];
                slot.querySelector('.mech-name').textContent = mech.name;
                slot.querySelector('.mech-roll').textContent = `(Roll: ${mech.roll})`;
                slot.querySelector('.mech-cost').textContent = `Cost: ${mech.cost}`;
                
                // Update class selection to match what was rolled
                const classSelect = slot.querySelector('.mech-class-select');
                if (classSelect) {
                    classSelect.value = mech.selectedClass;
                }
            });
            
            this.updateLanceTotal(lanceElement, lance);
        }
        
        this.updateSummary();
        this.setStatus(`Rolled ${lance.type} Lance (Total: ${totalCost} FP)`);
    }

    rollAllLances() {
        if (!this.mechData || !this.assignmentTables) {
            this.setStatus('Error: Mech data not loaded. Please load mech data first.', 'error');
            return;
        }
        
        this.lances.forEach(lance => {
            this.rollLance(lance.id);
        });
        
        this.setStatus('Rolled all lances');
    }

    getMechClassForLanceType(lanceType) {
        // Simple mapping - can be enhanced with more complex logic
        const mappings = {
            'Assault': 'Assault',
            'Battle': 'Heavy',
            'Striker': 'Medium',
            'Fire': 'Light'
        };
        
        return mappings[lanceType] || 'Medium';
    }

    getMechFromRoll(roll, mechClass, lanceType) {
        if (!this.assignmentTables || !this.assignmentTables[lanceType] || !this.assignmentTables[lanceType][mechClass]) {
            return null;
        }
        
        const table = this.assignmentTables[lanceType][mechClass];
        const entry = table.find(item => item.roll === roll);
        
        if (entry && this.mechData) {
            const mech = this.mechData.find(mech => mech.id === entry.mechId);
            if (mech && this.mechPrices) {
                // Add price from mech_prices.json
                mech.price = this.mechPrices[mech.class] || 0;
            }
            return mech;
        }
        
        return null;
    }

    updateLanceTotal(lanceElement, lance) {
        const total = lance.mechs.reduce((sum, mech) => sum + mech.cost, 0);
        lanceElement.querySelector('.lance-total-cost').textContent = total;
    }

    removeSelectedLances() {
        const checkboxes = document.querySelectorAll('.lance-checkbox:checked');
        const lanceIds = Array.from(checkboxes).map(cb => {
            const lanceElement = cb.closest('.lance-item');
            return parseInt(lanceElement.dataset.lanceId);
        });
        
        // Remove from data
        this.lances = this.lances.filter(lance => !lanceIds.includes(lance.id));
        
        // Remove from UI
        lanceIds.forEach(id => {
            const element = document.querySelector(`[data-lance-id="${id}"]`);
            if (element) {
                element.remove();
            }
        });
        
        this.updateRemoveButtonState();
        this.updateSummary();
        this.setStatus(`Removed ${lanceIds.length} lance(s)`);
    }

    updateRemoveButtonState() {
        const checkboxes = document.querySelectorAll('.lance-checkbox:checked');
        const removeBtn = document.getElementById('removeLanceBtn');
        removeBtn.disabled = checkboxes.length === 0;
    }

    clearAllLances() {
        this.lances = [];
        this.nextLanceId = 1;
        
        const lancesList = document.getElementById('lancesList');
        lancesList.innerHTML = '';
        
        this.addDefaultLances();
        this.updateSummary();
        this.setStatus('Cleared all lances');
    }

    async loadMechData() {
        try {
            const result = await window.electronAPI.showOpenDialog({
                title: 'Load Mech Data Bundle',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const data = await window.electronAPI.readJsonFile(filePath);
                
                // Check if this is a bundled data file or individual file
                if (data.mechs && data.prices && data.assignmentTables) {
                    // Bundled data file
                    this.mechData = data.mechs;
                    this.mechPrices = data.prices;
                    this.assignmentTables = data.assignmentTables;
                    this.setStatus(`Loaded bundled data: ${data.mechs.length} mechs, ${Object.keys(data.assignmentTables).length} lance types from ${filePath}`);
                } else if (Array.isArray(data)) {
                    // Individual mechs file
                    this.mechData = data;
                    this.setStatus(`Loaded ${data.length} mechs from ${filePath}`);
                } else if (typeof data === 'object') {
                    // Check if it's assignment tables or prices
                    if (data.Light || data.Medium || data.Heavy || data.Assault) {
                        // Check if it's prices (simple key-value) or assignment tables (nested)
                        if (typeof data.Light === 'number') {
                            this.mechPrices = data;
                            this.setStatus(`Loaded mech prices from ${filePath}`);
                        } else {
                            this.assignmentTables = data;
                            this.setStatus(`Loaded assignment tables from ${filePath}`);
                        }
                    } else {
                        this.assignmentTables = data;
                        this.setStatus(`Loaded assignment tables from ${filePath}`);
                    }
                } else {
                    this.setStatus('Error: Invalid JSON format', 'error');
                }
            }
        } catch (error) {
            this.setStatus(`Error loading file: ${error.message}`, 'error');
        }
    }

    async saveForce() {
        try {
            const forceData = {
                name: `Force_${new Date().toISOString().split('T')[0]}`,
                forcePoints: this.currentForcePoints,
                lances: this.lances,
                totalCost: this.getTotalCost(),
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
                this.setStatus(`Force saved to ${result.filePath}`);
            }
        } catch (error) {
            this.setStatus(`Error saving force: ${error.message}`, 'error');
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
                if (!forceData.lances || !Array.isArray(forceData.lances)) {
                    throw new Error('Invalid force file format');
                }
                
                // Clear current lances
                this.lances = [];
                this.nextLanceId = 1;
                document.getElementById('lancesList').innerHTML = '';
                
                // Load force points
                if (forceData.forcePoints) {
                    this.currentForcePoints = forceData.forcePoints;
                    const forcePointsSelect = document.getElementById('forcePoints');
                    if (forceData.forcePoints === 250 || forceData.forcePoints === 500 || forceData.forcePoints === 750) {
                        forcePointsSelect.value = forceData.forcePoints.toString();
                        document.getElementById('customForcePoints').classList.add('hidden');
                    } else {
                        forcePointsSelect.value = 'custom';
                        document.getElementById('customForcePoints').classList.remove('hidden');
                        document.getElementById('customForcePointsInput').value = forceData.forcePoints;
                    }
                    this.updateForcePoints();
                }
                
                // Load lances
                forceData.lances.forEach(lanceData => {
                    const lanceId = this.nextLanceId++;
                    const lance = {
                        id: lanceId,
                        type: lanceData.type || 'Assault',
                        mechs: lanceData.mechs || Array(4).fill().map(() => ({
                            name: '-',
                            roll: null,
                            cost: 0,
                            class: null
                        }))
                    };
                    
                    this.lances.push(lance);
                    this.renderLance(lance);
                    
                    // Update mech slots with loaded data
                    const lanceElement = document.querySelector(`[data-lance-id="${lanceId}"]`);
                    if (lanceElement && lanceData.mechs) {
                        const mechSlots = lanceElement.querySelectorAll('.mech-slot');
                        mechSlots.forEach((slot, index) => {
                            const mech = lance.mechs[index];
                            if (mech) {
                                slot.querySelector('.mech-name').textContent = mech.name;
                                slot.querySelector('.mech-roll').textContent = mech.roll ? `(Roll: ${mech.roll})` : '(Roll: -)';
                                slot.querySelector('.mech-cost').textContent = mech.cost > 0 ? `Cost: ${mech.cost}` : 'Cost: -';
                            }
                        });
                        this.updateLanceTotal(lanceElement, lance);
                    }
                });
                
                this.updateRemoveButtonState();
                this.updateSummary();
                this.setStatus(`Force loaded from ${filePath}`);
            }
        } catch (error) {
            this.setStatus(`Error loading force: ${error.message}`, 'error');
        }
    }

    getTotalCost() {
        return this.lances.reduce((total, lance) => {
            return total + lance.mechs.reduce((lanceTotal, mech) => lanceTotal + mech.cost, 0);
        }, 0);
    }

    getMechCountByClass() {
        const counts = {
            'Light': 0,
            'Medium': 0,
            'Heavy': 0,
            'Assault': 0
        };
        
        this.lances.forEach(lance => {
            lance.mechs.forEach(mech => {
                if (mech.class && counts.hasOwnProperty(mech.class)) {
                    counts[mech.class]++;
                }
            });
        });
        
        return counts;
    }

    updateSummary() {
        const totalCost = this.getTotalCost();
        const remaining = this.currentForcePoints - totalCost;
        const mechCounts = this.getMechCountByClass();
        const totalMechs = Object.values(mechCounts).reduce((a, b) => a + b, 0);
        
        // Update stats
        document.getElementById('usedPoints').textContent = totalCost;
        document.getElementById('remainingPoints').textContent = remaining;
        document.getElementById('totalMechs').textContent = totalMechs;
        
        // Update class breakdown
        const classBreakdown = document.getElementById('classBreakdown');
        classBreakdown.innerHTML = '';
        
        Object.entries(mechCounts).forEach(([className, count]) => {
            const classItem = document.createElement('div');
            classItem.className = 'class-item';
            classItem.innerHTML = `
                <span class="class-name">${className}</span>
                <span class="class-count">${count}</span>
            `;
            classBreakdown.appendChild(classItem);
        });
        
        // Update force details
        const forceDetails = document.getElementById('forceDetails');
        if (totalMechs === 0) {
            forceDetails.innerHTML = '<p class="empty-message">No mechs assigned yet. Click "Roll All Mechs" to start.</p>';
        } else {
            forceDetails.innerHTML = '';
            this.lances.forEach(lance => {
                lance.mechs.forEach((mech, index) => {
                    if (mech.name !== '-') {
                        const mechDetail = document.createElement('div');
                        mechDetail.className = 'mech-detail';
                        mechDetail.innerHTML = `
                            <div class="mech-detail-info">
                                <div class="mech-detail-name">${mech.name}</div>
                                <div class="mech-detail-lance">${lance.type} Lance • Mech ${index + 1}</div>
                                <div class="mech-detail-roll">Roll: ${mech.roll} • Class: ${mech.class || 'Unknown'}</div>
                            </div>
                            <div class="mech-detail-cost">${mech.cost} FP</div>
                        `;
                        forceDetails.appendChild(mechDetail);
                    }
                });
            });
        }
        
        // Update chart if Chart.js is available (simplified for now)
        this.updateChart(mechCounts);
    }

    updateChart(mechCounts) {
        // Simple chart implementation - can be enhanced with Chart.js later
        const canvas = document.getElementById('compositionChart');
        if (!canvas.getContext) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw simple text chart for now
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        
        const total = Object.values(mechCounts).reduce((a, b) => a + b, 0);
        if (total === 0) {
            ctx.fillText('No mechs assigned', width / 2, height / 2);
            return;
        }
        
        // Draw simple bars
        const classes = ['Light', 'Medium', 'Heavy', 'Assault'];
        const colors = ['#4fc3f7', '#81c784', '#ffb74d', '#e94560'];
        const barWidth = 40;
        const spacing = 20;
        const startX = (width - (classes.length * (barWidth + spacing) - spacing)) / 2;
        
        classes.forEach((className, index) => {
            const count = mechCounts[className] || 0;
            const percentage = total > 0 ? count / total : 0;
            const barHeight = percentage * (height - 60);
            const x = startX + index * (barWidth + spacing);
            const y = height - 40 - barHeight;
            
            // Draw bar
            ctx.fillStyle = colors[index];
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Draw label
            ctx.fillStyle = '#fff';
            ctx.fillText(className, x + barWidth / 2, height - 20);
            ctx.fillText(count.toString(), x + barWidth / 2, y - 10);
        });
    }

    setStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        
        // Reset classes
        statusElement.className = 'status';
        
        // Add type class
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
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if electronAPI is available
    if (window.electronAPI) {
        window.forceBuilder = new ForceBuilder();
        console.log('BattleTech Force Builder initialized');
    } else {
        console.error('Electron API not available');
        document.getElementById('statusMessage').textContent = 
            'Error: Electron API not available. Please run in Electron environment.';
    }
});
