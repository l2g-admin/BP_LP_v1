// Ensure the custom product form element is registered
if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('form');
      this.form.querySelector('[name=id]').disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.cartNotification = document.querySelector('cart-notification');
      this.cartDrawer = document.querySelector('cart-drawer');
      this.quickshop = this.closest('quick-shop-dialog');
      this.isCart = window.location.pathname.includes('/cart');
    }

    onSubmitHandler(evt) {
      //console.log("🔹 SUBMIT BUTTON CLICKED");
      evt.preventDefault();
      const submitButton = this.querySelector('[type="submit"]');
      if (submitButton.classList.contains('loading')) return;

      this.handleErrorMessage();
      if (this.cartNotification) {
        this.cartNotification.setActiveElement(document.activeElement);
      }

      submitButton.setAttribute('aria-disabled', true);
      submitButton.classList.add('loading');

      const config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      const formData = new FormData(this.form);
      if (this.cartNotification) {
        formData.append('sections', this.cartNotification.getSectionsToRender().map(section => section.id));
        formData.append('sections_url', window.location.pathname);
      }
      config.body = formData;

      fetch(`${routes.cart_add_url}`, config)
        .then(response => response.json())
        .then(response => {
          if (response.status) {
            this.handleErrorMessage(response.description);
            return;
          }
          if (this.cartNotification) {
            this.cartNotification.renderContents(response);
          }
          if (this.cartDrawer) {
            this.cartDrawer.render();
            this.cartDrawer.open();
          }
        })
        .catch(error => console.error(error))
        .finally(() => {
          submitButton.classList.remove('loading');
          submitButton.removeAttribute('aria-disabled');
          if (this.quickshop) {
            this.quickshop.hide();
          }
          if (this.isCart) {
            window.location.href = '/cart';
          }
        });
    }

    handleErrorMessage(errorMessage = false) {
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('[data-product-form-errors]');
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('[data-product-form-error-msg]');
      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}

// Listen for clicks on add-to-cart buttons
document.addEventListener("click", async function (event) {
  const button = event.target.closest(".product-form__submit");
  if (!button) return;

  event.preventDefault();
  //console.log("🔹 Add to Cart Clicked", button);

  const productHandle = button.dataset.productHandle;
  const productId = button.dataset.productId;
  const isSubscription = button.dataset.subscription === "true";
  const metadata = button.dataset.metadata;
  const featuredImage = button.dataset.featuredimage;
  const productRating = button.dataset.productrating;
  const disableFlyout = button.dataset.disableflyout;

  //console.log("🔹 Product Handle:", productHandle);
  //console.log("🔹 Product ID:", productId);
  //console.log("🔹 Is Subscription:", isSubscription);
  //console.log("🔹 Metadata: ", metadata);
  //console.log("FEATURED IMAGE:", featuredImage);

  if (isSubscription && !disableFlyout) {
    //console.log("🔹 Opening Subscription Flyout...");
    await openSubscriptionFlyout(productHandle, productId, metadata, featuredImage, productRating);
  } else {
    //console.log("🔹 Proceeding with normal Add to Cart");
    addToCart(productId);
  }
});

document.getElementById('flyout-add-to-cart').addEventListener('click', function(event) {
  event.preventDefault(); // Prevent default action if necessary
  //console.log('Flyout add to cart button clicked');
  const productToAdd = getSelectedProductId();
  //console.log('Adding to the cart: ', productToAdd);
  flyoutAddToCart(productToAdd);
 
});

function getSelectedProductId() {
  // Check for radio button selection first
  const selectedRadio = document.querySelector('input[name="variant_selling_plan"]:checked');
  if (selectedRadio) {
    return selectedRadio.value.split('-')[0];
  }
  
  // Check for select dropdown selection
  const selectedSelect = document.querySelector('select[name="variant_selling_plan"]');
  if (selectedSelect && selectedSelect.value) {
    return selectedSelect.value.split('-')[0];
  }
  
  return null;
}

// Function to open the subscription flyout and load the product form data
async function openSubscriptionFlyout(productHandle, productId, metadata, featuredImage, productRating) {
  //console.log("🔹 Loading product data for:", productHandle);

  const flyout = document.getElementById('subscription-flyout');
  if (!flyout) {
    console.error("❌ Subscription flyout not found!");
    return;
  }

  // Fetch product JSON data
  try {
    const response = await fetch(`/products/${productHandle}.js`);
    if (!response.ok) throw new Error("Failed to load product data");

    const product = await response.json();
    //console.log("✅ Product Data:", product);

    // Populate the flyout product form
    populateSubscriptionFlyout(product, productId, metadata, featuredImage, productRating);

    // Show the flyout
    flyout.classList.add('show');
    flyout.classList.remove('hidden-flyout');
    const overlay = document.createElement('div');
    overlay.id = 'flyout-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '20';
    overlay.style.display = 'block';
    document.body.appendChild(overlay);
    document.body.style.overflowY = 'hidden';

    overlay.addEventListener('click', function() {
      document.getElementById('subscription-flyout').classList.remove('show');
      document.getElementById('subscription-flyout').classList.add('hidden-flyout');
      overlay.remove();
      document.body.style.overflowY = 'auto';
    });

  } catch (error) {
    console.error("❌ Error fetching product data:", error);
  }
}

// Function to populate the subscription flyout with variant and selling plan options
function populateSubscriptionFlyout(product, selectedVariantId, metadata,featuredImage, productRating) {
  const variantPickerContainer = document.getElementById('variant-pickers-container');
  const flyoutProductInfoContainer = document.getElementById('flyout-product-info');
  const variantInput = document.getElementById('SelectedVariantIdFlyout');
  const sellingPlanInput = document.getElementById('SelectedSellingPlanId'); // New hidden input
  const productVariantsData = document.getElementById('ProductVariantsData-flyout');
  const addToCartButton = document.querySelector('.flyout-add-to-cart');

  //console.log("POPULATING FEATURED IMAGE", featuredImage);

  if (!variantPickerContainer || !variantInput || !sellingPlanInput || !addToCartButton) {
    console.error("❌ Flyout elements not found!");
    return;
  }

  variantPickerContainer.innerHTML = '';
  flyoutProductInfoContainer.innerHTML = `
    <div class="product-info">
      <div class="product-details mt-4">
        <h2 class="product-title text-4xl mt-2">${product.title}</h2>
        <div class="rating-review flex items-center gap-2">
          ${productRating} 
        </div>
        <p class="product-description mt-2 text-gray-600 line-clamp-3">${product.description}</p>
      </div>
    </div>
  `;

  let parsedMetadata = [];

  try {
    parsedMetadata = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    if (!Array.isArray(parsedMetadata)) {
      console.error("❌ Metadata is not an array:", parsedMetadata);
      parsedMetadata = [];
    }
  } catch (error) {
    console.error("❌ Error parsing metadata:", error);
    parsedMetadata = [];
  }

  let optionsHTML = '<div class="flex flex-wrap gap-3">';
  let firstOptionId = null;

  // Subscription options first
  product.variants.forEach(variant => {
    const variantMetadata = parsedMetadata.find(meta => Number(meta.id) === Number(variant.id));
    const disableOTP = variantMetadata && variantMetadata.disable_one_time_purchase === "true";
    const b2bOnly = variantMetadata && variantMetadata.b2b_only === "true";

    const isOutOfStock = variant.inventory_quantity <= 0;

    // Skip B2B-only variants completely
    if (b2bOnly) {
      return;
    }

    if (variant.selling_plan_allocations && variant.selling_plan_allocations.length > 0) {
      variant.selling_plan_allocations.forEach(plan => {
        const matchingPlanGroup = product.selling_plan_groups.find(group => group.id === plan.selling_plan_group_id);
        const planName = matchingPlanGroup ? matchingPlanGroup.name : "Subscription Option";
        const isMostPopular = variantMetadata && variantMetadata.is_most_popular_subscription === "true";
        const percentSavings = Math.round((((variant.price - plan.price_adjustments[0].price) * 100) / variant.price));
        const planFreq = matchingPlanGroup.options[1].values[0];

        const optionId = `variant-${variant.id}-plan-${plan.selling_plan_id}`;
        if (!firstOptionId) firstOptionId = optionId;

        optionsHTML += `
          <label class="relative option-container inline-flex flex-grow items-center border border-transparent rounded-lg p-4 bg-[#ebe8e6] cursor-pointer ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}" for="${optionId}">
            ${isMostPopular ? '<div class="absolute top-[-14px] right-[10px] px-6 font-medium py-2 bg-[#1B1C29] text-white rounded-3xl text-xs tracking-widest leading-[19px]">MOST POPULAR</div>' : ''}
            <input type="radio" id="${optionId}" name="variant_selling_plan" value="${variant.id}-${plan.selling_plan_id}" class="mr-4" ${isOutOfStock ? 'disabled' : ''}>
            <div class="flex flex-col">
              <h3 class="text-lg">${variant.title} Supply Subscription</h3>
              <ul class="mt-1 text-sm subscription-list">
                <li>Save ${percentSavings}%</li>
                <li>${variant.title} supply delivered every ${planFreq}s</li>
                <li>Pause or cancel at any time</li>
              </ul>
            </div>
            <div class="flex flex-col self-start ml-auto text-[#D54F2F] mt-2">
              <span class="ml-auto font-semibold">$${(plan.price_adjustments[0].price / 100).toFixed(2)}</span>
              <span class="ml-auto text-xs line-through opacity-50">$${(variant.price / 100).toFixed(2)}</span>
            </div>
          </label>
        `;
      });
    }

    // One-time purchase option (Only if not disabled)
    if (!disableOTP) {
      const optionId = `variant-${variant.id}-otp`;
      if (!firstOptionId) firstOptionId = optionId;

      optionsHTML += `
        <label class="option-container inline-flex flex-grow items-center border border-transparent rounded-lg p-4 bg-[#ebe8e6] cursor-pointer ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}" for="${optionId}">
          <input type="radio" id="${optionId}" name="variant_selling_plan" value="${variant.id}-otp" class="mr-4" ${isOutOfStock ? 'disabled' : ''}>
          <div class="flex flex-col">
            <h3 class="text-lg">One-time Purchase</h3>
          </div>
          <span class="ml-auto text-[#D54F2F] font-semibold">$${(variant.price / 100).toFixed(2)}</span>
        </label>
      `;
    }
  });

  optionsHTML += '</div>';
  variantPickerContainer.innerHTML = optionsHTML;

  productVariantsData.textContent = JSON.stringify(product.variants);

  function updateSelected() {
    // Handle radio button containers
    document.querySelectorAll('.option-container').forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio && radio.checked) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
    
    // Handle select dropdown styling (if needed)
    const selectedSelect = document.querySelector('select[name="variant_selling_plan"]');
    if (selectedSelect) {
      // Add any specific styling for selected state if needed
      selectedSelect.classList.toggle('selected', selectedSelect.value !== '');
    }
  }

  function updateButtonText() {
    // console.log("UPDATE BUTTON TEXT");
    // Check for radio button selection first
    let selectedOption = document.querySelector('input[name="variant_selling_plan"]:checked');
    
    // If no radio button is selected, check for select dropdown
    if (!selectedOption) {
      const selectedSelect = document.querySelector('select[name="variant_selling_plan"]');
      if (selectedSelect && selectedSelect.value) {
        selectedOption = selectedSelect;
      }
    }
    
    if (!selectedOption) return;

    const [variantId, sellingPlanId] = selectedOption.value.split("-");
    const selectedVariant = product.variants.find(variant => variant.id == variantId);
    const isOutOfStock = selectedVariant && selectedVariant.inventory_quantity <= 0;

    if (isOutOfStock) {
      addToCartButton.textContent = "Unavailable";
      addToCartButton.disabled = true;
    } else if (sellingPlanId === "otp") {
      addToCartButton.textContent = "Add to Cart";
      addToCartButton.disabled = false;
    } else {
      addToCartButton.textContent = "Subscribe";
      addToCartButton.disabled = false;
    }
  }

  // Attach event listeners for variant selection (radio buttons and select dropdowns)
  document.querySelectorAll('input[name="variant_selling_plan"], select[name="variant_selling_plan"]').forEach(element => {
    element.addEventListener("change", function (event) {
      const [variantId, sellingPlanId] = event.target.value.split("-");
      variantInput.value = variantId;
      sellingPlanInput.value = sellingPlanId === "otp" ? "" : sellingPlanId;
      
      // Handle mutual exclusivity between radio buttons and select dropdown
      if (event.target.tagName === 'SELECT') {
        // If select dropdown was changed, deselect all radio buttons
        document.querySelectorAll('input[name="variant_selling_plan"]').forEach(radio => {
          radio.checked = false;
        });
      } else if (event.target.type === 'radio') {
        // If radio button was changed, clear the select dropdown
        const selectDropdown = document.querySelector('select[name="variant_selling_plan"]');
        if (selectDropdown) {
          selectDropdown.value = '';
        }
      }
      
      updateSelected(); // Ensure the selected class is updated
      updateButtonText(); // Update button text based on selection
    });
  });

  // Automatically select the first available option
  if (firstOptionId) {
    const firstOption = document.getElementById(firstOptionId);
    if (firstOption) {
      firstOption.checked = true;
      firstOption.dispatchEvent(new Event("change")); // Ensure it triggers the change event
    }
  }

  // Ensure selected class and button text are correctly applied on initial load
  updateSelected();
  updateButtonText();
}


// Function to add a product to the cart
function addToCart(productId) {
  //console.log("🛒 Adding to cart:", productId);

  const submitButton = document.querySelector(`[data-product-id="${productId}"]`);
  if (!submitButton) {
    console.error("❌ Submit button not found for product:", productId);
    return;
  }

  if (submitButton.classList.contains("loading")) return;

  const form = submitButton.closest("form");
  if (!form) {
    console.error("❌ Product form not found for product:", productId);
    return;
  }

  submitButton.setAttribute("aria-disabled", true);
  submitButton.classList.add("loading");

  const formData = new FormData(form);
  formData.append("id", productId);

  fetch(`${routes.cart_add_url}`, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json",
    },
    body: formData,
  })
    .then(response => response.json())
    .then(response => {
      if (response.status) {
        console.error("❌ Error adding to cart:", response.description);
        return;
      }

      //console.log("✅ Successfully added to cart!");
      document.getElementById('subscription-flyout').classList.remove("show");
      document.getElementById('subscription-flyout').classList.add("hidden-flyout");

      const cartDrawer = document.querySelector("cart-drawer");
      if (cartDrawer) {
        cartDrawer.render();
        cartDrawer.open();
      }
    })
    .catch(error => console.error("❌ Add to cart request failed:", error))
    .finally(() => {
      submitButton.classList.remove("loading");
      submitButton.removeAttribute("aria-disabled");
    });
}

function flyoutAddToCart(productId) {
  //console.log("🛒 Adding to cart:", productId);

  const flyoutAddToCartButton = document.getElementById('flyout-add-to-cart');
  const form = document.getElementById('product-form-flyout');

  if (!form || !flyoutAddToCartButton) {
    console.error("❌ Product form or button not found for product:", productId);
    return;
  }

  // Disable button and show loading state
  flyoutAddToCartButton.setAttribute("aria-disabled", "true");
  flyoutAddToCartButton.classList.add("loading");

  const formData = new FormData(form);
  formData.append("id", productId);

  fetch(`${routes.cart_add_url}`, {
    method: "POST",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json",
    },
    body: formData,
  })
    .then(response => response.json())
    .then(response => {
      if (response.status) {
        console.error("❌ Error adding to cart:", response.description);
        alert(`Error: ${response.description}`); // Optional: Show error message
        return;
      }

      //console.log("✅ Successfully added to cart!");
      document.getElementById('subscription-flyout').classList.remove("show");
      document.getElementById('subscription-flyout').classList.add("hidden-flyout");
      const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
      if (overlay) {
        overlay.remove();
        document.body.style.overflowY = 'auto';
      }

      // Refresh cart drawer if applicable
      const cartDrawer = document.querySelector("cart-drawer");
      if (cartDrawer) {
        cartDrawer.render();
        cartDrawer.open();
      }
    })
    .catch(error => console.error("❌ Add to cart request failed:", error))
    .finally(() => {
      // Ensure the button state resets, whether success or failure
      flyoutAddToCartButton.classList.remove("loading");
      flyoutAddToCartButton.removeAttribute("aria-disabled");
    });
}

document.addEventListener('click', function(event) {
  const overlay = document.querySelector('div[style*="rgba(0, 0, 0, 0.5)"]');
  const flyout = document.getElementById('subscription-flyout');

    if (overlay && event.target === overlay) {
      flyout.classList.remove("show");
      flyout.classList.add("hidden-flyout");
      overlay.remove();
      document.body.style.overflowY = 'auto';
    }
});
// Event listener for the flyout close button
const flyoutCloseButton = document.getElementById('flyout-close-button');
if (flyoutCloseButton) {
  flyoutCloseButton.addEventListener('click', function(event) {
    event.preventDefault();
    const flyout = document.getElementById('subscription-flyout');
    if (flyout) {
      flyout.classList.remove('show');
      flyout.classList.add('hidden-flyout');
      const overlay = document.getElementById('flyout-overlay');
      if (overlay) overlay.remove();
      document.body.style.overflowY = 'auto';
    }
  });
}

function updateMainVariantAndPlan() {
  const variantInputMain = document.querySelector('input[name="id"]');
  const sellingPlanInputMain = document.querySelector('input[name="selling_plan"]');

  const selectedVariantElement = document.querySelector('variant-radios input[type="radio"]:checked');
  const purchaseOptionElement = document.querySelector('input[name="purchaseOption"]:checked');

  const selectedVariant = selectedVariantElement ? selectedVariantElement.value : null;
  const purchaseOption = purchaseOptionElement ? purchaseOptionElement.value : 'onetime';

  if (selectedVariant) {
    variantInputMain.value = selectedVariant;
  }

  if (purchaseOption === 'subscription' && selectedVariant) {
    const subscriptionPlanId = getMainSubscriptionPlanId(selectedVariant);
    sellingPlanInputMain.value = subscriptionPlanId;
  } else {
    sellingPlanInputMain.value = '';
  }
  // console.log("UPDATE MAIN VARIANT AND PLAN");

  updateMainAddToCartButton();
}

// Ensure listeners cover both variant and purchase option selections independently
document.querySelectorAll('variant-radios input[type="radio"]').forEach(radio => {
  radio.addEventListener("change", updateMainVariantAndPlan);
});

// Delegated event listener for dynamically injected purchase option radios by Recharge
document.addEventListener('change', function(event) {
  if (event.target.matches('input[name="purchaseOption"]')) {
    updateMainVariantAndPlan();
  }
});

// Helper function to get subscription plan ID for the main (non-modal) variant selection
function getMainSubscriptionPlanId(variantId) {
  const variantData = JSON.parse(document.querySelector('variant-radios script[type="application/json"]').textContent);
  const selectedVariant = variantData.find(variant => variant.id == variantId);
  return selectedVariant && selectedVariant.selling_plan_allocations.length > 0
    ? selectedVariant.selling_plan_allocations[0].selling_plan_id
    : '';
}

function updateMainAddToCartButton() {
  const addToCartButton = document.querySelector('product-form button[type="submit"][name="add"]:not(.flyout-add-to-cart)');
  const selectedVariantElement = document.querySelector('variant-radios input[type="radio"]:checked');
  const purchaseOptionElement = document.querySelector('input[name="purchaseOption"]:checked');
  // console.log("UPDATE MAIN ADD TO CART BUTTON", addToCartButton);
  // console.log("UPDATE MAIN selected variant", selectedVariantElement.value);
  // console.log("UPDATE MAIN purchase option element", purchaseOptionElement.value);



  if (!addToCartButton || !selectedVariantElement) return;

  const metadata = JSON.parse(addToCartButton.getAttribute('data-metadata') || '[]');
  const selectedVariantId = parseInt(selectedVariantElement.value, 10);
  const variantMetadata = metadata.find(meta => meta.id === selectedVariantId);
  
  if (purchaseOptionElement && purchaseOptionElement.value === 'subscription') {
    addToCartButton.textContent = 'Subscribe';
    addToCartButton.disabled = false;
  } else if (variantMetadata && variantMetadata.disable_one_time_purchase === "true") {
    addToCartButton.textContent = 'Unavailable';
    addToCartButton.disabled = true;
  } else {
    addToCartButton.textContent = 'Add to Cart';
    addToCartButton.disabled = false;
  }
}