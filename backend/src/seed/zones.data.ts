/** Zones et adresses de service — catégorie stockée dans le champ `description`. */
export const ZONE_CATEGORIES: Record<string, string[]> = {
  'Dakar Ville': [
    'Plateau', 'Médina', 'Fann', 'Point E', 'Mermoz', 'Sacré-Cœur 1', 'Sacré-Cœur 2',
    'Sacré-Cœur 3', 'Sacré-Cœur 4', 'Amitié 1', 'Amitié 2', 'Zone A', 'Zone B', 'Zone C',
    'Zone D', 'HLM', 'Colobane', 'Gueule Tapée', 'Fass', 'Grand Dakar', 'Grand Yoff',
    'Liberté 1', 'Liberté 2', 'Liberté 3', 'Liberté 4', 'Liberté 5', 'Liberté 6', 'Ouakam',
    'Ngor', 'Almadies', 'Mamelles', 'Yoff', 'Cambérène', 'Parcelles Assainies', "Patte d'Oie",
    'Dieuppeul', 'Derklé', 'Castors', 'Fann Résidence', 'Hann Bel Air', 'Hann Village',
    'Mariste', 'Port', 'Plateau Technique', 'Rebeuss', 'Sicap Baobab', 'Sicap Dieuppeul',
    'Sicap Foire', 'Sicap Liberté', 'Sicap Mermoz', 'Sicap Mbao', 'Tilène', 'Usine Ben Tally',
    'Biscuiterie',
  ],
  'Banlieue Dakar': [
    'Pikine', 'Guédiawaye', 'Thiaroye', 'Thiaroye sur Mer', 'Rufisque', 'Keur Massar',
    'Malika', 'Diamaguène', 'Mbao', 'Fass Mbao', 'Sam Notaire', 'Golf Sud',
    'Wakhinane Nimzatt', 'Médina Gounass', 'Ndiarème Limamoulaye', 'Daroukhane', 'Yeumbeul',
    'Jaxaay', 'Tivaouane Peulh', 'Sangalkam', 'Diamniadio', 'Sébikotane',
  ],
  'Aéroport': [
    'Aéroport International Blaise Diagne (AIBD)',
    'Ancien Aéroport Léopold Sédar Senghor (Yoff)',
  ],
  'Interurbain — Petite Côte': [
    'Mbour', 'Saly', 'Saly Ouest', 'Saly Portudal', 'Somone', 'Ngaparou', 'Warang',
    'Nianing', 'Popenguine', 'Toubab Dialaw', 'Joal-Fadiouth',
  ],
  'Interurbain — Nord': [
    'Thiès', 'Tivaouane', 'Khombole', 'Mékhé', 'Louga', 'Saint-Louis', 'Kébémer',
    'Richard Toll', 'Rosso',
  ],
  'Interurbain — Sud': [
    'Kaolack', 'Fatick', 'Diourbel', 'Touba', 'Mbacké', 'Tambacounda', 'Ziguinchor',
    'Sédhiou', 'Kolda', 'Kédougou',
  ],
  'Interurbain — Autres': [
    'Kaffrine', 'Foundiougne', 'Nioro du Rip', 'Linguère', 'Matam', 'Ourossogui', 'Podor',
    'Kayar', 'Gorée',
  ],
};

export interface ZoneSeedEntry {
  name: string;
  description: string;
}

export function getZoneSeedEntries(): ZoneSeedEntry[] {
  const entries: ZoneSeedEntry[] = [];
  for (const [category, names] of Object.entries(ZONE_CATEGORIES)) {
    for (const name of names) {
      entries.push({ name, description: category });
    }
  }
  return entries;
}
