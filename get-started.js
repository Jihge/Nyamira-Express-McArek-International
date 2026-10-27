
const shipmentForm = document.querySelector('#shipment-request-form');

if (shipmentForm) {
  const steps = [...shipmentForm.querySelectorAll('.shipment-step')];
  const progressItems = [...document.querySelectorAll('.shipment-progress li')];
  const backButton = document.querySelector('#shipment-back');
  const nextButton = document.querySelector('#shipment-next');
  const submitButton = document.querySelector('#shipment-submit');
  const summary = document.querySelector('#shipment-summary');
  const status = document.querySelector('#shipment-status');
  const requestScreen = document.querySelector('#delivery-request-screen');
  const followupScreen = document.querySelector('#booking-followup-screen');
  const requestTab = document.querySelector('#delivery-request-tab');
  const bookingTab = document.querySelector('#booking-followup-tab');
  const backToRequestButton = document.querySelector('#back-to-delivery-request');
  const followupForm = document.querySelector('#booking-followup-form');
  const followupStatus = document.querySelector('#booking-followup-status');
  const deliveryRequestStatus = document.querySelector('#delivery-request-status');
  const bookingDate = document.querySelector('#booking-date');
  const bookingReference = document.querySelector('#booking-reference');
  const parcelCategory = document.querySelector('#parcel-category');
  const parcelDetailsField = document.querySelector('#parcel-details-field');
  const parcelDetails = document.querySelector('#parcel-details');
  let currentStep = 0;
  let deliveryRequestReference = sessionStorage.getItem('deliveryRequestReference') || '';

  const today = new Date();
  bookingDate.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  function updateTrackingRecord(reference, status, label, details = {}) {
    const storageKey = `nyamira-shipment:${reference}`;
    const storedRecord = localStorage.getItem(storageKey);
    const record = storedRecord ? JSON.parse(storedRecord) : {};
    const updatedAt = new Date().toISOString();
    const events = Array.isArray(record.events) ? record.events : [];
    events.push({ label, at: updatedAt });
    localStorage.setItem(storageKey, JSON.stringify({
      ...record,
      ...details,
      reference,
      status,
      updatedAt,
      events
    }));
  }

  function showBookingScreen() {
    bookingTab.disabled = false;
    if (window.bootstrap && window.bootstrap.Tab) {
      window.bootstrap.Tab.getOrCreateInstance(bookingTab).show();
    } else {
      requestTab.classList.remove('active');
      requestTab.setAttribute('aria-selected', 'false');
      requestScreen.classList.remove('active', 'show');
      bookingTab.classList.add('active');
      bookingTab.setAttribute('aria-selected', 'true');
      followupScreen.classList.add('active', 'show');
    }
    document.querySelector('#booking-followup-title').focus();
    followupScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showDeliveryRequestStatus(reference) {
    const requestUrl = sessionStorage.getItem('deliveryRequestWhatsAppUrl');
    const statusContent = [
      document.createTextNode(`Delivery request ${reference} is ready to send on WhatsApp. Send it, then use this form when Nyamira Express replies with a price.`)
    ];
    if (requestUrl) {
      const whatsappLink = document.createElement('a');
      whatsappLink.href = requestUrl;
      whatsappLink.target = '_blank';
      whatsappLink.rel = 'noopener noreferrer';
      whatsappLink.className = 'shipment-whatsapp-link';
      whatsappLink.textContent = 'If WhatsApp did not open, tap here to send your delivery request';
      const trackingLink = document.createElement('a');
      trackingLink.href = `tracking.html?code=${encodeURIComponent(reference)}`;
      trackingLink.className = 'shipment-tracking-link';
      trackingLink.textContent = 'Track this delivery request';
      statusContent.push(document.createElement('br'), whatsappLink, document.createElement('br'), trackingLink);
    }
    deliveryRequestStatus.replaceChildren(...statusContent);
  }

  backToRequestButton.addEventListener('click', () => {
    sessionStorage.setItem('deliveryRequestStage', 'request');
    if (window.bootstrap && window.bootstrap.Tab) {
      window.bootstrap.Tab.getOrCreateInstance(requestTab).show();
    } else {
      bookingTab.classList.remove('active');
      bookingTab.setAttribute('aria-selected', 'false');
      followupScreen.classList.remove('active', 'show');
      requestTab.classList.add('active');
      requestTab.setAttribute('aria-selected', 'true');
      requestScreen.classList.add('active', 'show');
    }
    document.querySelector('#shipment-step-one').focus();
    requestScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  parcelCategory.addEventListener('change', () => {
    const needsDetails = parcelCategory.value === 'Other';
    parcelDetailsField.hidden = !needsDetails;
    parcelDetails.required = needsDetails;
    if (!needsDetails) parcelDetails.value = '';
  });

  function showStep(index) {
    currentStep = index;
    steps.forEach((step, stepIndex) => {
      step.hidden = stepIndex !== currentStep;
      progressItems[stepIndex].classList.toggle('active', stepIndex === currentStep);
      progressItems[stepIndex].classList.toggle('complete', stepIndex < currentStep);
      if (stepIndex === currentStep) {
        progressItems[stepIndex].setAttribute('aria-current', 'step');
      } else {
        progressItems[stepIndex].removeAttribute('aria-current');
      }
    });
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    status.replaceChildren();
    steps[currentStep].querySelector('h2').focus();
    if (currentStep === steps.length - 1) updateSummary();
  }

  function findInvalidField(step) {
    return [...step.querySelectorAll('input, select, textarea')].find((field) => !field.checkValidity());
  }

  function validateStep(step) {
    const invalidField = findInvalidField(step);
    if (!invalidField) return true;
    invalidField.reportValidity();
    invalidField.focus();
    return false;
  }

  function getValues() {
    return Object.fromEntries(new FormData(shipmentForm).entries());
  }

  function getParcelDescription(values) {
    return values.parcelCategory === 'Other'
      ? `${values.parcelCategory}: ${values.parcelDetails}`
      : values.parcelDetails
        ? `${values.parcelCategory}: ${values.parcelDetails}`
        : values.parcelCategory;
  }

  function updateSummary() {
    const values = getValues();
    const rows = [
      ['Request type', values.movementType === 'receiving' ? 'Receiving goods' : 'Sending goods'],
      ['Pickup area', values.pickupArea],
      ['Delivery area', values.deliveryArea],
      ['Sender', `${values.senderName} · ${values.senderPhone}`],
      ['Recipient', `${values.recipientName} · ${values.recipientPhone}`],
      ['Parcel', `${getParcelDescription(values)} · ${values.parcelPieces} parcel(s)`],
      ['Approximate weight', values.parcelWeight ? `${values.parcelWeight} kg` : 'Not provided']
    ];

    summary.replaceChildren(...rows.flatMap(([label, value]) => {
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      return [term, description];
    }));
  }

  nextButton.addEventListener('click', () => {
    if (validateStep(steps[currentStep])) showStep(Math.min(currentStep + 1, steps.length - 1));
  });

  backButton.addEventListener('click', () => showStep(Math.max(currentStep - 1, 0)));

  shipmentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    for (let index = 0; index < steps.length; index += 1) {
      const invalidField = findInvalidField(steps[index]);
      if (invalidField) {
        showStep(index);
        invalidField.reportValidity();
        invalidField.focus();
        return;
      }
    }

    const values = getValues();
    deliveryRequestReference = `NE-${Date.now().toString(36).toUpperCase()}`;
    sessionStorage.setItem('deliveryRequestReference', deliveryRequestReference);
    sessionStorage.setItem('deliveryRequestStage', 'booking');
    bookingReference.value = deliveryRequestReference;
    const movement = values.movementType === 'receiving' ? 'receive goods' : 'send goods';
    const message = [
      `Hello Nyamira Express, I would like to arrange to ${movement}. Reference: ${deliveryRequestReference}`,
      '',
      `Request type: ${values.movementType === 'receiving' ? 'Receiving goods' : 'Sending goods'}`,
      `Pickup area: ${values.pickupArea}`,
      `Delivery area: ${values.deliveryArea}`,
      `Sender: ${values.senderName} · ${values.senderPhone}`,
      `Recipient: ${values.recipientName} · ${values.recipientPhone}`,
      `Goods category: ${getParcelDescription(values)}`,
      `Number of parcels: ${values.parcelPieces}`,
      `Approximate weight: ${values.parcelWeight ? `${values.parcelWeight} kg` : 'Not provided'}`,
      '',
      'Please contact me to coordinate this delivery. I understand this request starts the process but does not confirm a booking.'
    ].join('\n');
    const whatsappUrl = `https://wa.me/27719406303?text=${encodeURIComponent(message)}`;
    sessionStorage.setItem('deliveryRequestWhatsAppUrl', whatsappUrl);
    updateTrackingRecord(
      deliveryRequestReference,
      'request-prepared',
      'Delivery request prepared',
      {
        direction: values.movementType,
        origin: values.pickupArea,
        destination: values.deliveryArea,
        goodsCategory: getParcelDescription(values)
      }
    );
    showDeliveryRequestStatus(deliveryRequestReference);
    showBookingScreen();
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  });

  followupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!followupForm.reportValidity()) return;

    const values = Object.fromEntries(new FormData(followupForm).entries());
    const reference = deliveryRequestReference;
    const message = [
      `Hello Nyamira Express, I accept the quoted price and would like to proceed with my delivery booking. Reference: ${reference}`,
      '',
      `Agreed price: ${values.bookingPrice.trim()}`,
      `Preferred pickup date: ${values.bookingDate}`,
      `Preferred pickup time: ${values.bookingTime}`,
      '',
      'Please confirm availability and send me the booking confirmation. I understand the booking is not confirmed until Nyamira Express replies.'
    ].join('\n');
    const whatsappUrl = `https://wa.me/27719406303?text=${encodeURIComponent(message)}`;
    const whatsappLink = document.createElement('a');
    whatsappLink.href = whatsappUrl;
    whatsappLink.target = '_blank';
    whatsappLink.rel = 'noopener noreferrer';
    whatsappLink.className = 'shipment-whatsapp-link';
    whatsappLink.textContent = 'If WhatsApp did not open, tap here to send your booking request';
    followupStatus.replaceChildren(
      document.createTextNode(`Your acceptance for request ${reference} is ready. Send it on WhatsApp and wait for Nyamira Express to confirm the booking.`),
      document.createElement('br'),
      whatsappLink
    );
    updateTrackingRecord(reference, 'booking-message-prepared', 'Booking confirmation message prepared');
    const trackingLink = document.createElement('a');
    trackingLink.href = `tracking.html?code=${encodeURIComponent(reference)}`;
    trackingLink.className = 'shipment-tracking-link';
    trackingLink.textContent = 'Track this delivery';
    followupStatus.append(document.createElement('br'), trackingLink);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  });

  showStep(0);

  if (deliveryRequestReference) {
    bookingReference.value = deliveryRequestReference;
    if (sessionStorage.getItem('deliveryRequestWhatsAppUrl')) {
      showDeliveryRequestStatus(deliveryRequestReference);
    }
    if (sessionStorage.getItem('deliveryRequestStage') !== 'request') {
      showBookingScreen();
    } else {
      bookingTab.disabled = true;
    }
  } else {
    bookingTab.disabled = true;
  }
}
