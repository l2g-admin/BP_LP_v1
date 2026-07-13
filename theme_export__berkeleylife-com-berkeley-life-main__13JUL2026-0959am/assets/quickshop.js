export class QuickShopDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]')?.addEventListener(
      'click',
      this.hide.bind(this)
    );
    this.addEventListener('click', (event) => {
      if (event.target.nodeName === 'QUICK-SHOP-DIALOG') this.hide();
    });
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
  }

  show(opener) {
    this.openedBy = opener;
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    trapFocus(this, this.querySelector('[role="dialog"]'));
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}

customElements.define('quick-shop-dialog', QuickShopDialog)

export class QuickShopOpener extends HTMLElement {
  constructor() {
    super();
    const button = this.querySelector('button');
    button?.addEventListener('click', () => {
      this.renderSection()
    });
  }

  renderSection() {
    fetch(this.dataset.url)
    .then(response => response.text())
    .then(text => {
      const html = document.createElement('div');
      html.innerHTML = text;
      const pdpForm = html.querySelector('.product-section');
      if (pdpForm && pdpForm.innerHTML.trim().length) {
        const target = document.querySelector(`${this.getAttribute('data-modal')}-Render`)
        target.innerHTML = pdpForm.innerHTML;
      }
      document.querySelector(this.getAttribute('data-modal'))?.show(this.querySelector('button'));
    })
    .catch(e => {
      console.error(e);
    });
  }

}

customElements.define('quick-shop-opener', QuickShopOpener)