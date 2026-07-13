class SubMenu extends HTMLElement {
  constructor() {
    super();
    this.watch()
    this.sticky()
  }

  watch() {

    let menuObserver;
    let activeLink;

    let options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.50,
    };

    let handleIntersect = (entries, observer) => {
      for (const entry of entries) {
          // console.log(entry.target)
          if (entry.isIntersecting) {
            activeLink = this.querySelector(`[href="#${entry.target.id}"]`)
          }
          this.querySelectorAll('a').forEach(link => {
            link.classList.remove('scale-underline')
          })
          activeLink && activeLink.classList.add('scale-underline')
          // this.querySelector(`nav`).scrollTo({left: activeLink.offsetLeft - 10, behavior: 'smooth' })
      };
    };

    menuObserver = new IntersectionObserver(handleIntersect, options);

    this.querySelectorAll('a').forEach(link => {
      let id = link.getAttribute('href')
      let section = document.querySelector(id)
      if (!section) return;
      menuObserver.observe(section);
    })

  }

  sticky(){
    const stickyHeader = document.getElementById('shopify-section-header')
    if (!stickyHeader) return;
    let sticky = stickyHeader.classList.contains('shopify-section-header-sticky');
    let hidden = stickyHeader.classList.contains('shopify-section-header-hidden');
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const { target } = mutation;
        if (mutation.attributeName === 'class') {
          const currentSticky = mutation.target.classList.contains('shopify-section-header-sticky');
          const currentHidden = mutation.target.classList.contains('shopify-section-header-hidden');
          if (sticky !== currentSticky || hidden !== currentHidden) {
            sticky = currentSticky;
            hidden = currentHidden;
            if (sticky && !hidden) {
              this.parentElement.style.top = `${stickyHeader.clientHeight}px`
            } else {
              this.parentElement.style.top = '0'
            }
          }
        }
      });
    });
    observer.observe(stickyHeader, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['class']
    });
  }

}

customElements.define('sub-menu', SubMenu)