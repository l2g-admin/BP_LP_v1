export class ProductSwiper extends HTMLElement {
  constructor() {
    super();
    this.id = this.dataset.sectionId
    this.hideVariants = this.hasAttribute('data-hide-variants') ? true : false
    this.soom = this.hasAttribute('data-zoom') ? true : false
    this.initialSlide = !this.hideVariants ? parseInt(this.dataset.initialSlide, 10) : 0
    this.thumbElement = this.querySelector('.thumb-swiper-container')
    this.mainElement = this.querySelector('.product-swiper-container')
    this.reveal()

    if (!this.hideVariants) {
      document.addEventListener("variantChange", (evt) => {
        let variant = evt.context.variant
        if (!this.hideVariants) {
          this.slideToVariant(variant)
        }
      })
    }

  }

  reveal() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      this.init()
    }
    new IntersectionObserver(handleIntersection.bind(this), {rootMargin: '0px 0px 200px 0px'}).observe(this);
  }

  async init() {
    const { Swiper } = await import('https://unpkg.com/swiper@8/swiper-bundle.esm.browser.min.js')
    let thumbSwiper = false;
    let slidesPerView = 1
    if (this.mainElement.querySelectorAll('.swiper-slide').length === 1) {
      slidesPerView = 1;
      this.thumbElement.style.opacity = 0;
    }
    if (this.thumbElement) {
      thumbSwiper = new Swiper(this.thumbElement,  {
        direction: 'horizontal',
        slidesPerView: 2,
        spaceBetween: 12,
        mousewheel: true,
        cssMode: true,
        initialSlide: this.initialSlide,
        preventClicks: false,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
        a11y: {
          slideRole: 'listitem'
        }
      })
      this.thumbElement.parentElement.classList.add('md:block')
    }

    if (this.mainElement) {
      const productSwiper = new Swiper(this.mainElement,  {
        direction: 'horizontal',
        slidesPerView: slidesPerView || 1,
        mousewheel: true,
        spaceBetween: 12,
        cssMode: true,
        slideToClickedSlide: true,
        initialSlide: this.initialSlide,
        // If we need pagination
        pagination: {
          el: '.swiper-pagination',
          clickable: true
        },
        // Navigation arrows
        navigation: false,
        zoom: this.soom,
        thumbs: {
          swiper: thumbSwiper && thumbSwiper
        },
        a11y: {
          enabled: true,
          slideRole: 'listitem'
        },
        breakpoints: {
          768: {
            pagination: false
          }
        }
      })
      this.productSwiper = productSwiper
    }
  }

  slideToVariant(variant) {
    if (variant.featured_media && variant.featured_media.id) {
      let media = this.mainElement.querySelector(`[data-media-id="${this.id}-${variant.featured_media.id}"]`)
      if (media){
        let id = parseInt(media.dataset.position, 10)
        this.productSwiper.slideTo(id)
      }
    }
  }

}
customElements.define('product-swiper', ProductSwiper);