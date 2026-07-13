export class DynamicSearch extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  async init() {
    const htmxOrg = await import('https://cdn.skypack.dev/htmx.org')
    htmx.process(this)
  }
}
customElements.define('dynamic-search', DynamicSearch);