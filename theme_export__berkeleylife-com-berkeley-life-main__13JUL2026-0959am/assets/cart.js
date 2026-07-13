class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
      .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    let currentQuantity = document.querySelector(`input[data-index="${event.target.dataset.index}"]`).value;

    if (event.target.name.startsWith('selling-plan-')) {
  const index = event.target.dataset.index;
  const quantity = document.querySelector(`input[data-index="${index}"][name="updates[]"]`)?.value || 1;
  const selectedPlan = document.querySelector(`input[name="selling-plan-${index}"]:checked`)?.value || '';
  this.updateQuantity(index, quantity, selectedPlan, 'selling-plan', event.target.name);
} else if (event.target.name === 'updates[]') {
  const index = event.target.dataset.index;
  const quantity = event.target.value;
  const selectedPlan = document.querySelector(`input[name="selling-plan-${index}"]:checked`)?.value || '';
  this.updateQuantity(index, quantity, selectedPlan, 'quantity', event.target.name);
}else if (document.querySelector(`select[data-index="${event.target.dataset.index}"]`)) {
      let currentSellingPlan = document.querySelector(`select[data-index="${event.target.dataset.index}"]`).value;
      this.updateQuantity(event.target.dataset.index, currentQuantity, currentSellingPlan, document.activeElement.getAttribute('name'), event.target.name);
    } else if (document.querySelector(`[data-name="selling-plan-text"][data-index="${event.target.dataset.index}"]`)) {
      let currentSellingPlanId = document.querySelector(`[data-name="selling-plan-text"][data-index="${event.target.dataset.index}"]`).getAttribute('data-plan');
      this.updateQuantity(event.target.dataset.index, currentQuantity, currentSellingPlanId, document.activeElement.getAttribute('name'), event.target.name);
    };

  }

  getSectionsToRender() {
    let sectionsToRender = [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-icon-bubble-2',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents',
      }
    ];
    if (document.getElementById('cart-free-shipping')) {
      let freeShippingSection = {
        id: 'cart-free-shipping',
        section: document.getElementById('cart-free-shipping').dataset.id,
        selector: '.js-contents',
      };
      sectionsToRender.push(freeShippingSection)
    }
    return sectionsToRender;
  }

  updateQuantity(line, quantity, selling_plan, name, whichForm) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      selling_plan,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    });

    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        document.getElementById('main-cart-footer')?.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

          if (elementToReplace) {
            console.log(elementToReplace)
            elementToReplace.innerHTML =
            this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
          }
        }));

        this.updateLiveRegions(line, parsedState.item_count, whichForm);
        document.getElementById(`CartItem-${line}`)?.querySelector(`[name="${name}"]`)?.focus();
        this.disableLoading();
      }).catch(() => {
        this.querySelectorAll('[data-loading-overlay]').forEach((overlay) => overlay.classList.add('hidden'));
        document.getElementById('cart-errors').textContent = window.cartStrings.error;
        this.disableLoading();
      });
  }

  renderAll() {
    const body = JSON.stringify({
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    });

    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        document.getElementById('main-cart-footer')?.classList.toggle('is-empty', parsedState.item_count === 0);

        this.getSectionsToRender().forEach((section => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);

          elementToReplace.innerHTML =
            this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
        }));


      }).catch(() => {

      });
  }

  updateLiveRegions(line, itemCount, whichForm) {
    if (this.currentItemCount === itemCount && whichForm != 'selling-plan') {
      document.getElementById(`Line-item-error-${line}`)
        .querySelector('[data-cart-error]')
        .innerHTML = window.cartStrings.quantityError.replace(
          '[quantity]',
          document.getElementById(`Quantity-${line}`).value
        );
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    document.getElementById('main-cart-items').classList.add('cart__items--disabled');
    this.querySelectorAll('[data-loading-overlay]')[line - 1].classList.remove('hidden');
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    document.getElementById('main-cart-items').classList.remove('cart__items--disabled');
  }
}

customElements.define('cart-items', CartItems);

class CartGiftBag extends HTMLElement {
  constructor() {
    super();
    this.from = this.querySelector('[name="attributes[from]"]')
    this.to = this.querySelector('[name="attributes[to]"]')
    this.message = this.querySelector('[name="attributes[message]"]')
    this.listenForAttributes()
  }

  updateCartNote(from, to, message) {
    const note =  `FROM: ${from}\n\nTO: ${to}\n\nMESSAGE: ${message}`
    const body = JSON.stringify({ note: note });
    fetch(`${routes.cart_update_url}`, {...fetchConfig(), ...{ body }});
  }

  listenForAttributes() {
    this.from.addEventListener('change', debounce((event) => {
      this.updateCartNote(event.target.value, this.to.value, this.message.value);
      setTimeout(() => {
        const body = JSON.stringify({ attributes: {from: event.target.value }} );
        fetch(`${routes.cart_update_url}`, {...fetchConfig(), ...{ body }});
      }, 300);
    }, 300))
    this.to.addEventListener('change', debounce((event) => {
      this.updateCartNote(this.from.value, event.target.value, this.message.value);
      setTimeout(() => {
        const body = JSON.stringify({ attributes: {to: event.target.value }} );
        fetch(`${routes.cart_update_url}`, {...fetchConfig(), ...{ body }});
      }, 300);
    }, 300))
    this.message.addEventListener('change', debounce((event) => {
      this.updateCartNote(this.from.value, this.to.value, event.target.value);
      setTimeout(() => {
        const body = JSON.stringify({ attributes: {message: event.target.value }} );
        fetch(`${routes.cart_update_url}`, {...fetchConfig(), ...{ body }});
      }, 300);
    }, 300))
  }


}

customElements.define('cart-giftbag', CartGiftBag);

function attachReferralEventListeners() {
  const applyButton = document.getElementById('apply-referral-code');
  const clearButton = document.getElementById('clear-referral-code');

  // Apply referral code
  if (applyButton) {
    applyButton.addEventListener('click', function () {
      const referralCode = document.getElementById('referral-code').value;

      console.log('Referral code entered:', referralCode);

      if (referralCode.trim() !== '') {
        const body = JSON.stringify({
          updates: {},
          attributes: {
            referral_code: referralCode
          }
        });

        console.log('Payload to send:', body);

        fetch(`${routes.cart_update_url}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: body
        })
          .then(response => {
            if (response.ok) {
              console.log('Referral code successfully applied.');
              location.reload();
            } else {
              console.error('Failed to apply referral code');
            }
          })
          .catch(error => {
            console.error('Fetch error:', error);
          });
      } else {
        console.warn('Referral code is empty or invalid');
      }
    });
  }

  // Clear referral code
  if (clearButton) {
    clearButton.addEventListener('click', function () {
      const body = JSON.stringify({
        updates: {},
        attributes: {
          referral_code: ''
        }
      });

      console.log('Clearing referral code');

      fetch(`${routes.cart_update_url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body
      })
        .then(response => {
          if (response.ok) {
            console.log('Referral code cleared.');
            location.reload();
          } else {
            console.error('Failed to clear referral code');
          }
        })
        .catch(error => {
          console.error('Fetch error:', error);
        });
    });
  }
}

// Attach listeners immediately
attachReferralEventListeners();
