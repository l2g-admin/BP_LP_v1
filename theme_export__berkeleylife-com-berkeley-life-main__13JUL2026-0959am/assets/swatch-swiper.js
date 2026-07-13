export class SwatchSwiper extends HTMLElement {
  constructor() {
    super();
    this.id = this.dataset.sectionId
    this.hideVariants = this.hasAttribute('data-hide-variants') ? true : false
    this.soom = this.hasAttribute('data-zoom') ? true : false
    this.thumbElement = this.querySelector('.thumb-swiper-container')
    this.mainElement = this.querySelector('.swatch-swiper-container')
    this.reveal()
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
    const { Swiper } = await import('https://unpkg.com/swiper@8/swiper-bundle.esm.browser.min.js');
    let thumbSwiper = false;
    if (this.thumbElement) {
      thumbSwiper = new Swiper(this.thumbElement,  {
        direction: 'horizontal',
        slidesPerView: 8,
        spaceBetween: 2,
        mousewheel: true,
        cssMode: true,
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
      const swatchSwiper = new Swiper(this.mainElement,  {
        direction: 'horizontal',
        slidesPerView: 1,
        mousewheel: true,
        cssMode: true,
        slideToClickedSlide: true,
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
      this.swatchSwiper = swatchSwiper
    }
  }

}
customElements.define('swatch-swiper', SwatchSwiper);