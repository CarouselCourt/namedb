# Automatic Name Sorting

The name storage system now automatically saves all names in alphabetical order (case-insensitive).

## How it works

- When names are saved through `useNameStorage`, they are automatically sorted alphabetically before being saved to localStorage or the server
- This ensures the names.json file stays organized

## Sorting the existing names.json file

To sort the existing `data/names.json` file, run:

```bash
node scripts/sort-names.mjs
```

This script will:
1. Read the names.json file
2. Sort all names alphabetically by the `name` field (case-insensitive)
3. Write the sorted data back to names.json with proper formatting

The sorting happens automatically for all new saves, so the file should stay sorted going forward.
