import { listingCatalog } from '../../../entities/listing/listingCatalog.js'

export const homeCategories = [
  { id: 'all', label: 'Tout', icon: '◉' },
  { id: 'guesthouse', label: "Maison d’hôte", icon: '⌂' },
  { id: 'beach', label: 'Plage', icon: '◒' },
  { id: 'hotel', label: 'Hôtel', icon: '▦' },
  { id: 'family', label: 'Appartement', icon: '♡' },
  { id: 'prestige', label: 'Villa', icon: '◇' },
  { id: 'experience', label: 'Expérience', icon: '✦' },
  { id: 'partner', label: 'Partenaire', icon: '○' },
]

export const homeDestinations = [
  { id: 'la-marsa', label: 'La Marsa', subtitle: 'Bord de mer élégant', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'sidi-bou-said', label: 'Sidi Bou Saïd', subtitle: 'Charme bleu et blanc', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'gammarth', label: 'Gammarth', subtitle: 'Plages & villas', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'carthage', label: 'Carthage', subtitle: 'Histoire & calme', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'hammamet', label: 'Hammamet', subtitle: 'Mer & médina', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'tunis', label: 'Tunis', subtitle: 'Culture & vie urbaine', image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'sousse', label: 'Sousse', subtitle: 'Plages & médina', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'djerba', label: 'Djerba', subtitle: 'Île & douceur de vivre', image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'nabeul', label: 'Nabeul', subtitle: 'Côte & artisanat', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=700&q=90&fm=webp' },
  { id: 'bizerte', label: 'Bizerte', subtitle: 'Port & paysages marins', image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=700&q=90&fm=webp' },
]

export const homeServices = [
  { id: 'car', label: 'Voiture', symbol: '🚘' },
  { id: 'transfer', label: 'Transfert', symbol: '✈' },
  { id: 'driver', label: 'Chauffeur', symbol: '♙' },
  { id: 'cleaning', label: 'Ménage', symbol: '✦' },
]

export const homeFeatured = listingCatalog

const byCategory = (category) => homeFeatured.filter((item) => item.category.split(' ').includes(category))

export const homeCollections = [
  { id: 'guesthouse', title: "Maison d’hôte", items: byCategory('guesthouse') },
  { id: 'beach', title: 'Plage', items: byCategory('beach') },
  { id: 'family', title: 'Appartement', items: byCategory('family') },
  { id: 'prestige', title: 'Villa', items: byCategory('prestige') },
  { id: 'experience', title: 'Expérience', items: byCategory('experience') },
]

const guesthouseOffers = [
  { id:'dar-sidi-bleu', title:'Dar Sidi Bleu', location:'Sidi Bou Saïd', priceTotal:'380 TND total', rating:'4.91', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'maison-jasmin', title:'Maison Jasmin', location:'La Marsa', priceTotal:'295 TND total', rating:'4.82', badge:'', image:'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'dar-medina', title:'Dar Médina', location:'Tunis', priceTotal:'260 TND total', rating:'4.76', badge:'Nouveau', image:'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'riad-carthage', title:'Riad Carthage', location:'Carthage', priceTotal:'410 TND total', rating:'4.94', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=900&q=90&fm=webp' },
]

const beachOffers = [
  { id:'sea-breeze-marsa', title:'Sea Breeze La Marsa', location:'La Marsa', priceTotal:'330 TND total', rating:'4.88', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'azure-hammamet', title:'Azure Hammamet', location:'Hammamet', priceTotal:'420 TND total', rating:'4.93', badge:'', image:'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'djerba-sand', title:'Djerba Sand House', location:'Djerba', priceTotal:'365 TND total', rating:'4.79', badge:'Nouveau', image:'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'gammarth-coast', title:'Gammarth Coast', location:'Gammarth', priceTotal:'510 TND total', rating:'4.97', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=90&fm=webp' },
]

const hotelOffers = [
  { id:'hotel-belledune', title:'Hôtel Belle Dune', location:'Hammamet', priceTotal:'245 TND total', rating:'4.73', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'hotel-marina', title:'Marina Hôtel', location:'Sousse', priceTotal:'278 TND total', rating:'4.81', badge:'', image:'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'hotel-carthage', title:'Carthage Palace', location:'Carthage', priceTotal:'390 TND total', rating:'4.90', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'hotel-djerba', title:'Djerba Garden Hôtel', location:'Djerba', priceTotal:'310 TND total', rating:'4.78', badge:'Nouveau', image:'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=90&fm=webp' },
]

const apartmentOffers = [
  { id:'apartment-marsa', title:'Appartement La Marsa', location:'La Marsa', priceTotal:'210 TND total', rating:'4.84', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'apartment-lac', title:'Résidence du Lac', location:'Tunis', priceTotal:'225 TND total', rating:'4.77', badge:'', image:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'apartment-carthage', title:'Suite Carthage', location:'Carthage', priceTotal:'250 TND total', rating:'4.89', badge:'Nouveau', image:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'apartment-gammarth', title:'Loft Gammarth', location:'Gammarth', priceTotal:'295 TND total', rating:'4.92', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=90&fm=webp' },
]

const villaOffers = [
  { id:'villa-saphir', title:'Villa Saphir', location:'Gammarth', priceTotal:'680 TND total', rating:'4.96', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'villa-azur', title:'Villa Azur', location:'Hammamet', priceTotal:'590 TND total', rating:'4.90', badge:'', image:'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'villa-olivier', title:'Villa Olivier', location:'Carthage', priceTotal:'720 TND total', rating:'4.98', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'villa-djerba', title:'Villa Djerba White', location:'Djerba', priceTotal:'640 TND total', rating:'4.87', badge:'Nouveau', image:'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=90&fm=webp' },
]

const experienceOffers = [
  { id:'sunset-sidi', title:'Sunset à Sidi Bou Saïd', location:'Sidi Bou Saïd', priceTotal:'95 TND total', rating:'4.95', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'sahara-night', title:'Nuit aux portes du Sahara', location:'Tozeur', priceTotal:'180 TND total', rating:'4.89', badge:'', image:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'sea-escape', title:'Escapade en mer', location:'Hammamet', priceTotal:'160 TND total', rating:'4.86', badge:'Nouveau', image:'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'table-tunis', title:'Table privée tunisienne', location:'Tunis', priceTotal:'125 TND total', rating:'4.92', badge:'Coup de cœur', image:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=90&fm=webp' },
]

const partnerOffers = [
  { id:'partner-marsa', title:'Movera Partner La Marsa', location:'La Marsa', priceTotal:'240 TND total', rating:'4.79', badge:'Partenaire', image:'https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'partner-sousse', title:'Movera Partner Sousse', location:'Sousse', priceTotal:'220 TND total', rating:'4.75', badge:'Partenaire', image:'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'partner-hammamet', title:'Movera Partner Hammamet', location:'Hammamet', priceTotal:'265 TND total', rating:'4.83', badge:'Partenaire', image:'https://images.unsplash.com/photo-1600607688066-890987f18a86?auto=format&fit=crop&w=900&q=90&fm=webp' },
  { id:'partner-djerba', title:'Movera Partner Djerba', location:'Djerba', priceTotal:'285 TND total', rating:'4.88', badge:'Partenaire', image:'https://images.unsplash.com/photo-1600047509782-20d39509f26d?auto=format&fit=crop&w=900&q=90&fm=webp' },
]

export const homeCategoryOffers = Object.freeze({
  all: Object.freeze([
    guesthouseOffers[0],
    beachOffers[0],
    hotelOffers[0],
    apartmentOffers[0],
    villaOffers[0],
    experienceOffers[0],
    partnerOffers[0],
  ]),
  guesthouse: Object.freeze(guesthouseOffers),
  beach: Object.freeze(beachOffers),
  hotel: Object.freeze(hotelOffers),
  family: Object.freeze(apartmentOffers),
  prestige: Object.freeze(villaOffers),
  experience: Object.freeze(experienceOffers),
  partner: Object.freeze(partnerOffers),
})
