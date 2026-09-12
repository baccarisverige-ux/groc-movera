import './offer-visuals.css'

/* Colour iconography for the "become a host" offer flows.

   The Hotel flow shipped with OpenMoji colour images while Appartement, Villa
   and Maison d'hôte fell back to line art, so the same catalogue looked like
   two different products depending on which property type you picked. This
   module is the shared half: one factory, one asset folder, one set of
   codepoint maps for the common catalogue.

   Icons resolve in three steps, so a flow only has to declare what is special
   about it:
     1. a colour OpenMoji image, when the id maps to a codepoint
     2. the flow's own line art, for ids no emoji represents honestly
     3. the caller's fallback — HostOnboardingPage already draws line art for
        every common amenity, so nothing is ever iconless

   Assets are OpenMoji (CC BY-SA 4.0); see assets/offer-icons/ATTRIBUTION.md. */

const OFFER_ICON_BASE = `${import.meta.env.BASE_URL}assets/offer-icons/`

export function OfferColorImage({ code, className }) {
  return (
    <img
      className={className}
      src={`${OFFER_ICON_BASE}${code}.svg`}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  )
}

/* Common amenity catalogue → OpenMoji codepoint.

   Deliberately partial. dryer, iron and fireplace have no emoji that reads as
   the appliance rather than as weather, so they keep their line art instead of
   being forced onto a loose match. */
export const COMMON_AMENITY_IMAGE_CODES = Object.freeze({
  ac: '2744',
  essentials: '1F6CF',
  heating: '1F525',
  'hot-water': '1F4A7',
  tv: '1F4FA',
  wifi: '1F4F6',
  parking: '1F17F',
  kitchen: '1F373',
  refrigerator: '1F9CA',
  washer: '1F9FC',
  'coffee-maker': '2615',
  'cooking-basics': '1F374',
  'hair-dryer': '1F4A8',
  hangers: '1F455',
  shampoo: '1F9F4',
  crib: '1F476',
  workspace: '1F4BB',
  'ev-charger': '1F50C',
  'hot-tub': '1F6C1',
  outdoor: '1FA91',
  pool: '1F3CA',
  'beach-access': '1F3D6',
  waterfront: '1F30A',
  gym: '1F3CB',
})

/* Stay highlight catalogue → OpenMoji codepoint. Covers every id in
   STAY_LISTING_HIGHLIGHTS, so no whole-stay flow can show an empty icon slot,
   plus the six legacy COMMON_LISTING_HIGHLIGHTS ids. */
export const COMMON_HIGHLIGHT_IMAGE_CODES = Object.freeze({
  'sea-view': '1F30A',
  beachfront: '1F3D6',
  panoramic: '1F304',
  central: '1F3AF',
  historic: '1F3DB',

  'private-pool': '1F3CA',
  garden: '1F333',
  terrace: '1FA91',
  bbq: '1F356',
  rooftop: '1F306',

  luxury: '1F451',
  stylish: '2728',
  design: '1F3A8',
  unique: '1F48E',
  traditional: '1F3FA',
  peaceful: '1F54A',
  spacious: '1F6CB',
  eco: '1F33F',
  romantic: '1F495',

  family: '1F46A',
  couples: '1F491',
  groups: '1F465',
  business: '1F4BC',
  'long-stay': '1F4C5',
  accessible: '267F',
})

export const COMMON_AMENITY_GROUP_SYMBOLS = Object.freeze({
  essentials: '✦',
  popular: '♡',
  features: '⚙',
  location: '⌖',
})

export function createOfferVisuals({
  variant,
  amenityImageCodes = {},
  highlightImageCodes = {},
  renderAmenityLineIcon = null,
  renderHighlightLineIcon = null,
  groupSymbols = COMMON_AMENITY_GROUP_SYMBOLS,
}) {
  function AmenityIcon({ id, fallback = null }) {
    const code = amenityImageCodes[id]
    if (code) return <OfferColorImage code={code} className="host-offer-amenity-image" />
    const line = renderAmenityLineIcon ? renderAmenityLineIcon(id) : null
    return line || fallback
  }

  function HighlightIcon({ id }) {
    const code = highlightImageCodes[id]
    if (code) return <OfferColorImage code={code} className="host-offer-highlight-image" />
    return renderHighlightLineIcon ? renderHighlightLineIcon(id) : null
  }

  return Object.freeze({
    variant,
    amenitySymbols: Object.freeze({ ...groupSymbols }),
    AmenityIcon,
    HighlightIcon,
  })
}

/* Appartement, Villa and Maison d'hôte draw on the same catalogue and differ by
   which entries they select, not by whether icons appear at all. */
export function createStayOfferVisuals(variant) {
  return createOfferVisuals({
    variant,
    amenityImageCodes: COMMON_AMENITY_IMAGE_CODES,
    highlightImageCodes: COMMON_HIGHLIGHT_IMAGE_CODES,
  })
}
