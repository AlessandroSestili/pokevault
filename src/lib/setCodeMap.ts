// Standard Pokémon set abbreviations → CardTrader set_code (matches market_cards.set_code)
export const STANDARD_TO_CT: Record<string, string> = {
  // Scarlet & Violet
  SVI: 'svi', PAL: 'pal', OBF: 'obf', PAR: 'par', PAF: 'paf',
  TEF: 'tef', TWM: 'twm', SFA: 'sfa', SCR: 'scr', SSP: 'ssp',
  // Sword & Shield
  SSH: 'ssh', RCL: 'rcl', DAA: 'daa', VIV: 'viv', BST: 'bst',
  CRE: 'cre', CEL: 'cel', FUS: 'fus', BRS: 'brs', AST: 'astr',
  LOR: 'lor', PGO: 'pgo', SIT: 'sit', CRZ: 'crz',
  // Sun & Moon
  SUM: 'sm1', GRI: 'gri', BUS: 'bus', CRI: 'cri', UPR: 'upr',
  FLI: 'fli', LON: 'lon', TEU: 'teu', UNM: 'unm', UNB: 'unb',
  // XY
  XY: 'xy1', FLF: 'flf', PHF: 'phf', ROS: 'ros', PRC: 'prc',
  BKT: 'bkt', AOR: 'aor', BKP: 'bkp', FCO: 'fco', STS: 'sts', EVO: 'evo',
}

// Standard Pokémon set abbreviations → PokéTCG.io set IDs
export const STANDARD_TO_PTCG: Record<string, string> = {
  SVI: 'sv1', PAL: 'sv2', OBF: 'sv3', PAR: 'sv4', PAF: 'sv4pt5',
  TEF: 'sv5', TWM: 'sv6', SFA: 'sv6pt5', SCR: 'sv7', SSP: 'sv8',
  SSH: 'swsh1', RCL: 'swsh2', DAA: 'swsh3', VIV: 'swsh4', BST: 'swsh5',
  CRE: 'swsh6', CEL: 'swsh7', FUS: 'swsh8', BRS: 'swsh9', AST: 'swsh10',
  LOR: 'swsh10pt5', PGO: 'swsh11', SIT: 'swsh12', CRZ: 'swsh12pt5',
  SUM: 'sm1', GRI: 'sm2', BUS: 'sm3', CRI: 'sm4', UPR: 'sm5',
  FLI: 'sm6', LON: 'sm8', TEU: 'sm9', UNM: 'sm11', UNB: 'sma',
  XY: 'xy1', FLF: 'xy2', PHF: 'xy3', ROS: 'xy4', PRC: 'xy5',
  BKT: 'xy6', AOR: 'xy7', BKP: 'xy8', FCO: 'xy10', STS: 'xy11', EVO: 'xy12',
}

// CardTrader JP set codes → TCGdex uppercase set IDs
export const CT_JP_TO_TCGDEX: Record<string, string> = {
  sv1a: 'SV1a', sv1s: 'SV1S', sv1v: 'SV1V',
  sv2a: 'SV2A', sv2d: 'SV2D', sv2p: 'SV2P',
  sv3a: 'SV3a', sv4a: 'SV4a', sv4k: 'SV4K',
  sv5a: 'SV5a', sv5k: 'SV5K', sv5m: 'SV5M',
  sv6a: 'SV6a', sv6b: 'SV6b', sv7a: 'SV7a',
  svb: 'SVb',
}

// All JP set codes (CardTrader format)
export const JP_SET_CODES = new Set(Object.keys(CT_JP_TO_TCGDEX))
