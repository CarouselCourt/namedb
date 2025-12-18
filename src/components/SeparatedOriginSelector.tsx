/**
 * ========================================
 * SEPARATED ORIGIN SELECTOR COMPONENT
 * ========================================
 * 
 * A 4-column selector for hierarchical origins with independent search
 * and cascading selection logic. Used in the category manager and filters.
 * 
 * KEY FEATURES:
 * - **4-level hierarchy**: Continent → Region → Country → Subregion
 * - **Cascading selection**: Selecting a continent enables regions
 * - **Independent search**: Each column has its own search filter
 * - **Smart enabling**: Columns enable/disable based on selections
 * - **Checkbox interface**: Clear visual state for selections
 * - **Predefined options**: Pre-programmed regions/countries that always appear in Add/Update menu
 * - **Auto-linking**: Predefined options automatically select parent levels
 * 
 * HIERARCHY EXAMPLE:
 * ```
 * Continents:         Regions:              Countries:          Subregions:
 * □ Africa            □ North Africa        □ Egypt             □ Upper Egypt
 * ☑ Europe            ☑ Iberian Peninsula   ☑ Spain             ☑ Catalonia
 * □ Asia              □ Western Europe      □ France            □ Basque Country
 *                     □ Southern Europe     □ Italy             
 * ```
 * 
 * SELECTION LOGIC:
 * 1. Select continent → Regions column becomes enabled
 * 2. Select region → Countries column becomes enabled
 * 3. Select country → Subregions column becomes enabled
 * 4. Unselecting continent → Clears all region, country, and subregion selections under it
 * 5. Multiple selections allowed at each level
 * 
 * PREDEFINED OPTIONS:
 * - **Predefined Regions** (15 European regions): Always visible in Add/Update menu
 *   - Automatically selects "Europe" when chosen
 *   - Only appears in filters if names with these regions exist
 *   - Examples: Alpine Region, Baltic States, British Isles, Nordic Region, etc.
 * 
 * - **Predefined Countries** (Baltic States): Always visible in Add/Update menu
 *   - Automatically selects both "Europe" AND "Baltic States" when chosen
 *   - Only appears in filters if names with these countries exist
 *   - Countries: Estonia, Latvia, Lithuania
 * 
 * - **Predefined Subregions** (Estonian regions): Always visible in Add/Update menu
 *   - Automatically selects "Europe", "Baltic States", AND "Estonia" when chosen
 *   - Only appears in filters if names with these subregions exist
 *   - Subregions: Harju County
 * 
 * DATA STRUCTURE:
 * Origins are stored as paths: "Europe > Iberian Peninsula > Spain > Catalonia"
 * This component parses these paths and presents them as separate columns.
 * 
 * USE CASES:
 * - Filter names by geographic origin
 * - Select multiple origin branches simultaneously
 * - Explore the origin hierarchy visually
 */

import { useState, useMemo, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

/**
 * Component Props
 * 
 * @param allOrigins - All hierarchical origin paths (e.g., "Europe > Iberian Peninsula > Spain > Catalonia")
 * @param selectedOrigins - Currently selected origin paths
 * @param onSelectionChange - Callback when selection changes
 * @param predefinedContinents - Continents that always appear in the list (optional)
 * @param predefinedRegions - Regions that always appear in Add/Update menu (optional)
 *                           - Automatically linked to "Europe" continent
 *                           - Only appear in filters if names with these regions exist in database
 *                           - Current list: Alpine Region, Baltic States, British Isles, etc. (15 regions)
 * @param predefinedCountries - Countries that always appear in Add/Update menu (optional)
 *                             - Automatically linked to "Europe" AND "Baltic States"
 *                             - Only appear in filters if names with these countries exist in database
 *                             - Current list: Estonia, Latvia, Lithuania
 * @param predefinedSubregions - Subregions that always appear in Add/Update menu (optional)
 *                              - Automatically linked to "Europe", "Baltic States", AND "Estonia"
 *                              - Only appear in filters if names with these subregions exist in database
 *                              - Current list: Harju County
 */
interface SeparatedOriginSelectorProps {
  allOrigins: string[]; // All hierarchical origin paths like "Europe > Iberian Peninsula > Spain > Catalonia"
  selectedOrigins: string[];
  onSelectionChange: (origins: string[]) => void;
  predefinedContinents?: string[];
  predefinedRegions?: string[];
  predefinedCountries?: string[];
  predefinedSubregions?: string[];
}

/**
 * SeparatedOriginSelector Component
 */
export const SeparatedOriginSelector = ({
  allOrigins,
  selectedOrigins,
  onSelectionChange,
  predefinedContinents = [],
  predefinedRegions = [],
  predefinedCountries = [],
  predefinedSubregions = [],
}: SeparatedOriginSelectorProps) => {
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  /**
   * Search terms for each column
   */
  const [continentSearch, setContinentSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [subregionSearch, setSubregionSearch] = useState("");
  
  /**
   * Intermediate selection state for UI
   * These track which continents/regions/countries are selected to enable cascading
   */
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize selected continents, regions, and countries from selectedOrigins prop
   * 
   * This parses the full paths to determine which levels
   * should be marked as selected in the UI.
   */
  useEffect(() => {
    const continents = new Set<string>();
    const regions = new Set<string>();
    const countries = new Set<string>();
    
    selectedOrigins.forEach(origin => {
      const parts = origin.split(' > ');
      if (parts.length >= 1) {
        continents.add(parts[0]);
      }
      if (parts.length >= 2) {
        regions.add(parts[1]);
      }
      if (parts.length >= 3) {
        countries.add(parts[2]);
      }
    });
    
    setSelectedContinents(Array.from(continents));
    setSelectedRegions(Array.from(regions));
    setSelectedCountries(Array.from(countries));
  }, [selectedOrigins]);

  // ============================================================================
  // DATA STRUCTURE PARSING
  // ============================================================================
  
  /**
   * Parse flat list of paths into a 4-level hierarchical structure
   * 
   * Input: ["Europe > Iberian Peninsula > Spain > Catalonia", "Europe > Western Europe > France", "Asia > East Asia > China"]
   * Output: Map {
   *   "Europe" → Map {
   *     "Iberian Peninsula" → Map {
   *       "Spain" → Set { "Catalonia" }
   *     },
   *     "Western Europe" → Map {
   *       "France" → Set {}
   *     }
   *   },
   *   "Asia" → Map {
   *     "East Asia" → Map {
   *       "China" → Set {}
   *     }
   *   }
   * }
   */
  const originStructure = useMemo(() => {
    const structure = new Map<string, Map<string, Map<string, Set<string>>>>();
    
    allOrigins.forEach(path => {
      const parts = path.split(' > ');
      const continent = parts[0];
      
      if (!structure.has(continent)) {
        structure.set(continent, new Map());
      }
      
      if (parts.length > 1) {
        const region = parts[1];
        const continentMap = structure.get(continent)!;
        
        if (!continentMap.has(region)) {
          continentMap.set(region, new Map());
        }
        
        if (parts.length > 2) {
          const country = parts[2];
          const regionMap = continentMap.get(region)!;
          
          if (!regionMap.has(country)) {
            regionMap.set(country, new Set());
          }
          
          if (parts.length > 3) {
            const subregion = parts[3];
            regionMap.get(country)!.add(subregion);
          }
        }
      }
    });
    
    return structure;
  }, [allOrigins]);

  // ============================================================================
  // FILTERED LISTS FOR EACH COLUMN
  // ============================================================================
  
  /**
   * Continents: All top-level origins (including predefined), filtered by search
   */
  const continents = useMemo(() => {
    const allContinents = new Set([
      ...predefinedContinents,
      ...Array.from(originStructure.keys())
    ]);
    
    return Array.from(allContinents)
      .filter(origin => origin.toLowerCase().includes(continentSearch.toLowerCase()))
      .sort();
  }, [originStructure, continentSearch, predefinedContinents]);

  /**
   * Regions: Origins under selected continents, filtered by search
   * Only populated if at least one continent is selected
   * Includes predefined regions if Europe is selected
   */
  const regions = useMemo(() => {
    if (selectedContinents.length === 0) return [];
    
    const regs = new Set<string>();
    selectedContinents.forEach(continent => {
      const continentMap = originStructure.get(continent);
      if (continentMap) {
        continentMap.forEach((_, region) => regs.add(region));
      }
      
      // Add predefined regions if Europe is selected
      if (continent === "Europe" && predefinedRegions.length > 0) {
        predefinedRegions.forEach(region => regs.add(region));
      }
    });
    
    return Array.from(regs)
      .filter(origin => origin.toLowerCase().includes(regionSearch.toLowerCase()))
      .sort();
  }, [originStructure, selectedContinents, regionSearch, predefinedRegions]);

  /**
   * Countries: Origins under selected continents + regions, filtered by search
   * Only populated if both continents and regions are selected
   * Includes predefined countries if Europe and Baltic States are selected
   */
  const countries = useMemo(() => {
    if (selectedContinents.length === 0 || selectedRegions.length === 0) return [];
    
    const ctrs = new Set<string>();
    selectedContinents.forEach(continent => {
      const continentMap = originStructure.get(continent);
      if (continentMap) {
        selectedRegions.forEach(region => {
          const regionMap = continentMap.get(region);
          if (regionMap) {
            regionMap.forEach((_, country) => ctrs.add(country));
          }
        });
      }
    });
    
    // Add predefined countries if Europe and Baltic States are both selected
    if (selectedContinents.includes("Europe") && selectedRegions.includes("Baltic States") && predefinedCountries.length > 0) {
      predefinedCountries.forEach(country => ctrs.add(country));
    }
    
    return Array.from(ctrs)
      .filter(origin => origin.toLowerCase().includes(countrySearch.toLowerCase()))
      .sort();
  }, [originStructure, selectedContinents, selectedRegions, countrySearch, predefinedCountries]);

  /**
   * Subregions: Origins under selected continents + regions + countries, filtered by search
   * Only populated if continents, regions, and countries are selected
   */
  const subregions = useMemo(() => {
    if (selectedContinents.length === 0 || selectedRegions.length === 0 || selectedCountries.length === 0) return [];
    
    const subregs = new Set<string>();
    selectedContinents.forEach(continent => {
      const continentMap = originStructure.get(continent);
      if (continentMap) {
        selectedRegions.forEach(region => {
          const regionMap = continentMap.get(region);
          if (regionMap) {
            selectedCountries.forEach(country => {
              const countrySet = regionMap.get(country);
              if (countrySet) {
                countrySet.forEach(subregion => subregs.add(subregion));
              }
            });
          }
        });
      }
    });
    
    // Add predefined subregions if Europe, Baltic States, and Estonia are all selected
    if (selectedContinents.includes("Europe") && 
        selectedRegions.includes("Baltic States") && 
        selectedCountries.includes("Estonia") && 
        predefinedSubregions.length > 0) {
      predefinedSubregions.forEach(subregion => subregs.add(subregion));
    }
    
    return Array.from(subregs)
      .filter(origin => origin.toLowerCase().includes(subregionSearch.toLowerCase()))
      .sort();
  }, [originStructure, selectedContinents, selectedRegions, selectedCountries, subregionSearch, predefinedSubregions]);

  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================
  
  /**
   * Handle toggling a continent
   * 
   * When checking: Adds the continent to selectedOrigins
   * When unchecking: Removes continent AND all descendants from selectedOrigins
   */
  const handleContinentToggle = (continent: string, checked: boolean) => {
    const newSelectedContinents = checked 
      ? [...selectedContinents, continent]
      : selectedContinents.filter(c => c !== continent);
    
    setSelectedContinents(newSelectedContinents);
    
    if (checked) {
      if (!selectedOrigins.includes(continent)) {
        onSelectionChange([...selectedOrigins, continent]);
      }
    } else {
      // If unchecking, clear this continent and all regions/countries/subregions under it
      const newSelected = selectedOrigins.filter(origin => origin !== continent && !origin.startsWith(continent + ' > '));
      onSelectionChange(newSelected);
    }
  };

  /**
   * Handle toggling a region
   * 
   * When checking: Adds "Continent > Region" paths for all selected continents
   * When unchecking: Removes all matching "Continent > Region" paths and their descendants
   * Special: If region is predefined, auto-selects Europe if not already selected
   */
  const handleRegionToggle = (region: string, checked: boolean) => {
    const newSelectedRegions = checked
      ? [...selectedRegions, region]
      : selectedRegions.filter(r => r !== region);
    
    setSelectedRegions(newSelectedRegions);
    
    if (checked) {
      const pathsToAdd: string[] = [];
      let needsEurope = false;
      
      // Check if this is a predefined region
      const isPredefinedRegion = predefinedRegions.includes(region);
      
      // If it's a predefined region and Europe isn't selected, auto-select Europe
      if (isPredefinedRegion && !selectedContinents.includes("Europe")) {
        needsEurope = true;
      }
      
      selectedContinents.forEach(continent => {
        const path = `${continent} > ${region}`;
        if (allOrigins.includes(path) && !selectedOrigins.includes(path)) {
          pathsToAdd.push(path);
        }
      });
      
      // For predefined regions, always try to add with Europe
      if (isPredefinedRegion) {
        const europePath = `Europe > ${region}`;
        if (!selectedOrigins.includes(europePath)) {
          pathsToAdd.push(europePath);
        }
      }
      
      let newOrigins = [...selectedOrigins, ...pathsToAdd];
      
      // Auto-add Europe if needed
      if (needsEurope) {
        if (!selectedOrigins.includes("Europe")) {
          newOrigins = [...newOrigins, "Europe"];
        }
        setSelectedContinents([...selectedContinents, "Europe"]);
      }
      
      if (pathsToAdd.length > 0 || needsEurope) {
        onSelectionChange(newOrigins);
      }
    } else {
      // If unchecking, clear countries and subregions for this region
      const prefixes = selectedContinents.map(continent => `${continent} > ${region}`);
      const newSelected = selectedOrigins.filter(origin => 
        !prefixes.some(prefix => origin === prefix || origin.startsWith(prefix + ' > '))
      );
      onSelectionChange(newSelected);
    }
  };

  /**
   * Handle toggling a country
   * 
   * Adds/removes "Continent > Region > Country" paths for all selected continent+region combinations
   * Special: If country is predefined, auto-selects Europe and Baltic States if not already selected
   */
  const handleCountryToggle = (country: string, checked: boolean) => {
    const newSelectedCountries = checked
      ? [...selectedCountries, country]
      : selectedCountries.filter(c => c !== country);
    
    setSelectedCountries(newSelectedCountries);
    
    if (checked) {
      const pathsToAdd: string[] = [];
      let needsEurope = false;
      let needsBalticStates = false;
      
      // Check if this is a predefined country
      const isPredefinedCountry = predefinedCountries.includes(country);
      
      // If it's a predefined country and Europe or Baltic States aren't selected, auto-select them
      if (isPredefinedCountry) {
        if (!selectedContinents.includes("Europe")) {
          needsEurope = true;
        }
        if (!selectedRegions.includes("Baltic States")) {
          needsBalticStates = true;
        }
      }
      
      selectedContinents.forEach(continent => {
        selectedRegions.forEach(region => {
          const path = `${continent} > ${region} > ${country}`;
          if (allOrigins.includes(path) && !selectedOrigins.includes(path)) {
            pathsToAdd.push(path);
          }
        });
      });
      
      // For predefined countries, always try to add with Europe > Baltic States
      if (isPredefinedCountry) {
        const balticPath = `Europe > Baltic States > ${country}`;
        if (!selectedOrigins.includes(balticPath)) {
          pathsToAdd.push(balticPath);
        }
      }
      
      let newOrigins = [...selectedOrigins, ...pathsToAdd];
      
      // Auto-add Europe if needed
      if (needsEurope) {
        if (!selectedOrigins.includes("Europe")) {
          newOrigins = [...newOrigins, "Europe"];
        }
        setSelectedContinents([...selectedContinents, "Europe"]);
      }
      
      // Auto-add Baltic States if needed
      if (needsBalticStates) {
        const balticPath = "Europe > Baltic States";
        if (!selectedOrigins.includes(balticPath)) {
          newOrigins = [...newOrigins, balticPath];
        }
        setSelectedRegions([...selectedRegions, "Baltic States"]);
      }
      
      if (pathsToAdd.length > 0 || needsEurope || needsBalticStates) {
        onSelectionChange(newOrigins);
      }
    } else {
      // If unchecking, clear subregions for this country
      const prefixes = selectedContinents.flatMap(continent =>
        selectedRegions.map(region => `${continent} > ${region} > ${country}`)
      );
      const newSelected = selectedOrigins.filter(origin => 
        !prefixes.some(prefix => origin === prefix || origin.startsWith(prefix + ' > '))
      );
      onSelectionChange(newSelected);
    }
  };

  /**
   * Handle toggling a subregion
   * 
   * Adds/removes "Continent > Region > Country > Subregion" paths for all selected combinations
   * Auto-selects parent levels for predefined subregions
   */
  const handleSubregionToggle = (subregion: string, checked: boolean) => {
    let needsEurope = false;
    let needsBalticStates = false;
    let needsEstonia = false;
    
    // Check if this is a predefined subregion
    const isPredefinedSubregion = predefinedSubregions.includes(subregion);
    
    // If it's a predefined subregion and parent levels aren't selected, auto-select them
    if (isPredefinedSubregion && checked) {
      if (!selectedContinents.includes("Europe")) {
        needsEurope = true;
      }
      if (!selectedRegions.includes("Baltic States")) {
        needsBalticStates = true;
      }
      if (!selectedCountries.includes("Estonia")) {
        needsEstonia = true;
      }
    }
    
    // Update state if needed
    if (needsEurope) {
      setSelectedContinents([...selectedContinents, "Europe"]);
    }
    if (needsBalticStates) {
      setSelectedRegions([...selectedRegions, "Baltic States"]);
    }
    if (needsEstonia) {
      setSelectedCountries([...selectedCountries, "Estonia"]);
    }
    
    const newPaths: string[] = [];
    
    // Build paths for all selected combinations
    const continentsToUse = needsEurope ? [...selectedContinents, "Europe"] : selectedContinents;
    const regionsToUse = needsBalticStates ? [...selectedRegions, "Baltic States"] : selectedRegions;
    const countriesToUse = needsEstonia ? [...selectedCountries, "Estonia"] : selectedCountries;
    
    continentsToUse.forEach(continent => {
      regionsToUse.forEach(region => {
        countriesToUse.forEach(country => {
          const path = `${continent} > ${region} > ${country} > ${subregion}`;
          if (allOrigins.includes(path) || isPredefinedSubregion) {
            newPaths.push(path);
          }
        });
      });
    });
    
    if (checked) {
      // Add parent level paths if they were auto-selected
      const parentsToAdd = [];
      if (needsEurope) parentsToAdd.push("Europe");
      if (needsBalticStates) parentsToAdd.push("Europe > Baltic States");
      if (needsEstonia) parentsToAdd.push("Europe > Baltic States > Estonia");
      
      onSelectionChange([
        ...selectedOrigins, 
        ...parentsToAdd.filter(p => !selectedOrigins.includes(p)),
        ...newPaths.filter(p => !selectedOrigins.includes(p))
      ]);
    } else {
      const pathsToRemove = new Set(newPaths);
      onSelectionChange(selectedOrigins.filter(origin => !pathsToRemove.has(origin)));
    }
  };

  /**
   * Check if a country is selected
   * (Used to determine checkbox state in UI)
   */
  const isCountrySelected = (country: string) => {
    return selectedContinents.some(continent =>
      selectedRegions.some(region =>
        selectedOrigins.includes(`${continent} > ${region} > ${country}`)
      )
    );
  };

  /**
   * Check if a subregion is selected
   * (Used to determine checkbox state in UI)
   */
  const isSubregionSelected = (subregion: string) => {
    return selectedContinents.some(continent =>
      selectedRegions.some(region =>
        selectedCountries.some(country =>
          selectedOrigins.includes(`${continent} > ${region} > ${country} > ${subregion}`)
        )
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Continents */}
        <div>
          <Label>Continents</Label>
          <Input
            placeholder="Search continents..."
            value={continentSearch}
            onChange={(e) => setContinentSearch(e.target.value)}
            className="mb-2"
          />
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {continents.map(origin => (
              <div key={origin} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                <Checkbox
                  checked={selectedContinents.includes(origin) || selectedOrigins.includes(origin)}
                  onCheckedChange={(checked) => handleContinentToggle(origin, !!checked)}
                />
                <label className="text-sm cursor-pointer flex-1">{origin}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Regions */}
        <div>
          <Label>Regions</Label>
          <Input
            placeholder="Search regions..."
            value={regionSearch}
            onChange={(e) => setRegionSearch(e.target.value)}
            className="mb-2"
            disabled={selectedContinents.length === 0}
          />
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {regions.map(origin => {
              const isChecked = selectedRegions.includes(origin) || 
                selectedContinents.some(continent => selectedOrigins.includes(`${continent} > ${origin}`));
              
              return (
                <div key={origin} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => handleRegionToggle(origin, !!checked)}
                  />
                  <label className="text-sm cursor-pointer flex-1">{origin}</label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Countries */}
        <div>
          <Label>Countries</Label>
          <Input
            placeholder="Search countries..."
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            className="mb-2"
            disabled={selectedRegions.length === 0}
          />
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {countries.map(origin => (
              <div key={origin} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                <Checkbox
                  checked={isCountrySelected(origin)}
                  onCheckedChange={(checked) => handleCountryToggle(origin, !!checked)}
                />
                <label className="text-sm cursor-pointer flex-1">{origin}</label>
              </div>
            ))}
          </div>
        </div>

        {/* Subregions */}
        <div>
          <Label>Subregions</Label>
          <Input
            placeholder="Search subregions..."
            value={subregionSearch}
            onChange={(e) => setSubregionSearch(e.target.value)}
            className="mb-2"
            disabled={selectedCountries.length === 0}
          />
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {subregions.map(origin => (
              <div key={origin} className="flex items-center space-x-2 hover:bg-accent rounded px-1">
                <Checkbox
                  checked={isSubregionSelected(origin)}
                  onCheckedChange={(checked) => handleSubregionToggle(origin, !!checked)}
                />
                <label className="text-sm cursor-pointer flex-1">{origin}</label>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};