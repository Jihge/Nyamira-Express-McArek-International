const shipmentFeature = document.querySelector('.dashboard-feature');
const shipmentRows = document.querySelector('#shipment-rows');
const storageWarning = document.querySelector('#dashboard-storage-warning');

if (shipmentFeature && shipmentRows && storageWarning) {
  const statusDetails = {
    'request-prepared': {
      label: 'Request prepared',
      visualStatus: 'processing',
      headline: 'Your delivery request is ready to send',
      detail: 'Request message prepared'
    },
    'booking-message-prepared': {
      label: 'Booking message prepared',
      visualStatus: 'booked',
      headline: 'Your booking message is ready to send',
      detail: 'Booking message prepared'
    }
  };

  function readShipmentRecords() {
    const records = [];
    let invalidRecords = 0;

    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || !key.startsWith('nyamira-shipment:')) continue;

        const reference = key.slice('nyamira-shipment:'.length);
        try {
          const record = JSON.parse(localStorage.getItem(key));
          if (!record || record.reference !== reference || !record.status) {
            invalidRecords += 1;
            continue;
          }
          records.push(record);
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
          invalidRecords += 1;
        }
      }
    } catch (error) {
      return { records: [], invalidRecords, storageError: error };
    }

    records.sort((first, second) => {
      const firstDate = Date.parse(first.updatedAt) || 0;
      const secondDate = Date.parse(second.updatedAt) || 0;
      return secondDate - firstDate;
    });
    return { records, invalidRecords, storageError: null };
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Date unavailable'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function makeCell(text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
  }

  function renderShipmentRow(record) {
    const row = document.createElement('tr');
    const referenceCell = document.createElement('td');
    const referenceLink = document.createElement('a');
    const reference = record.reference;
    referenceLink.href = `tracking.html?code=${encodeURIComponent(reference)}`;
    referenceLink.setAttribute('aria-label', `Track shipment ${reference}`);
    referenceLink.textContent = reference;
    referenceCell.append(referenceLink);

    const location = record.destination;
    const detail = record.goodsCategory || (
      record.direction === 'receiving' ? 'Receiving request' : 'Sending request'
    );
    const status = statusDetails[record.status];
    const statusCell = makeCell(status ? status.label : 'Status unavailable');
    if (status) {
      const badge = document.createElement('span');
      badge.className = `table-status ${status.visualStatus}`;
      badge.textContent = status.label;
      statusCell.replaceChildren(badge);
    }

    row.append(
      referenceCell,
      makeCell(location || 'Location not provided'),
      makeCell(formatDate(record.updatedAt)),
      statusCell
    );

    const actionCell = document.createElement('td');
    const actionLink = document.createElement('a');
    actionLink.href = referenceLink.href;
    actionLink.setAttribute('aria-label', `Track shipment ${reference}`);
    actionLink.textContent = '→';
    actionCell.append(actionLink);
    row.append(actionCell);

    const detailText = document.createElement('small');
    detailText.textContent = detail;
    referenceCell.append(detailText);
    return row;
  }

  function setMetric(id, value) {
    const metric = document.querySelector(`#${id}`);
    if (metric) metric.textContent = String(value);
  }

  function renderDashboard() {
    const { records, invalidRecords, storageError } = readShipmentRecords();
    const awaiting = records.filter((record) => record.status === 'request-prepared').length;
    const bookings = records.filter((record) => record.status === 'booking-message-prepared').length;
    const receiving = records.filter((record) => record.direction === 'receiving').length;

    setMetric('metric-requests', records.length);
    setMetric('metric-awaiting', awaiting);
    setMetric('metric-bookings', bookings);
    setMetric('metric-receiving', receiving);

    shipmentRows.replaceChildren();
    if (!records.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 5;
      emptyCell.textContent = storageError
        ? 'Saved delivery requests are unavailable in this browser.'
        : 'No delivery requests are saved in this browser yet.';
      emptyRow.append(emptyCell);
      shipmentRows.append(emptyRow);
      shipmentFeature.hidden = true;
    } else {
      records.forEach((record) => shipmentRows.append(renderShipmentRow(record)));
      const latest = records[0];
      const status = statusDetails[latest.status];
      const featureLink = document.querySelector('#feature-track-link');
      const featureStatus = document.querySelector('#shipment-status');

      shipmentFeature.hidden = false;
      shipmentFeature.dataset.status = status ? status.visualStatus : 'processing';
      shipmentFeature.setAttribute('aria-label', `Latest saved shipment: ${status ? status.label : 'status unavailable'}`);
      featureStatus.textContent = status ? status.label.toUpperCase() : 'STATUS UNAVAILABLE';
      document.querySelector('#shipment-reference').textContent = `SHIPMENT ${latest.reference}`;
      document.querySelector('#shipment-headline').textContent = status
        ? status.headline
        : 'Your latest delivery status is unavailable';
      document.querySelector('#shipment-origin').textContent = latest.origin || 'Pickup location';
      document.querySelector('#shipment-destination').textContent = latest.destination || 'Delivery location';
      document.querySelector('#shipment-eta').textContent = `Last updated ${formatDate(latest.updatedAt)}`;
      featureLink.href = `tracking.html?code=${encodeURIComponent(latest.reference)}`;
      featureLink.setAttribute('aria-label', `Track shipment ${latest.reference}`);
    }

    storageWarning.hidden = !storageError && !invalidRecords;
    if (storageError) {
      storageWarning.textContent = 'The browser could not read saved tracking records. Check browser storage permissions and try again.';
    } else if (invalidRecords) {
      storageWarning.textContent = 'Some saved tracking records could not be read. Valid records are shown below.';
    }
  }

  renderDashboard();
  window.addEventListener('storage', renderDashboard);
}
