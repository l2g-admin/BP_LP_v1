export class FacetFilters extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  async init() {
    const htmxOrg = await import('https://cdn.skypack.dev/htmx.org')
    htmx.process(this)
    // this `afterSettle` event tells the layout options to re-init
    htmx.on('htmx:afterSettle', () => {
      document.querySelector('layout-options')?.init()
    })
    const triggers = this.querySelectorAll('details')
    triggers.forEach((trigger) => {
      trigger.addEventListener('toggle', (e) => {
        if (e.target.open) {
          triggers.forEach( inner => {
            if (inner === e.target) {return}
            inner.open = false
          })
        }
      })
    })
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape') {
        triggers.forEach((trigger) => {
          trigger.open = false
        })
      }
    })
  }
}
customElements.define('facet-filters', FacetFilters);