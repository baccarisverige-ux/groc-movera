export const messageThreads = Object.freeze([
  {
    id: 'imen-marsa',
    participant: 'Imen',
    initials: 'IA',
    role: 'Hôte · La Marsa',
    listingId: 'marsa-sea',
    stayLabel: 'La Marsa · Vue mer',
    status: 'Réservation confirmée',
    lastMessage: 'Avec plaisir, le logement sera prêt pour votre arrivée.',
    time: '18:42',
    unread: 2,
    messages: Object.freeze([
      { id: 'm1', from: 'host', text: 'Bonjour, votre réservation est bien confirmée.', time: '17:58' },
      { id: 'm2', from: 'guest', text: 'Merci. Est-ce que je peux arriver vers 15h ?', time: '18:11' },
      { id: 'm3', from: 'host', text: 'Oui, bien sûr. Le logement sera prêt pour votre arrivée.', time: '18:42' },
    ]),
  },
  {
    id: 'seif-carthage',
    participant: 'Seif',
    initials: 'SS',
    role: 'Hôte · Carthage',
    listingId: 'res-carthage',
    stayLabel: 'Dar Carthage Résidence',
    status: 'Demande en cours',
    lastMessage: 'Je vous confirme la disponibilité pour ces dates.',
    time: 'Hier',
    unread: 0,
    messages: Object.freeze([
      { id: 'm1', from: 'guest', text: 'Bonjour, le parking est-il inclus ?', time: '10:04' },
      { id: 'm2', from: 'host', text: 'Oui, une place est incluse avec le séjour.', time: '10:18' },
      { id: 'm3', from: 'host', text: 'Je vous confirme aussi la disponibilité pour ces dates.', time: '10:21' },
    ]),
  },
  {
    id: 'movera-support',
    participant: 'Movera',
    initials: 'M',
    role: 'Assistance Movera Host',
    listingId: null,
    stayLabel: 'Assistance voyageur',
    status: 'Support',
    lastMessage: 'Notre équipe reste disponible si vous avez besoin d’aide.',
    time: 'Lun.',
    unread: 0,
    messages: Object.freeze([
      { id: 'm1', from: 'host', text: 'Bienvenue chez Movera Host.', time: '09:15' },
      { id: 'm2', from: 'host', text: 'Notre équipe reste disponible si vous avez besoin d’aide.', time: '09:15' },
    ]),
  },
])

export function getMessageThread(id) {
  return messageThreads.find((thread) => thread.id === id) || null
}
