export function ImagePager({ count, index }) {
  return (
    <div className="carousel-pager" data-testid="carousel-image-pager" aria-label={`Image ${index + 1} sur ${count}`}>
      {Array.from({ length: count }, (_, itemIndex) => (
        <span
          key={itemIndex}
          className={itemIndex === index ? 'carousel-pager__dot is-active' : 'carousel-pager__dot'}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
