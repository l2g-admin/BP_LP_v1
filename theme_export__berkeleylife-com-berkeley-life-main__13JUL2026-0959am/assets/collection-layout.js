export class LayoutOptions extends HTMLElement {
  constructor() {
    super();
    this.init();
  }

  init() {
    // Changing the collection
    const largeButton = this.querySelector(`#largeButton`);
    const gridButton = this.querySelector(`#gridButton`);
    const gridContainer = document.querySelector("#main-collection-product-grid");
    const activeColor = localStorage.getItem('activeColor');

    const largeLayout = 'md:grid-cols-3';
    const gridLayout = ['md:grid-cols-5' , 'md:gap-x-1'];
    localStorage.setItem('colLayout', largeLayout);
    localStorage.setItem('activeColor', 'text-gray-400');
    // If layout is in local storage, set layout

    const layout = localStorage.getItem('colLayout').split('"');

    if (layout !== null) {
      gridContainer.classList.add(...layout);
      if (layout == largeLayout){
        largeButton.classList.add(activeColor)
        largeButton.setAttribute('aria-pressed', 'true')
      } else {
        gridButton.classList.add(activeColor)
        gridButton.setAttribute('aria-pressed', 'true')
      }
    }
    else {
      largeButton.classList.add(activeColor)
    }

    largeButton.addEventListener("click", function() {
      // Add active color
        gridButton.classList.remove(activeColor)
        gridButton.setAttribute('aria-pressed', 'false')
        largeButton.classList.add(activeColor)
        largeButton.setAttribute('aria-pressed', 'true')
      // Change layout to large
        gridContainer.classList.remove(...gridLayout);
        window.localStorage.setItem('colLayout', largeLayout);
        gridContainer.classList.add(largeLayout);
    });

    gridButton.addEventListener("click", function() {
      // Add active color
        largeButton.classList.remove(activeColor)
        largeButton.setAttribute('aria-pressed', 'false')
        gridButton.classList.add(activeColor)
        gridButton.setAttribute('aria-pressed', 'true')
      // Change layout to grid
        gridContainer.classList.remove(largeLayout);
        window.localStorage.setItem('colLayout', '["' + gridLayout[0] + '"' + ',' + '"' + gridLayout[1] + '"]') ;
        gridContainer.classList.add(...gridLayout);
    });
  }
}

customElements.define('layout-options', LayoutOptions)