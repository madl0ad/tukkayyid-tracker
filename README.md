# BattleTech Campaign Force Builder

A modular Electron application for building BattleTech campaign forces with faction support for the Tukayyid conflict.

## Features

- **Faction Support**: Choose between ComStar (Level II - 6 mechs) and Clan (Star - 5 mechs)
- **Clan Equipment Variants**: Front-line and Second-line equipment options for Clan forces
- **Experience Level Selection**: Choose experience level for your force (Regular, Veteran, Elite, Heroic)
- **Dynamic Unit Sizing**: Units automatically adjust size based on faction (6 mechs for ComStar, 5 for Clan)
- **Random Assignment Tables (RATs)**: Roll mechs from faction-specific assignment tables
- **Force Point Management**: Track force points with 250, 500, 750, or custom values
- **Individual Mech Control**: Select class for each mech and roll individually
- **Save/Load Forces**: Save your force configurations and load them later
- **Visual Summary**: Charts and breakdowns of force composition

## Modular Architecture

The application has been refactored into a modular structure:

### Core Files
- `js/main.js` - Application entry point
- `js/ForceBuilder.js` - Main application class coordinating all managers

### Manager Classes
- `js/UnitManager.js` - Handles unit operations and rendering
- `js/DataManager.js` - Manages faction data loading and file operations
- `js/UIManager.js` - Handles UI rendering and summary updates

### Data Structure
- `data/tukayyid_bundle.json` - Main faction data bundle with:
  - ComStar: Level II units (6 mechs)
  - Clan Front-line: Star units (5 mechs) with front-line equipment
  - Clan Second-line: Star units (5 mechs) with second-line equipment

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```

## Usage

### Basic Workflow
1. Select your faction (ComStar or Clan)
2. If Clan, select equipment variant (Front-line or Second-line)
3. Set your force points budget
4. Add units using the "Add Lance" button
5. Configure unit types (Assault, Battle, Striker, Fire)
6. Select mech classes for each slot
7. Roll mechs individually or roll entire units
8. Save your force configuration

### Data Loading
- Use "Load Mech Data" to load faction data bundles
- The application supports both Tukayyid faction bundles and legacy data formats
- Default data is loaded from `data/tukayyid_bundle.json`

### Faction Details

#### ComStar
- **Unit Size**: 6 mechs (Level II)
- **Mechs**: Classic Inner Sphere designs (Atlas, BattleMaster, Marauder, etc.)
- **Pricing**: Standard Inner Sphere pricing

#### Clan Front-line
- **Unit Size**: 5 mechs (Star)
- **Mechs**: Omnimechs (Timber Wolf, Dire Wolf, Mad Dog, etc.)
- **Pricing**: Premium pricing for advanced technology

#### Clan Second-line
- **Unit Size**: 5 mechs (Star)
- **Mechs**: Older/SLDF designs (Warhammer IIC, Marauder IIC, etc.)
- **Pricing**: Reduced pricing for older equipment

## Development

### Project Structure
```
tukayyid-builder/
├── js/                    # Modular JavaScript files
│   ├── main.js           # Application entry point
│   ├── ForceBuilder.js   # Main application class
│   ├── UnitManager.js    # Unit operations and rendering
│   ├── DataManager.js    # Data loading and file operations
│   └── UIManager.js      # UI rendering and summaries
├── data/                  # Data files
│   ├── tukayyid_bundle.json  # Main faction data
│   └── ...               # Legacy data files
├── index.html            # Main HTML file
├── styles.css            # CSS styles
├── main.js               # Electron main process
├── preload.js            # Preload script for IPC
└── package.json          # Project configuration
```

### Adding New Factions
1. Add faction data to `data/tukayyid_bundle.json`
2. Update UI in `index.html` for faction selection
3. Update `ForceBuilder.js` to handle new faction logic

### Adding New Mech Data
1. Add mech entries to the appropriate faction in the data bundle
2. Update assignment tables for proper RAT distribution
3. Set appropriate pricing for the faction

## License

MIT License - See LICENSE file for details

## Credits

- BattleTech is a trademark of The Topps Company, Inc and Catalyst Game Labs.
- This application is for personal, non-commercial use only.