// UIManager.js - Handles UI rendering and summary updates
class UIManager {
    constructor(forceBuilder) {
        this.forceBuilder = forceBuilder;
    }

    updateSummary() {
        const totalCost = this.forceBuilder.getTotalCost();
        const remaining = this.forceBuilder.currentForcePoints - totalCost;
        const mechCounts = this.forceBuilder.getMechCountByClass();
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
            this.forceBuilder.units.forEach(unit => {
                const unitType = this.forceBuilder.currentFaction === 'ComStar' ? 'Level II' : 'Star';
                unit.mechs.forEach((mech, index) => {
                    if (mech.name !== '-') {
                        const mechDetail = document.createElement('div');
                        mechDetail.className = 'mech-detail';
                        mechDetail.innerHTML = `
                            <div class="mech-detail-info">
                                <div class="mech-detail-name">${mech.name}</div>
                                <div class="mech-detail-lance">${unit.type} ${unitType} • Mech ${index + 1}</div>
                                <div class="mech-detail-roll">Roll: ${mech.roll} • Class: ${mech.class || 'Unknown'}</div>
                            </div>
                            <div class="mech-detail-cost">${mech.cost} FP</div>
                        `;
                        forceDetails.appendChild(mechDetail);
                    }
                });
            });
        }
        
        // Update chart
        this.updateChart(mechCounts);
    }

    updateChart(mechCounts) {
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
}