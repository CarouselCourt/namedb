# FatedMagic Names - Application Documentation

## Overview

FatedMagic Names is a comprehensive name library and character name generation tool. It allows you to store, organize, search, and generate names with rich metadata including origins, meanings, etymology, and emotional associations.

## Core Features

### 1. Name Library
Browse and search through your entire collection of names with powerful filtering capabilities:

- **Text Search**: Search across name, meaning, etymology, and origin fields
- **Name Type Filter**: First names, surnames, or both
- **Gender Filter**: Masculine, feminine, neutral, or any (automatically disabled for surnames)
- **Origin Filter**: 4-level hierarchical geographic origins (Continent → Region → Country → Subregion)
- **Category Filter**: Hierarchical meaning categories (Category → Subcategory → Subsubcategory)
- **Feelings Filter**: Emotional associations (noble, warm, mysterious, etc.)
- **Status Filter**: Available, used, or blocked names
- **Phonetic Filters**: 
  - Syllable count
  - Starts with (pronunciation-based)
  - Ends with (pronunciation-based)
  - Rhymes with (pronunciation-based)

### 2. Name Generator

Two generation modes for finding the perfect character names:

#### Single Name Mode
Generate individual names with full filtering options:
- Name type selection (first name or surname)
- All standard filters apply
- Click "Generate Random Name" for a single result

#### Paired Name Mode
Generate complete character names (first name + surname combinations):
- Separate filters for first names and surnames
- Independent origin, category, and feelings filters for each
- Generate complete character identities
- Click "Generate Pair" for a matched combination

### 3. Category Manager

Organize and manage your semantic categories:
- Create hierarchical category structures
- Add, edit, and delete categories
- View all names using specific categories
- Categories persist even if no names currently use them

### 4. Name Management

#### Adding Names
Comprehensive form for entering name data:

**Basic Information:**
- Name (required)
- Name Type: First name or Surname
- Pronunciation (IPA notation)
- Gender (disabled for surnames)

**Origin & Geographic Data:**
- Hierarchical origins (Continent → Region → Country → Subregion)
- Native script (how the name is written in its original writing system)

**Semantic Information:**
- Meaning (literal translation)
- Categories (hierarchical semantic categories)
- Etymology (historical and linguistic origins)
- Etymological Roots (ancient word forms, e.g., Proto-Indo-European roots)
- Feelings (emotional associations)

**Extended Information:**
- Alternate Spellings: Different ways to write the same name
- Diminutives: Shortened or affectionate forms
- Gender Variants: Masculine/feminine counterparts
- Other Languages: Equivalents in other languages
- Notes: Free-form additional information

#### Editing Names
- Edit any field of existing names
- Duplicate detection alerts for false cognates
- Option to merge spelling variants with existing names

#### Name Status System
- **Available**: Names ready to use for characters
- **Used**: Names already assigned to characters
- **Blocked**: Names reserved or unavailable

#### Blocked Pairs
Prevent specific name combinations from appearing in the Paired Name Generator:
- Block incompatible first name + surname pairs
- Useful for avoiding inappropriate or conflicting combinations
- Manage blocked pairs from the name card actions

## Data Storage

### Local Storage
All data is stored locally in your browser using localStorage:
- Names: Persistent across sessions
- Categories: Independent of names (persist even if unused)
- Blocked pairs: Prevent unwanted name combinations

### Server Sync
If using a server setup:
- Automatic sync to `/api/names` endpoint
- Automatic sync to `/api/categories` endpoint
- History tracking in `data/names-history.jsonl`
- Automatic alphabetical sorting (see [README-SORTING.md](README-SORTING.md))
- Optional git auto-commit (configure via environment variables)

### Data Format
Names are stored in JSON format with all metadata:
```json
{
  "id": "unique-id",
  "name": "Example",
  "type": "first",
  "pronunciation": "ɛɡˈzæmpəl",
  "gender": "neutral",
  "origin": ["Europe > Iberian Peninsula > Spain"],
  "meaning": "A sample name",
  "categories": ["Nature > Elements > Fire"],
  "etymology": "From Latin exemplum",
  "script": "Εξαμπλε",
  "roots": ["*eks-ample"],
  "feelings": ["warm", "bright"],
  "alternateSpellings": ["Eksample"],
  "diminutives": ["Ex", "Exie"],
  "genderVariants": { "masculine": "Examplo", "feminine": "Exampla" },
  "otherLanguages": { "Spanish": "Ejemplo" },
  "notes": "Additional information",
  "status": "available",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Special Features

### False Cognate Detection
The system automatically detects when you're adding a name that already exists with different origins/meanings (e.g., "Andrea" in Italian vs Greek) and alerts you to add distinguishing information.

### Predefined Geographic Origins
Pre-programmed regions and countries that streamline data entry:
- See [README-ORIGINS.md](README-ORIGINS.md) for complete list and behavior
- Auto-linking to parent geographic levels
- Always visible in Add/Update menu
- Conditionally visible in filters

### Automatic Alphabetical Sorting
All names are automatically sorted alphabetically when saved:
- See [README-SORTING.md](README-SORTING.md) for details
- Ensures consistent organization
- Manual sort script available for existing data

### Pronunciation-Based Phonetic Matching
Filters and searches can use pronunciation (IPA) for accurate phonetic matching:
- Syllable counting based on vowel sounds
- Starts/ends with matching
- Rhyme detection

## Technical Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React hooks + localStorage
- **Routing**: React Router
- **Data Validation**: Duplicate detection and phonetic matching utilities

## Documentation Files

- **[README.md](README.md)**: Lovable project information and setup
- **[README-APPLICATION.md](README-APPLICATION.md)**: This file - application features and usage
- **[README-ORIGINS.md](README-ORIGINS.md)**: Geographic origin system and predefined options
- **[README-SORTING.md](README-SORTING.md)**: Automatic name sorting system

## Key Components

- **Index.tsx**: Main application page with tabs and filtering
- **NameCard.tsx**: Individual name display cards
- **NameDialog.tsx**: Add/edit name form
- **NameDialogExtended.tsx**: Extended fields for related names
- **NameGenerator.tsx**: Single name generation
- **PairedNameGenerator.tsx**: First name + surname generation
- **CategoryManager.tsx**: Category organization interface
- **SeparatedOriginSelector.tsx**: 4-column hierarchical origin picker
- **SeparatedCategorySelector.tsx**: 3-column hierarchical category picker
- **BlockedPairsDialog.tsx**: Manage blocked name combinations

## Utilities

- **useNameStorage.ts**: Name data management hook
- **useCategoryStorage.ts**: Category data management hook
- **useBlockedPairs.ts**: Blocked pair management hook
- **duplicateNames.ts**: False cognate detection
- **nameSimilarity.ts**: Name similarity scoring
- **phoneticUtils.ts**: Pronunciation-based matching (syllables, rhymes, etc.)
