/**
 * MUL Exporter - Exports force data to MUL (Master Unit List) XML format
 */
class MulExporter {
    constructor(forceBuilder) {
        this.forceBuilder = forceBuilder;
        this.fs = require('fs');
        this.path = require('path');
        
        // Common multi-word chassis names
        this.multiWordChassis = [
            'Black Knight', 'Shadow Hawk', 'Phoenix Hawk', 'UrbanMech', 'Arctic Cheetah',
            'Fire Moth', 'Mist Lynx', 'Kit Fox', 'Dire Wolf', 'Stone Rhino',
            'Glass Spider', 'Vapor Eagle', 'Great Wyrm', 'Horned Owl', 'Jenner IIC',
            'Locust IIC', 'Hunchback IIC', 'Shadow Hawk IIC', 'Griffin IIC', 'Clint IIC',
            'Rifleman IIC', 'Warhammer IIC', 'Highlander IIC', 'Marauder IIC', 'Phoenix Hawk IIC',
            'Battle Cobra', 'Ice Ferret', 'Storm Crow', 'Timber Wolf', 'Mad Dog',
            'Hell Bringer', 'War Hawk', 'King Crab', 'King Fisher'
        ];
    }

    /**
     * Parse mech name into chassis and model
     * @param {string} mechName - Full mech name (e.g., "Dire Wolf Prime", "Atlas AS7-D")
     * @returns {Object} Object with chassis and model properties
     */
    parseMechName(mechName) {
        if (!mechName || mechName === '-') {
            return { chassis: 'Unknown', model: 'Unknown' };
        }
        
        // Check for multi-word chassis names first
        for (const chassis of this.multiWordChassis) {
            if (mechName.startsWith(chassis + ' ')) {
                const model = mechName.substring(chassis.length + 1).trim();
                return { chassis, model: model || 'Standard' };
            }
        }
        
        // For single-word chassis names, split by space
        const parts = mechName.split(' ');
        
        if (parts.length === 1) {
            // Single word name
            return { chassis: parts[0], model: 'Standard' };
        } else if (parts.length === 2) {
            // Two parts: chassis and model
            return { chassis: parts[0], model: parts[1] };
        } else {
            // Three or more parts: try to identify model (usually last part)
            // Common model patterns: codes like "AS7-D", "BL-6-KNT", "THE-N", or variants like "Prime", "A", "B"
            const lastPart = parts[parts.length - 1];
            const secondLastPart = parts[parts.length - 2];
            
            // Check if last part looks like a model code (contains dash or is single letter/variant)
            if (this.isModelCode(lastPart) || this.isVariant(lastPart)) {
                const chassis = parts.slice(0, parts.length - 1).join(' ');
                return { chassis, model: lastPart };
            }
            // Check if last two parts together form a model code (e.g., "ARC-2R")
            else if (this.isModelCode(`${secondLastPart} ${lastPart}`)) {
                const chassis = parts.slice(0, parts.length - 2).join(' ');
                return { chassis, model: `${secondLastPart} ${lastPart}` };
            }
            else {
                // Fallback: first word as chassis, rest as model
                const chassis = parts[0];
                const model = parts.slice(1).join(' ');
                return { chassis, model };
            }
        }
    }

    /**
     * Check if a string looks like a model code
     * @param {string} str - String to check
     * @returns {boolean} True if it looks like a model code
     */
    isModelCode(str) {
        // Model codes often contain dashes, numbers, or specific patterns
        return /[A-Z]{2,4}-\d+[A-Z]*/.test(str) || // Like "AS7-D", "ARC-2R"
               /[A-Z]{2,4}-\d+/.test(str) ||      // Like "THE-N"
               /[A-Z]+-\d+[A-Z]+/.test(str);      // Like "BL-6-KNT"
    }

    /**
     * Check if a string is a variant designation
     * @param {string} str - String to check
     * @returns {boolean} True if it's a common variant
     */
    isVariant(str) {
        const variants = ['Prime', 'A', 'B', 'C', 'D', 'S', 'M', 'K', 'H', 'L', 'P', 'R', 'X'];
        return variants.includes(str);
    }

    /**
     * Generate MUL XML for a list of mechs
     * @param {Array} mechs - Array of mech objects with name property
     * @returns {string} MUL XML content
     */
    generateMulXml(mechs) {
        // Filter out empty mechs
        const validMechs = mechs.filter(mech => mech && mech.name && mech.name !== '-');
        
        if (validMechs.length === 0) {
            throw new Error('No valid mechs to export');
        }
        
        // Start building XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<unit version="0.49.19.1">\n';
        
        // Add each mech as an entity
        validMechs.forEach(mech => {
            const { chassis, model } = this.parseMechName(mech.name);
            xml += `\t<entity chassis="${this.escapeXml(chassis)}" model="${this.escapeXml(model)}" type="Biped">\n`;
            xml += '\t</entity>\n';
        });
        
        xml += '</unit>';
        
        return xml;
    }

    /**
     * Escape XML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeXml(text) {
        if (!text) return '';
        
        return text
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '\'')
    }

    /**
     * Export a single unit to MUL format
     * @param {number} unitId - ID of the unit to export
     * @param {string} filePath - Path to save MUL file
     * @returns {Promise<boolean>} Success status
     */
    async exportUnitToMul(unitId, filePath) {
        try {
            // Find the unit
            const unit = this.forceBuilder.units.find(u => u.id === unitId);
            
            if (!unit) {
                throw new Error(`Unit with ID ${unitId} not found`);
            }
            
            // Generate XML
            const xml = this.generateMulXml(unit.mechs);
            
            // Save to file
            await this.fs.promises.writeFile(filePath, xml, 'utf8');
            
            return true;
        } catch (error) {
            console.error('Error exporting unit to MUL:', error);
            throw error;
        }
    }

    /**
     * Export entire force to MUL format
     * @param {string} filePath - Path to save MUL file
     * @returns {Promise<boolean>} Success status
     */
    async exportForceToMul(filePath) {
        try {
            // Collect all mechs from all units
            const allMechs = [];
            this.forceBuilder.units.forEach(unit => {
                unit.mechs.forEach(mech => {
                    if (mech && mech.name && mech.name !== '-') {
                        allMechs.push(mech);
                    }
                });
            });
            
            if (allMechs.length === 0) {
                throw new Error('No mechs in force to export');
            }
            
            // Generate XML
            const xml = this.generateMulXml(allMechs);
            
            // Save to file
            await this.fs.promises.writeFile(filePath, xml, 'utf8');
            
            return true;
        } catch (error) {
            console.error('Error exporting force to MUL:', error);
            throw error;
        }
    }

    /**
     * Get all mechs from a specific unit
     * @param {number} unitId - Unit ID
     * @returns {Array} Array of mech objects
     */
    getUnitMechs(unitId) {
        const unit = this.forceBuilder.units.find(u => u.id === unitId);
        return unit ? unit.mechs.filter(mech => mech.name && mech.name !== '-') : [];
    }

    /**
     * Get all mechs from entire force
     * @returns {Array} Array of all mech objects
     */
    getAllMechs() {
        const allMechs = [];
        this.forceBuilder.units.forEach(unit => {
            unit.mechs.forEach(mech => {
                if (mech.name && mech.name !== '-') {
                    allMechs.push(mech);
                }
            });
        });
        return allMechs;
    }

    /**
     * Get unit information for UI display
     * @returns {Array} Array of unit info objects
     */
    getUnitInfo() {
        return this.forceBuilder.units.map(unit => ({
            id: unit.id,
            type: unit.type,
            mechCount: unit.mechs.filter(mech => mech.name && mech.name !== '-').length,
            mechs: unit.mechs.filter(mech => mech.name && mech.name !== '-')
        }));
    }
}

// Export for Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MulExporter;
}