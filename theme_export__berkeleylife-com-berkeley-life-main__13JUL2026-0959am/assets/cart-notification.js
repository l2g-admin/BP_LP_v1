class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );

    this.preClasses = this.notification.getAttribute('data-classes-pre').split(' ');
    this.postClasses = this.notification.getAttribute('data-classes-post').split(' ');
  }

  open() {
    this.preClasses.forEach((item) => {
      this.notification.classList.remove(item);
    });
    this.postClasses.forEach((item) => {
      this.notification.classList.add(item);
    });

    this.notification.addEventListener(
      'transitionend',
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.postClasses.forEach((item) => {
      this.notification.classList.remove(item);
    });
    this.preClasses.forEach((item) => {
      this.notification.classList.add(item);
    });

    document.body.removeEventListener('click', this.onBodyClick);

    removeTrapFocus(this.activeElement);
  }

  renderContents(parsedState) {
    this.productId = parsedState.id;

    // Update all defined sections
    parsedState.sections &&
      this.getSectionsToRender().forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) {
          element.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
        }
      });



    if (this.header) {
      this.header.reveal();
    }
    this.open();
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-notification-product',
        selector: `#cart-notification-product-${this.productId}`,
      },
      {
        id: 'cart-notification-button',
      },
      {
        id: 'cart-icon-bubble',
      },
      {
        id: 'cart-icon-bubble-2',
      },
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    const parser = new DOMParser();
    const parsedDocument = parser.parseFromString(html, 'text/html');
    const section = selector ? parsedDocument.querySelector(selector) : parsedDocument.body;
    return section ? section.innerHTML : '';
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);
