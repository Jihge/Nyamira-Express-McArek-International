(function () {
  const helpButton = document.querySelector('.help-chat-bubble');
  const botPanel = document.querySelector('.bot-panel');
  const closeButton = document.querySelector('.bot-close');
  const form = document.querySelector('.bot-form');
  const input = document.querySelector('.bot-form input');
  const messages = document.querySelector('.bot-messages');

  if (!helpButton || !botPanel || !form || !input || !messages) return;

  const addMessage = (text, from = 'bot') => {
    const entry = document.createElement('div');
    entry.className = `bot-message ${from}`;
    entry.textContent = text;
    messages.appendChild(entry);
    messages.scrollTop = messages.scrollHeight;
  };

  let previousIntent = '';

  const normalizeQuestion = (question) => question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const answerPrompt = (question) => {
    const prompt = normalizeQuestion(question);
    const respond = (intent, message) => {
      previousIntent = intent;
      return message;
    };
    const reference = prompt.match(/\bne\s*-?\s*\d{5,}\b/i)?.[0].replace(/\s+/g, '').replace(/^(ne)(\d)/i, '$1-$2').toUpperCase();

    if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(prompt)) {
      return respond('greeting', 'Hello. I can help with tracking, delivery proof, services, and support details for Nyamira Express (McArek International). What do you need help with?');
    }

    if (/\b(how does .* work|how it works|workflow|delivery process|steps|what happens after|what next|after that)\b/.test(prompt)) {
      return respond('workflow', 'Use Get a Quote to enter the client, shipment, route and pickup details in one request. The page generates a PDF and opens WhatsApp so you can attach and send it. For an existing shipment, use its NE reference on the Tracking page.');
    }

    if (/\b(pricing|price|cost|rate|how much|charge|fee)\b/.test(prompt)) {
      return respond('pricing', 'Use the Get a Quote button to prepare a quote request for Nyamira Express (McArek International).');
    }

    if (/\b(book|booking|pickup|pick up|collect|collection|schedule|arrange a courier)\b/.test(prompt)) {
      return respond('pickup', 'Include your preferred pickup date and time window in the Get a Quote form. It combines your details in one PDF request for WhatsApp.');
    }

    if (/\b(proof of delivery|delivery proof|pod|delivered|recipient signature)\b/.test(prompt)) {
      return respond('delivery', 'When delivery is recorded, the tracking page should show the delivered status and proof-of-delivery milestone. If your shipment has no delivery proof yet, contact Support with its NE reference.');
    }

    if (reference || /\b(track|tracking|shipment status|parcel status|where is my parcel|where is my shipment|delivery status)\b/.test(prompt)) {
      const detail = reference ? ` Open tracking.html?code=${encodeURIComponent(reference)} to view ${reference}.` : ' Open the Tracking page and enter your NE reference.';
      return respond('tracking', `Tracking shows the latest status and milestones available for a shipment.${detail} Newly created requests remain marked as saved until dispatch confirms them; this prototype is not connected to live carrier updates.`);
    }

    if (/\b(address|where are you|where is your office|where are you based|location|located)\b/.test(prompt)) {
      return respond('address', 'Nyamira Express (McArek International) is listed at 7 Duvenhage Avenue, Edleen, Kempton Park, Gauteng, South Africa.');
    }

    if (/\b(phone|telephone|call|contact|speak to someone|human|agent|whatsapp)\b/.test(prompt)) {
      return respond('contact', 'Contact Nyamira Express (McArek International) on 074 444 0102 or 081 254 3946. Email info@nyamilaexpress.co.za or use the Support page for WhatsApp and contact options.');
    }

    if (/\b(email|e-mail)\b/.test(prompt)) {
      return respond('email', 'Email info@nyamilaexpress.co.za or use the Support page for contact options.');
    }

    if (/\b(hours|opening time|open today|business hours|when are you open)\b/.test(prompt)) {
      return respond('hours', 'The listed support hours are Monday to Friday, 08:00-17:00, and Saturday, 08:00-12:00. For urgent questions, try the Support page or WhatsApp.');
    }

    if (/\b(coverage|areas|area|region|regions|gauteng|south africa|cross-border|cross border)\b/.test(prompt)) {
      return respond('coverage', 'Nyamira Express (McArek International) supports key Gauteng routes, broader South African delivery, and regional or cross-border logistics enquiries. Use Coverage or contact Support to confirm a specific destination.');
    }

    if (/\b(warehouse|warehousing|fulfilment|fulfillment|storage|inventory)\b/.test(prompt)) {
      return respond('warehousing', 'Nyamira Express (McArek International) supports warehousing, storage, fulfilment and dispatch coordination for business logistics. Contact Support to discuss a specific operation.');
    }

    if (/^(and|what about|how about|tell me more|more details)\b/.test(prompt) && previousIntent === 'services') {
      return respond('services', 'For more detail, local courier and same-day services move individual shipments; scheduled routes suit recurring needs; warehousing and fulfilment support storage and dispatch. Contact Support with questions about a specific service.');
    }

    if (/\b(service|services|courier|delivery|deliver|shipping|freight|cargo|same day|same-day|logistics)\b/.test(prompt)) {
      return respond('services', 'Services include local courier delivery, same-day dispatch, scheduled routes, regional and cross-border logistics, warehousing and fulfilment. Ask about a route or service type and I can point you to the right next step.');
    }

    if (/\b(who are you|who is nyamira|who is mcarek|what is nyamira|what is mcarek|what company|what is this company|tell me about nyamira|tell me about mcarek|about the company)\b/.test(prompt)) {
      return respond('company', 'Nyamira Express (McArek International) is a Gauteng-based courier and logistics business supporting delivery, transportation, warehousing and fulfilment enquiries.');
    }

    if (/^(thanks|thank you|thank u|ok|okay)\b/.test(prompt)) {
      return respond('thanks', 'You are welcome. Ask me about shipment tracking, delivery proof, services or support.');
    }

    return respond('unknown', 'I may have misunderstood. I can help with tracking, proof of delivery, coverage, services, opening hours and contact details. Tell me which one you need, or use the Support page to reach the team.');
  };

  helpButton.addEventListener('click', function (event) {
    event.preventDefault();
    botPanel.classList.toggle('hidden');
    if (!botPanel.classList.contains('hidden')) {
      input.focus();
    }
  });

  closeButton.addEventListener('click', function () {
    botPanel.classList.add('hidden');
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;

    addMessage(value, 'user');
    input.value = '';

    window.setTimeout(() => {
      addMessage(answerPrompt(value), 'bot');
    }, 250);
  });
})();
