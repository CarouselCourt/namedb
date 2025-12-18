# Geographic Origin System

This document explains how the geographic origin system works in the name database.

## Hierarchy Structure

Origins follow a 4-level hierarchy:
```
Continent → Region → Country → Subregion
```

### Example
```
Europe → Baltic States → Latvia → Riga Region
Europe → Iberian Peninsula → Spain → Catalonia
```

## Data Format

Origins are stored as hierarchical paths separated by " > ":
```
"Europe > Baltic States > Latvia"
"Europe > Iberian Peninsula > Spain > Catalonia"
```

## Predefined Origins

### Predefined Regions (15 European Regions)

These regions are always visible in the Add/Update Name menu, but only appear in filters if names with these regions exist in the database.

**All predefined regions are automatically linked to Europe.**

List of predefined regions:
- Alpine Region
- Baltic States
- British Isles
- The Caucasus
- Central Europe
- Eastern Balkans
- East Slavic Europe
- French Region
- Germanic Region
- Greece & Mediterranean Islands
- Iberian Peninsula
- Italian Peninsula
- Low Countries
- Nordic Region
- Western Balkans

### Predefined Countries (Baltic States)

These countries are always visible in the Add/Update Name menu, but only appear in filters if names with these countries exist in the database.

**All predefined countries are automatically linked to both Europe (continent) AND Baltic States (region).**

List of predefined countries:
- Estonia
- Latvia
- Lithuania

### Predefined Subregions (Estonian Regions)

These subregions are always visible in the Add/Update Name menu, but only appear in filters if names with these subregions exist in the database.

**All predefined subregions are automatically linked to Europe (continent), Baltic States (region), AND Estonia (country).**

List of predefined subregions:
- Harju County (includes Tallinn, the capital of Estonia)

## Auto-Linking Behavior

When a predefined option is selected:

1. **Predefined Region**: Automatically selects "Europe"
   - Example: Select "Nordic Region" → "Europe" is also selected

2. **Predefined Country**: Automatically selects "Europe" AND "Baltic States"
   - Example: Select "Latvia" → "Europe" and "Baltic States" are also selected

3. **Predefined Subregion**: Automatically selects "Europe", "Baltic States", AND "Estonia"
   - Example: Select "Harju County" → "Europe", "Baltic States", and "Estonia" are also selected

This ensures the geographic hierarchy remains consistent.

## Where These Appear

- **Add/Update Name Menu**: All predefined options always appear
- **Filter Menus** (Generator, Search): Only appear if there are names in the database using these origins

## Implementation

Predefined origins are defined in:
- `src/components/NameDialog.tsx` - Defines the predefined arrays (regions, countries, subregions)
- `src/components/SeparatedOriginSelector.tsx` - Implements the auto-linking logic

## Adding New Predefined Origins

To add new predefined regions, countries, or subregions:

1. Add them to the appropriate array (`predefinedRegions`, `predefinedCountries`, or `predefinedSubregions`) in `src/components/NameDialog.tsx`
2. Update the auto-linking logic in `SeparatedOriginSelector.tsx` if they should auto-select specific parents
3. Update this documentation with the new entries
