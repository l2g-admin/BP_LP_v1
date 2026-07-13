export const setupTabs = (container, options) => {
  const tabList = container.querySelectorAll("[data-tab-list] [data-item]");
  const tabPanels = container.querySelectorAll("[data-tab-panel]");
  const tabDescriptions = container.querySelectorAll("[data-tab-description]");
  let currentTab = null;


  if (tabList[0].nodeName == 'DIV') {
    options = options || {
      activeTabClass: "text",
    };
  } else {
    options = options || {
      activeTabClass2: "bg-active",
    };
  }

  // reset other tags
  const resetTabs = () => {
    tabList.forEach((listItem) => {
      listItem.querySelector("a").classList.remove(options.activeTabClass);
      listItem.querySelector("a").classList.remove(options.activeTabClass2);

      listItem.querySelector("a").setAttribute("aria-selected", false);
      if (tabList[0].nodeName == 'DIV') {
        listItem.querySelector("a").querySelector("[data-arrow]").classList.add("hidden");
      }
    });
    tabPanels.forEach((panelItem) => {
      panelItem.setAttribute("aria-hidden", true);
      panelItem.classList.add("hidden");
    });

    tabDescriptions.forEach((panelDescription) => {
      panelDescription.setAttribute("aria-hidden", true);
      panelDescription.classList.add("hidden");
    });
  };

  // select tab
  const selectTab = function (event) {
    event.preventDefault();
    if (currentTab === event.target.closest('a')) {
      return false; // Prevent selecting the same tab again
    }

    resetTabs();

    let link = event.target.closest('a');
    let hashRef = link.getAttribute("href");

    event.target.closest('a').classList.add(options.activeTabClass);
    event.target.closest('a').classList.add(options.activeTabClass2);

    event.target.closest('a').setAttribute("aria-selected", true);
    event.target.closest('a').setAttribute("tabindex", 0);

    if (tabList[0].nodeName == 'DIV') {
      event.target.closest('a').querySelector("[data-arrow]").classList.remove("hidden");
    }

    let selectedPanel = container.querySelector(hashRef);

    selectedPanel.classList.remove("hidden");
    selectedPanel.setAttribute("aria-hidden", false);

    return false; // Prevent default anchor behavior
  };

  // setup
  tabList.forEach((listItem) => {
    listItem.setAttribute("role", "presentation");
    listItem.querySelector("a").setAttribute("aria-selected", false);
    listItem.querySelector("a").setAttribute("tabindex", 0);
    listItem.addEventListener("click", selectTab);
    listItem.addEventListener("click", selectTab); // Added click event for mobile
  });

  tabPanels.forEach((panelItem) => {
    panelItem.setAttribute("aria-hidden", true);
    panelItem.classList.add("hidden");
  });

  tabDescriptions.forEach((panelDescription) => {
    panelDescription.setAttribute("aria-hidden", true);
    panelDescription.classList.add("hidden");
  });

  // grab the first one or the selected tab and highlight it and open it
  let dataFirst = 0;
  for (let i = 0; i < tabList.length; i++) {
    if (tabList[i].querySelector("[data-show-first]")) {
      tabList[i].querySelector("a").classList.add(options.activeTabClass);
      tabList[i].querySelector("a").classList.add(options.activeTabClass2);

      tabList[i].querySelector("a").setAttribute("aria-selected", true);
      tabList[i].querySelector("a").setAttribute("tabindex", 0);
      tabPanels[i].classList.remove("hidden");
      tabPanels[i].setAttribute("aria-hidden", false);
      tabDescriptions[i].classList.remove("hidden");
      tabDescriptions[i].setAttribute("aria-hidden", false);
      dataFirst++;
      break;
    }
  }
  if (dataFirst == 0) {
    tabList[0].querySelector("a").classList.add(options.activeTabClass);
    tabList[0].querySelector("a").classList.add(options.activeTabClass2);

    tabList[0].querySelector("a").setAttribute("aria-selected", true);
    tabList[0].querySelector("a").setAttribute("tabindex", 0);
    if (tabList[0].nodeName == 'DIV') {
      tabList[0].querySelector("a").querySelector("[data-arrow]").classList.remove("hidden");
    }
    tabPanels[0].classList.remove("hidden");
    tabPanels[0].setAttribute("aria-hidden", false);
  }
};
