import { MotionList, MotionListItem } from '../../shared/motion/MotionList.jsx'
import DRIVER_SERVICE_ICON from './assets/service-chauffeur.webp'
import CLEANING_SERVICE_ICON from './assets/service-menage.webp'
import CAR_RENTAL_SERVICE_ICON from './assets/service-car-rental.webp'

const HOME_OFFER_MOTION = Object.freeze({
  enterScale: 0.99,
  enterY: 8,
  exitScale: 0.99,
  exitY: -4,
  initialOpacity: 0.78,
  layout: true,
  stagger: 0.018,
  tapScale: 0.988,
  spring: Object.freeze({ stiffness: 390, damping: 34, mass: 0.75 }),
})

export const HOME_SERVICES = Object.freeze([
  { id: 'driver', href: '/services/chauffeur', label: 'Chauffeur', subtitle: 'À la demande', image: DRIVER_SERVICE_ICON },
  { id: 'cleaning', href: '/services/menage', label: 'Ménage', subtitle: 'Pour votre séjour', image: CLEANING_SERVICE_ICON },
  { id: 'car-rental', href: '/services/location-voiture', label: 'Location voiture', subtitle: 'Simple & rapide', image: CAR_RENTAL_SERVICE_ICON },
])

export function MiniServicesSection({ onNavigate }) {
  return (
    <section className="b225-services-mini" data-testid="home-services-mini" aria-label="Services Movera">
      <div className="b225-services-mini__head">
        <h2>Services Movera</h2>
        <span className="b225-services-mini__tag">Essentiels</span>
      </div>
      <MotionList className="b225-services-mini__rail" data-motion-list="home-services">
        {HOME_SERVICES.map((service, index) => (
          <MotionListItem
            key={service.id}
            as="button"
            type="button"
            className="b225-service-mini-card"
            config={HOME_OFFER_MOTION}
            index={index}
            data-service-id={service.id}
            onClick={() => onNavigate(service.href)}
            aria-label={`${service.label} — ${service.subtitle}`}
          >
            <span className="b225-service-mini-card__photo" aria-hidden="true">
              {service.image ? <img src={service.image} alt="" decoding="async"/> : null}
            </span>
            <span className="b225-service-mini-card__copy">
              <strong className="b225-service-mini-card__title">{service.label}</strong>
              <span className="b225-service-mini-card__subtitle">{service.subtitle}</span>
            </span>
          </MotionListItem>
        ))}
      </MotionList>
    </section>
  )
}
