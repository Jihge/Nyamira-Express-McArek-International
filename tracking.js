const trackingForm = document.querySelector('#tracking-form');

if (trackingForm) {
  const trackingInput = document.querySelector('#tracking-code');
  const trackingState = document.querySelector('#tracking-state');
  const trackingTitle = document.querySelector('#tracking-title');
  const trackingUpdate = document.querySelector('#tracking-last-update');
  const trackingRoute = document.querySelector('#tracking-route');
  const trackingMilestones = document.querySelector('#tracking-milestones');
  const trackingVisual = document.querySelector('#tracking-visual');
  const visualLabel = document.querySelector('.tracking-visual-overlay strong');
  const visualCaption = document.querySelector('.tracking-visual-overlay span');
  const trackingBadge = document.querySelector('.tracking-badge');
  let currentReference = '';

  function getTrackingRecord(reference) {
    const storedRecord = localStorage.getItem(`nyamira-shipment:${reference}`);
    return storedRecord ? JSON.parse(storedRecord) : null;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function renderTrackingResult(value) {
    const reference = value.trim().toUpperCase();
    currentReference = reference;
    trackingMilestones.replaceChildren();
    trackingRoute.hidden = true;

    if (!reference) {
      trackingState.textContent = 'Ready to track';
      trackingState.className = 'status-pill tracking-state';
      trackingTitle.textContent = 'Enter your delivery reference';
      trackingUpdate.textContent = 'Your saved request or booking status will appear here.';
      return;
    }

    const record = getTrackingRecord(reference);
    if (!record) {
      trackingState.textContent = 'Reference not found';
      trackingState.className = 'status-pill tracking-state missing';
      trackingTitle.textContent = `No saved shipment for ${reference}`;
      trackingUpdate.textContent = 'Check that you entered the reference correctly. A delivery request must be created in this browser before it can appear here.';
      trackingVisual.src = 'images/tracking-route.jpg';
      trackingVisual.alt = 'Illustration of a courier delivery route';
      trackingBadge.textContent = 'Reference Tracking';
      visualCaption.textContent = 'Delivery progress';
      visualLabel.textContent = 'Shipment status';
      return;
    }

    const statusLabels = {
      'request-prepared': 'Delivery request prepared',
      'booking-message-prepared': 'Booking message prepared'
    };
    const label = statusLabels[record.status] || 'Status unavailable';
    trackingState.textContent = label;
    trackingState.className = `status-pill tracking-state ${record.status}`;
    trackingTitle.textContent = `Shipment ${record.reference}`;
    trackingUpdate.textContent = `Last saved update: ${formatDate(record.updatedAt)}`;
    trackingRoute.textContent = `${record.origin || 'Pickup location'} → ${record.destination || 'Delivery location'}`;
    trackingRoute.hidden = false;
    trackingBadge.textContent = 'Saved Status';
    visualCaption.textContent = record.direction === 'receiving' ? 'Incoming delivery' : 'Outgoing delivery';
    visualLabel.textContent = label;

    const events = Array.isArray(record.events) ? record.events : [];
    events.forEach((entry) => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = entry.label;
      const date = document.createElement('time');
      date.dateTime = entry.at;
      date.textContent = formatDate(entry.at);
      item.append(title, date);
      trackingMilestones.append(item);
    });
  }

  const referenceFromUrl = new URLSearchParams(window.location.search).get('code') || '';
  trackingInput.value = referenceFromUrl.trim().toUpperCase();
  renderTrackingResult(trackingInput.value);

  trackingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    renderTrackingResult(trackingInput.value);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === `nyamira-shipment:${currentReference}`) {
      renderTrackingResult(currentReference);
    }
  });
}
