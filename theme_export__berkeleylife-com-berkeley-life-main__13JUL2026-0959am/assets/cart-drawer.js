class CartDrawer extends HTMLElement {
  constructor() {
    super();
    document.addEventListener('DOMContentLoaded', () => {
      this.init();
    });
  }

  async init() {
    this.allDrawers = document.querySelectorAll('[data-open-cart-drawer]');
    console.log(this.allDrawers);
    this.cartDrawerCloseButton = this.querySelector('[data-close-cart-drawer]');
    this.drawer = this.querySelector('#CartDrawer');
    console.log(this.drawer);
    this.preClasses = this.getAttribute('data-classes-pre').split(' ');
    this.postClasses = this.getAttribute('data-classes-post').split(' ');

    // Ensure all elements are available before adding event listeners
    if (this.cartDrawerCloseButton && this.drawer) {
      // Add event listeners to all cart buttons
      this.allDrawers.forEach(item => {
        item.addEventListener('click', (event) => {
          event.preventDefault();
          console.log("Button clicked:", item);
          this.open();
        });
      });

      this.cartDrawerCloseButton.addEventListener('click', (event) => {
        this.close();
      });

      document.addEventListener('click', (event) => {
        const withinBoundaries = event.composedPath().includes(this.drawer);
        const withinButton = Array.from(this.allDrawers).some(button => event.composedPath().includes(button));

        if (!withinBoundaries && !withinButton && this.hasAttribute('data-open')) {
          this.close();
        }
      });

      document.addEventListener('keyup', (event) => {
        if (event.code === 'Escape') this.close();
      });

      // Call htmx after the rest of the setup
      const htmxOrg = await import('https://cdn.skypack.dev/htmx.org');
      const htmx = htmxOrg.default;
      htmx.process(this);
    } else {
      console.error('Cart drawer elements are not found.');
    }
  }

  close() {
    this.removeAttribute('data-open');
    document.body.classList.remove('overflow-hidden');
    this.allDrawers.forEach(item => {
      item.setAttribute('aria-expanded', false);
    });
    this.postClasses.forEach((item) => {
      this.classList.remove(item);
    });
    this.preClasses.forEach((item) => {
      this.classList.add(item);
    });

    // Assume removeTrapFocus is defined elsewhere
    this.allDrawers.forEach(item => removeTrapFocus(item));
  }

  open() {
    this.setAttribute('data-open', '');
    console.log(this);
    document.body.classList.add('overflow-hidden');
    this.allDrawers.forEach(item => {
      item.setAttribute('aria-expanded', true);
    });
    this.preClasses.forEach((item) => {
      this.classList.remove(item);
    });
    this.postClasses.forEach((item) => {
      this.classList.add(item);
    });

    // Assume trapFocus is defined elsewhere
    trapFocus(this.drawer);
  }

  async render() {
    const htmxOrg = await import('https://cdn.skypack.dev/htmx.org');
    const htmx = htmxOrg.default;
    htmx.process(this);
    htmx.trigger("#CartDrawer", "render-cart", {});
  }
}

customElements.define('cart-drawer', CartDrawer);
