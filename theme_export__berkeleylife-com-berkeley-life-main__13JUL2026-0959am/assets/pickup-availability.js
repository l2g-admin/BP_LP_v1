if (!customElements.get('pickup-availability')) {
  customElements.define('pickup-availability', class PickupAvailability extends HTMLElement {
    constructor() {
      super();

      if(!this.hasAttribute('available')) return;

      this.errorHtml = this.querySelector('template').content.firstElementChild.cloneNode(true);
      this.onClickRefreshList = this.onClickRefreshList.bind(this);
      this.fetchAvailability(this.dataset.variantId);
    }

    fetchAvailability(variantId) {
      const variantSectionUrl = `${this.dataset.baseUrl}variants/${variantId}/?section_id=pickup-availability`;

      fetch(variantSectionUrl)
        .then(response => response.text())
        .then(text => {
          const sectionInnerHTML = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('.shopify-section');
          this.renderPreview(sectionInnerHTML);
        })
        .catch(e => {
          this.querySelector('button')?.removeEventListener('click', this.onClickRefreshList);
          this.renderError();
        });
    }

    onClickRefreshList(evt) {
      this.fetchAvailability(this.dataset.variantId);
    }

    renderError() {
      if (this.errorHtml) {
        this.innerHTML = '';
        this.appendChild(this.errorHtml);
      }

      if(this.querySelector('button')) {
        this.querySelector('button').addEventListener('click', this.onClickRefreshList);
      }
    }

    renderPreview(sectionInnerHTML) {
      const drawer = document.querySelector('pickup-availability-drawer');
      if (drawer) drawer.remove();
      if (!sectionInnerHTML.querySelector('pickup-availability-preview')) {
        this.innerHTML = "";
        this.removeAttribute('available');
        return;
      }

      this.innerHTML = sectionInnerHTML.querySelector('pickup-availability-preview').outerHTML;
      this.setAttribute('available', '');

      this.appendChild(sectionInnerHTML.querySelector('pickup-availability-drawer'));

      this.querySelector('button').addEventListener('click', () => {
        if (document.querySelector('pickup-availability-drawer').hasAttribute('open')) {
          document.querySelector('pickup-availability-drawer').hide();
        } else {
          document.querySelector('pickup-availability-drawer').show();
        }
      });
    }
  });
}

if (!customElements.get('pickup-availability-drawer')) {
  customElements.define('pickup-availability-drawer', class PickupAvailabilityDrawer extends HTMLElement {
    constructor() {
      super();

      this.querySelector('button').addEventListener('click', () => {
        this.hide();
      });

      this.addEventListener('keyup', () => {
        if(event.code.toUpperCase() === 'ESCAPE') this.hide();
      });
    }

    hide() {
      this.removeAttribute('open');
    }

    show() {
      this.setAttribute('open', '');
    }
  });
}
