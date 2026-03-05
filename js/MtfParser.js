/**
 * MTF Parser - Parses .mtf mech files into structured data
 */
class MtfParser {
    constructor() {
        this.fs = require('fs');
        this.path = require('path');
    }

    /**
     * Parse an .mtf file into structured data
     * @param {string} filePath - Path to the .mtf file
     * @returns {Promise<Object>} Parsed mech data
     */
    async parseMtfFile(filePath) {
        try {
            const content = await this.fs.promises.readFile(filePath, 'utf8');
            return this.parseMtfContent(content);
        } catch (error) {
            console.error(`Error parsing MTF file ${filePath}:`, error);
            return this.createEmptyMechData(this.path.basename(filePath, '.mtf'));
        }
    }

    /**
     * Parse MTF content string into structured data
     * @param {string} content - MTF file content
     * @returns {Object} Parsed mech data
     */
    parseMtfContent(content) {
        const lines = content.split('\n').map(line => line.trim());
        
        const mechData = {
            basicInfo: {},
            specifications: {},
            armor: {},
            weapons: [],
            equipment: [],
            quirks: [],
            lore: {},
            internalStructure: {}
        };

        let currentSection = null;
        let sectionContent = [];

        for (const line of lines) {
            if (line === '') continue;

            // Check for section headers
            if (line.startsWith('overview:')) {
                this.finalizeSection(currentSection, sectionContent, mechData);
                currentSection = 'overview';
                sectionContent = [line.substring('overview:'.length).trim()];
            } else if (line.startsWith('capabilities:')) {
                this.finalizeSection(currentSection, sectionContent, mechData);
                currentSection = 'capabilities';
                sectionContent = [line.substring('capabilities:'.length).trim()];
            } else if (line.startsWith('deployment:')) {
                this.finalizeSection(currentSection, sectionContent, mechData);
                currentSection = 'deployment';
                sectionContent = [line.substring('deployment:'.length).trim()];
            } else if (line.startsWith('history:')) {
                this.finalizeSection(currentSection, sectionContent, mechData);
                currentSection = 'history';
                sectionContent = [line.substring('history:'.length).trim()];
            } else if (line.includes(':')) {
                // Key-value pairs
                const colonIndex = line.indexOf(':');
                const key = line.substring(0, colonIndex).trim();
                const value = line.substring(colonIndex + 1).trim();

                if (this.isBasicInfoKey(key)) {
                    mechData.basicInfo[key] = value;
                } else if (this.isSpecificationKey(key)) {
                    mechData.specifications[key] = value;
                } else if (this.isArmorKey(key)) {
                    mechData.armor[key] = value;
                } else if (key === 'quirk') {
                    mechData.quirks.push(value);
                } else if (key === 'Weapons') {
                    mechData.specifications.weaponCount = value;
                } else if (key.startsWith('manufacturer') || key.startsWith('primaryfactory') || key.startsWith('systemmanufacturer')) {
                    if (!mechData.lore.manufacturers) mechData.lore.manufacturers = [];
                    mechData.lore.manufacturers.push(line);
                }
            } else if (line.includes(',')) {
                // Weapon lines: "Medium Laser, Right Arm"
                const [weapon, location] = line.split(',').map(s => s.trim());
                if (weapon && location) {
                    mechData.weapons.push({ weapon, location });
                }
            } else if (this.isInternalStructureLine(line)) {
                // Internal structure lines
                const location = this.extractLocationFromLine(line);
                if (location) {
                    if (!mechData.internalStructure[location]) {
                        mechData.internalStructure[location] = [];
                    }
                    mechData.internalStructure[location].push(line);
                }
            } else if (currentSection && line.length > 0) {
                // Continue current lore section
                sectionContent.push(line);
            }
        }

        // Finalize last section
        this.finalizeSection(currentSection, sectionContent, mechData);

        // Post-process data
        this.postProcessMechData(mechData);

        return mechData;
    }

    /**
     * Finalize a section and add it to mechData
     */
    finalizeSection(section, content, mechData) {
        if (section && content.length > 0) {
            mechData.lore[section] = content.join(' ');
        }
    }

    /**
     * Check if key is basic info
     */
    isBasicInfoKey(key) {
        const basicInfoKeys = ['chassis', 'model', 'mul id', 'Config', 'TechBase', 'Era', 'source', 'Rules Level', 'role'];
        return basicInfoKeys.includes(key);
    }

    /**
     * Check if key is specification
     */
    isSpecificationKey(key) {
        const specKeys = ['Mass', 'Engine', 'Structure', 'Myomer', 'Heat Sinks', 'Walk MP', 'Jump MP', 'Armor'];
        return specKeys.includes(key);
    }

    /**
     * Check if key is armor location
     */
    isArmorKey(key) {
        const armorKeys = ['LA Armor', 'RA Armor', 'LT Armor', 'RT Armor', 'CT Armor', 'HD Armor', 'LL Armor', 'RL Armor', 'RTL Armor', 'RTR Armor', 'RTC Armor'];
        return armorKeys.includes(key);
    }

    /**
     * Check if line is internal structure
     */
    isInternalStructureLine(line) {
        const internalSections = ['Left Arm:', 'Right Arm:', 'Left Torso:', 'Right Torso:', 'Center Torso:', 'Head:', 'Left Leg:', 'Right Leg:'];
        return internalSections.some(section => line.startsWith(section));
    }

    /**
     * Extract location from internal structure line
     */
    extractLocationFromLine(line) {
        if (line.includes(':')) {
            return line.substring(0, line.indexOf(':')).trim();
        }
        return null;
    }

    /**
     * Post-process mech data for better structure
     */
    postProcessMechData(mechData) {
        // Extract model name from basic info
        if (mechData.basicInfo.model) {
            mechData.displayName = `${mechData.basicInfo.chassis || ''} ${mechData.basicInfo.model}`.trim();
        }

        // Parse mass as number
        if (mechData.specifications.Mass) {
            mechData.specifications.massTons = parseInt(mechData.specifications.Mass) || 0;
        }

        // Parse movement values
        if (mechData.specifications['Walk MP']) {
            mechData.specifications.walkMP = parseInt(mechData.specifications['Walk MP']) || 0;
        }
        if (mechData.specifications['Jump MP']) {
            mechData.specifications.jumpMP = parseInt(mechData.specifications['Jump MP']) || 0;
        }

        // Parse heat sinks
        if (mechData.specifications['Heat Sinks']) {
            const hsMatch = mechData.specifications['Heat Sinks'].match(/(\d+)/);
            if (hsMatch) {
                mechData.specifications.heatSinkCount = parseInt(hsMatch[1]) || 0;
                mechData.specifications.heatSinkType = mechData.specifications['Heat Sinks'].includes('Double') ? 'Double' : 'Single';
            }
        }

        // Calculate total armor
        let totalArmor = 0;
        for (const [key, value] of Object.entries(mechData.armor)) {
            const armorValue = parseInt(value) || 0;
            totalArmor += armorValue;
            mechData.armor[key.replace(' Armor', '')] = armorValue;
        }
        mechData.armor.total = totalArmor;

        // Group weapons by location
        const weaponsByLocation = {};
        mechData.weapons.forEach(weapon => {
            if (!weaponsByLocation[weapon.location]) {
                weaponsByLocation[weapon.location] = [];
            }
            weaponsByLocation[weapon.location].push(weapon.weapon);
        });
        mechData.weaponsByLocation = weaponsByLocation;
    }

    /**
     * Create empty mech data for missing files
     */
    createEmptyMechData(mechName) {
        return {
            basicInfo: {
                chassis: mechName.split(' ')[0] || mechName,
                model: mechName
            },
            displayName: mechName,
            specifications: {},
            armor: {},
            weapons: [],
            equipment: [],
            quirks: [],
            lore: {
                overview: 'Mech data file not found.',
                capabilities: 'Detailed specifications unavailable.',
                deployment: 'Deployment information unavailable.',
                history: 'Historical data unavailable.'
            },
            internalStructure: {},
            weaponsByLocation: {},
            fileMissing: true
        };
    }

    /**
     * Find .mtf file for a mech name (recursive search)
     * @param {string} mechName - Mech display name
     * @param {string} searchDir - Directory to search (default: mechs/)
     * @returns {Promise<string|null>} Path to .mtf file or null if not found
     */
    async findMtfFile(mechName, searchDir = 'mechs') {
        try {
            // Clean mech name for matching
            const cleanMechName = this.cleanMechNameForSearch(mechName);
            
            // Try exact match first
            const exactFileName = `${cleanMechName}.mtf`;
            const exactPath = this.path.join(searchDir, exactFileName);
            
            if (await this.fileExists(exactPath)) {
                return exactPath;
            }

            // Recursive search
            return await this.recursiveFindMtfFile(searchDir, cleanMechName);
        } catch (error) {
            console.error(`Error finding MTF file for ${mechName}:`, error);
            return null;
        }
    }

    /**
     * Clean mech name for file search
     */
    cleanMechNameForSearch(mechName) {
        // Remove special characters that might not be in filenames
        return mechName
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename chars
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await this.fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Recursively search for .mtf file
     */
    async recursiveFindMtfFile(dir, cleanMechName) {
        try {
            const entries = await this.fs.promises.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = this.path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Recursively search subdirectories
                    const found = await this.recursiveFindMtfFile(fullPath, cleanMechName);
                    if (found) return found;
                } else if (entry.isFile() && entry.name.endsWith('.mtf')) {
                    // Check if filename matches (case-insensitive, partial match)
                    const fileNameWithoutExt = entry.name.replace('.mtf', '');
                    if (this.namesMatch(fileNameWithoutExt, cleanMechName)) {
                        return fullPath;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error(`Error searching directory ${dir}:`, error);
            return null;
        }
    }

    /**
     * Check if two mech names match (fuzzy matching)
     */
    namesMatch(fileName, searchName) {
        // Case-insensitive comparison
        const fileLower = fileName.toLowerCase();
        const searchLower = searchName.toLowerCase();
        
        // Exact match
        if (fileLower === searchLower) return true;
        
        // Partial match (file contains search or vice versa)
        if (fileLower.includes(searchLower) || searchLower.includes(fileLower)) return true;
        
        // Remove common suffixes and try again
        const cleanFile = fileLower.replace(/ prime$/i, '').replace(/ \([^)]+\)/g, '').trim();
        const cleanSearch = searchLower.replace(/ prime$/i, '').replace(/ \([^)]+\)/g, '').trim();
        
        return cleanFile === cleanSearch || 
               cleanFile.includes(cleanSearch) || 
               cleanSearch.includes(cleanFile);
    }

    /**
     * Get formatted mech data for display
     */
    getFormattedMechData(mechData) {
        return {
            name: mechData.displayName || `${mechData.basicInfo.chassis || ''} ${mechData.basicInfo.model || ''}`.trim(),
            chassis: mechData.basicInfo.chassis || 'Unknown',
            model: mechData.basicInfo.model || 'Unknown',
            techBase: mechData.basicInfo.TechBase || 'Unknown',
            era: mechData.basicInfo.Era || 'Unknown',
            source: mechData.basicInfo.source || 'Unknown',
            role: mechData.basicInfo.role || 'Unknown',
            mass: mechData.specifications.massTons || 0,
            engine: mechData.specifications.Engine || 'Unknown',
            walkMP: mechData.specifications.walkMP || 0,
            jumpMP: mechData.specifications.jumpMP || 0,
            heatSinks: mechData.specifications['Heat Sinks'] || 'Unknown',
            armorType: mechData.specifications.Armor || 'Unknown',
            totalArmor: mechData.armor.total || 0,
            armorByLocation: mechData.armor,
            weapons: mechData.weapons,
            weaponsByLocation: mechData.weaponsByLocation,
            quirks: mechData.quirks,
            overview: mechData.lore.overview || '',
            capabilities: mechData.lore.capabilities || '',
            deployment: mechData.lore.deployment || '',
            history: mechData.lore.history || '',
            manufacturers: mechData.lore.manufacturers || [],
            internalStructure: mechData.internalStructure,
            fileMissing: mechData.fileMissing || false
        };
    }
}

// Export for Node.js/Electron
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MtfParser;
}