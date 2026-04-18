// @ts-check

/**
 * All 10 products in the General Store app.
 *
 * List order verified on-device (2026-04-15) — use position numbers when selecting
 * test products so scrolls go forward-only (top → bottom, no backtracking):
 *
 *  #1  Air Jordan 4 Retro       ← first visible, no scroll
 *  #2  Air Jordan 1 Mid SE
 *  #3  Nike Blazer Mid '77
 *  #4  Converse All Star
 *  #5  Air Jordan 9 Retro       ← mid-list
 *  #6  Jordan 6 Rings
 *  #7  Jordan Lift Off
 *  #8  LeBron Soldier 12
 *  #9  PG 3
 *  #10 Nike SFB Jungle          ← last item
 *
 * Note: LeBron Soldier 12 has a trailing space in the UIAutomator2 text node — preserved here.
 * Import these constants instead of hardcoding strings in specs.
 */
module.exports = {
  AIR_JORDAN_4_RETRO:  { name: 'Air Jordan 4 Retro',  price: '$160.97' }, // #1
  AIR_JORDAN_1_MID_SE: { name: 'Air Jordan 1 Mid SE', price: '$120.0'  }, // #2
  NIKE_BLAZER_MID_77:  { name: "Nike Blazer Mid '77",  price: '$110.0'  }, // #3
  CONVERSE_ALL_STAR:   { name: 'Converse All Star',    price: '$55.0'   }, // #4
  AIR_JORDAN_9_RETRO:  { name: 'Air Jordan 9 Retro',  price: '$170.97' }, // #5
  JORDAN_6_RINGS:      { name: 'Jordan 6 Rings',       price: '$165.0'  }, // #6
  JORDAN_LIFT_OFF:     { name: 'Jordan Lift Off',      price: '$115.0'  }, // #7
  LEBRON_SOLDIER_12:   { name: 'LeBron Soldier 12 ',   price: '$130.0'  }, // #8 — trailing space matches UIAutomator2 node
  PG_3:                { name: 'PG 3',                 price: '$110.0'  }, // #9
  NIKE_SFB_JUNGLE:     { name: 'Nike SFB Jungle',      price: '$116.97' }, // #10
};
