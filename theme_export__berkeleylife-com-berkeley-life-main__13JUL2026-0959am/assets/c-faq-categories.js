
class FaqCategories {
  constructor(section) {
    this.section = section;
    this.catBtns = Array.from(this.section.querySelectorAll('[data-cat-target]'));
    this.catPanels = Array.from(this.section.querySelectorAll('.c-faq-categories__panel'));
    this.subnavs = Array.from(this.section.querySelectorAll('.c-faq-categories__subnav'));
    this.subcatBtns = Array.from(this.section.querySelectorAll('[data-subcat-target]'));
    this.subcatPanels = Array.from(this.section.querySelectorAll('.c-faq-categories__subpanel'));
    this.questions = Array.from(this.section.querySelectorAll('.c-faq-categories__question'));

    this.init();
  }

  init() {
    this.catBtns.forEach(btn => {
      btn.addEventListener('click', () => this.handleCatClick(btn));
    });

    this.subcatBtns.forEach(btn => {
      btn.addEventListener('click', () => this.handleSubcatClick(btn));
    });

    this.questions.forEach(btn => {
      btn.addEventListener('click', () => this.toggleQuestion(btn));
    });
  }

  handleCatClick(clickedBtn) {
    const targetId = clickedBtn.getAttribute('data-cat-target');
    const hasSubcats = clickedBtn.classList.contains('has-subcats');

    if (clickedBtn.classList.contains('is-active')) {
      // Re-click on active category — reset to default view if it has subcats
      if (hasSubcats) {
        const subnav = this.section.querySelector('[data-cat-subnav="' + targetId + '"]');
        if (subnav) {
          subnav.querySelectorAll('[data-subcat-target]').forEach(b => {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
        }
        var panel = document.getElementById(targetId);
        if (panel) {
          panel.querySelectorAll('.c-faq-categories__subpanel').forEach(p => p.classList.remove('is-active'));
        }
        const defaultPanel = document.getElementById(targetId.replace('cat-', 'subcat-') + '-0');
        if (defaultPanel) defaultPanel.classList.add('is-active');

        // Reset panel title back to default
        var panel = document.getElementById(targetId);
        if (panel && defaultPanel) {
          const panelTitle = panel.querySelector('.c-faq-categories__panel-title');
          const defaultTitleText = defaultPanel.getAttribute('data-panel-title-text');
          if (panelTitle && defaultTitleText) panelTitle.textContent = defaultTitleText;
        }
      }
      return;
    }

    // Reset all category tabs
    this.catBtns.forEach(b => {
      b.classList.remove('is-active');
      b.setAttribute('aria-selected', 'false');
    });

    // Reset all panels
    this.catPanels.forEach(p => p.classList.remove('is-active'));

    // Hide all sidebar subnavs and reset their buttons
    this.subnavs.forEach(s => s.classList.remove('is-visible'));
    this.subcatBtns.forEach(b => {
      b.classList.remove('is-active');
      b.setAttribute('aria-selected', 'false');
    });
    this.subcatPanels.forEach(p => p.classList.remove('is-active'));

    // Activate clicked category
    clickedBtn.classList.add('is-active');
    clickedBtn.setAttribute('aria-selected', 'true');

    // Activate target panel
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) targetPanel.classList.add('is-active');

    // Show subnav if category has subcats
    const subnav = this.section.querySelector('[data-cat-subnav="' + targetId + '"]');
    if (subnav) {
      subnav.classList.add('is-visible');
    }

    // Always show default subpanel (index 0) — category-level questions
    const defaultPanelId = targetId.replace('cat-', 'subcat-') + '-0';
    const defaultPanel = document.getElementById(defaultPanelId);
    if (defaultPanel) defaultPanel.classList.add('is-active');
  }

  handleSubcatClick(clickedBtn) {
    if (clickedBtn.classList.contains('is-active')) return;

    // Get sibling subcat buttons from the same subnav list
    const subnav = clickedBtn.closest('.c-faq-categories__subnav');
    if (!subnav) return;

    const siblingBtns = subnav.querySelectorAll('[data-subcat-target]');
    siblingBtns.forEach(b => {
      b.classList.remove('is-active');
      b.setAttribute('aria-selected', 'false');
    });

    // Get the parent category panel to reset subpanels
    const catBtn = subnav.previousElementSibling;
    const catTargetId = catBtn ? catBtn.getAttribute('data-cat-target') : null;
    const catPanel = catTargetId ? document.getElementById(catTargetId) : null;
    if (catPanel) {
      catPanel.querySelectorAll('.c-faq-categories__subpanel').forEach(p => p.classList.remove('is-active'));
    }

    // Activate clicked subcat
    clickedBtn.classList.add('is-active');
    clickedBtn.setAttribute('aria-selected', 'true');

    const targetId = clickedBtn.getAttribute('data-subcat-target');
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) targetPanel.classList.add('is-active');

    // Update panel title
    const titleText = targetPanel ? targetPanel.getAttribute('data-panel-title-text') : null;
    if (titleText && catPanel) {
      const panelTitle = catPanel.querySelector('.c-faq-categories__panel-title');
      if (panelTitle) panelTitle.textContent = titleText;
    }
  }

  toggleQuestion(btn) {
    const item = btn.closest('.c-faq-categories__item');
    const answer = item.querySelector('.c-faq-categories__answer');
    const answerInner = item.querySelector('.c-faq-categories__answer-inner');
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';

    // Optional: close other questions? Let's allow multiple open for now, 
    // or close them by finding open items in same subpanel.
    
    // Toggle current
    if (isExpanded) {
      btn.setAttribute('aria-expanded', 'false');
      item.classList.remove('is-open');
      answer.style.height = answer.scrollHeight + 'px';
      // Force repaint
      answer.offsetHeight;
      answer.style.height = '0px';
      
      setTimeout(() => {
        if(btn.getAttribute('aria-expanded') === 'false'){
           answer.style.display = 'none';
        }
      }, 300);
    } else {
      btn.setAttribute('aria-expanded', 'true');
      item.classList.add('is-open');
      answer.style.display = 'block';
      const height = answerInner.scrollHeight;
      answer.style.height = '0px';
      // Force repaint
      answer.offsetHeight;
      answer.style.height = height + 'px';
      
      setTimeout(() => {
         if(btn.getAttribute('aria-expanded') === 'true'){
             answer.style.height = 'auto';
         }
      }, 300);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.c-faq-categories');
  sections.forEach(s => new FaqCategories(s));
});

document.addEventListener('shopify:section:load', (e) => {
  if (e.target.classList.contains('c-faq-categories') || e.target.querySelector('.c-faq-categories')) {
    const s = e.target.classList.contains('c-faq-categories') ? e.target : e.target.querySelector('.c-faq-categories');
    new FaqCategories(s);
  }
});
