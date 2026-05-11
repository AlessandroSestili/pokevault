#!/usr/bin/env python3
"""
Third pass: hardcoded overrides for Pokémon that PokéAPI only serves
via form-specific slugs, plus direct fixes for special characters.
Only touches cards still at element='colorless'.
"""
import json, time, urllib.request, urllib.error

SUPABASE_URL = "https://fmkpsuqjbysaxdfbiaht.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZta3BzdXFqYnlzYXhkZmJpYWh0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA3NDM4NSwiZXhwIjoyMDkzNjUwMzg1fQ.NYZ4-Mm8GWZ9Yswm4s1-JwdsntVFg2g3SqQiapXJaLM"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# For any card name (lowercased) that PokéAPI can't find via normal slug,
# provide the TCG element directly.
OVERRIDES = {
    # Form-variant Pokémon → correct TCG type
    "aegislash":          "metal",
    "aegislash ex":       "metal",
    "morpeko":            "lightning",    # electric/dark → lightning is primary
    "toxtricity":         "lightning",
    "toxtricity ex":      "lightning",
    "maushold":           "colorless",    # Normal type
    "maushold ex":        "colorless",
    "bombirdier ex":      "darkness",     # Dark/Flying
    "palafin":            "water",
    "cramorant":          "colorless",    # Flying/Water → colorless in TCG
    "deoxys":             "psychic",
    "kecleon":            "colorless",
    "bewear":             "colorless",
    "dudunsparce":        "colorless",
    "noibat":             "dragon",
    "regigigas vstar":    "colorless",
    "oranguru v":         "colorless",
    "castform sunny form":"fire",
    # Normal/Flying Pokémon that correctly map to colorless
    "aipom":              "colorless",
    "swablu":             "colorless",
    "loudred":            "colorless",
    "starly":             "colorless",
    "pidgeotto":          "colorless",
    "drampa":             "colorless",
    "farigiraf":          "colorless",
    "lechonk":            "colorless",
    "flamigo":            "fighting",
    "chatot":             "colorless",
    "hoothoot":           "colorless",
    "snorlax":            "colorless",
    "braviary":           "colorless",
    "porygon-z":          "colorless",
    "hop's wooloo":       "colorless",
    # Special characters
    "nidoran ♂":          "psychic",
    "nidoran ♂":     "psychic",
}


def supabase_get(path, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def supabase_patch(path, match, body):
    url = f"{SUPABASE_URL}/rest/v1/{path}?{match}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={**HEADERS, "Prefer": "return=minimal"},
        method="PATCH"
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.status


def main():
    cards = supabase_get("cards", "element=eq.colorless&select=id,name&limit=1000")
    print(f"Remaining colorless: {len(cards)}")

    updated = 0
    trainers = []
    unknown = []

    for card in cards:
        cid  = card["id"]
        name = card["name"]
        key  = name.lower().strip()

        element = OVERRIDES.get(key)
        if element is None:
            # Try stripping trailing " ex", " v", " vmax", etc.
            import re
            stripped = re.sub(r"\s+(ex|v|vmax|vstar|gx)$", "", key, flags=re.IGNORECASE).strip()
            element = OVERRIDES.get(stripped)

        if element is None:
            # Likely a trainer/supporter card
            trainers.append(name)
            continue

        supabase_patch("cards", f"id=eq.{cid}", {"element": element})
        updated += 1
        print(f"  {name} → {element}")
        time.sleep(0.05)

    print(f"\nUpdated: {updated}")
    if trainers:
        print(f"Skipped (trainers/energy/unresolved) — left as 'colorless' ({len(trainers)}):")
        for n in trainers:
            print(f"  - {n}")


if __name__ == "__main__":
    main()
