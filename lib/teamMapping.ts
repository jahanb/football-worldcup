// Map team names to ISO codes supported by country-flag-icons
export const TEAM_CODES: Record<string, string> = {
    // GROUP A
    "Mexico": "MX",
    "South Africa": "ZA",
    "South Korea": "KR",
    // GROUP B
    "Canada": "CA",
    "Switzerland": "CH",
    "Qatar": "QA",
    // GROUP C
    "Brazil": "BR",
    "Morocco": "MA",
    "Scotland": "GB-SCT", // Special code
    "Haiti": "HT",
    // GROUP D
    "United States": "US",
    "USA": "US",
    "Paraguay": "PY",
    "Australia": "AU",
    // GROUP E
    "Germany": "DE",
    "Curaçao": "CW",
    "Ivory Coast": "CI",
    "Ecuador": "EC",
    // GROUP F
    "Netherlands": "NL",
    "Japan": "JP",
    "Tunisia": "TN",
    // GROUP G
    "Belgium": "BE",
    "Egypt": "EG",
    "Iran": "IR",
    "New Zealand": "NZ",
    // GROUP H
    "Spain": "ES",
    "Uruguay": "UY",
    "Saudi Arabia": "SA",
    "Cape Verde": "CV",
    // GROUP I
    "France": "FR",
    "Senegal": "SN",
    "Norway": "NO",
    // GROUP J
    "Argentina": "AR",
    "Algeria": "DZ",
    "Austria": "AT",
    "Jordan": "JO",
    // GROUP K
    "Portugal": "PT",
    "Colombia": "CO",
    "Uzbekistan": "UZ",
    // GROUP L
    "England": "GB-ENG", // Special code
    "Croatia": "HR",
    "Panama": "PA",
    "Ghana": "GH",

    // OTHERS / PLAYOFF WINNERS (Add as needed)
    "Denmark": "DK",
    "Italy": "IT",
    "Ukraine": "UA",
    "Turkey": "TR",
    "Sweden": "SE",
    "Poland": "PL",
    "Nigeria": "NG",
    "Bolivia": "BO",
    "Costa Rica": "CR",
    "Peru": "PE",
    "Chile": "CL"
};

export const getFlagCode = (teamName: string) => {
    // Handle complex playoff names like "Denmark-North Macedonia..."
    // We try to find a known country in the name, or return null
    if (TEAM_CODES[teamName]) return TEAM_CODES[teamName];

    // Optional: Try to split "Denmark-North Macedonia" and return first flag
    const firstPart = teamName.split('-')[0].trim();
    if (TEAM_CODES[firstPart]) return TEAM_CODES[firstPart];

    return null; // No flag for unknown teams
};