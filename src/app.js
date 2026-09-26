/* ============================================================
   SchemeSaathi — eligibility engine + UI logic
   Data lives in embedded_data.js (generated from the /data JSON files)
   ============================================================ */

let currentLang = 'en';
let lastResults = null;
let lastPatient = null;
let currentStep = 1;

function t(key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS.en[key] || key;
}

/* ----------------------------------------------------------
   ELIGIBILITY ENGINE
   ---------------------------------------------------------- */
function checkEligibility(patient) {
  const results = [];

  for (const scheme of SCHEMES) {
    const rule = scheme.eligibility;
    const reasons = [];
    let eligible = true;

    if (rule.requiresExistingPolicy) {
      if (patient.existingPolicy !== rule.policyName) continue;
      reasons.push({ en: 'You already hold this private policy.', hi: 'आपके पास पहले से यह निजी पॉलिसी है।', te: 'మీ వద్ద ఇప్పటికే ఈ ప్రైవేట్ పాలసీ ఉంది.' });
    }

    if (rule.centralGovtEmployeeOnly) {
      const ok = patient.employment === 'central_govt' || (rule.pensionerAllowed && patient.employment === 'retired');
      if (!ok) eligible = false;
      else reasons.push({ en: 'You are a central government employee or pensioner.', hi: 'आप केंद्र सरकार के कर्मचारी या पेंशनभोगी हैं।', te: 'మీరు కేంద్ర ప్రభుత్వ ఉద్యోగి లేదా పెన్షనర్.' });
    }

    if (rule.stateGovtEmployeeOnly) {
      const ok = patient.employment === 'state_govt' ||
                 (rule.pensionerAllowed && patient.employment === 'retired') ||
                 (rule.journalistAllowed && patient.employment === 'journalist');
      if (!ok) eligible = false;
      else reasons.push({ en: 'You are a Telangana state government employee, pensioner, or accredited journalist.', hi: 'आप तेलंगाना राज्य सरकार के कर्मचारी, पेंशनभोगी, या मान्यता प्राप्त पत्रकार हैं।', te: 'మీరు తెలంగాణ రాష్ట్ర ప్రభుత్వ ఉద్యోగి, పెన్షనర్, లేదా గుర్తింపు పొందిన జర్నలిస్ట్.' });
    }

    if (rule.employmentRequired) {
      const ok = patient.employment === 'private_low';
      if (!ok) eligible = false;
      else reasons.push({ en: `Your salary is under the ESI limit of ₹${rule.maxMonthlyWage.toLocaleString('en-IN')}/month.`, hi: `आपका वेतन ईएसआई सीमा ₹${rule.maxMonthlyWage.toLocaleString('en-IN')}/माह से कम है।`, te: `మీ జీతం ఇఎస్ఐ పరిమితి ₹${rule.maxMonthlyWage.toLocaleString('en-IN')}/నెలకు తక్కువ.` });
    }

    if (rule.govtEmployeeExcluded && (patient.employment === 'central_govt' || patient.employment === 'state_govt')) {
      eligible = false;
    }

    if (rule.maxAnnualIncome != null) {
      if (patient.income > rule.maxAnnualIncome) eligible = false;
      else reasons.push({ en: `Your family income is within the ₹${rule.maxAnnualIncome.toLocaleString('en-IN')}/year limit.`, hi: `आपकी पारिवारिक आय ₹${rule.maxAnnualIncome.toLocaleString('en-IN')}/वर्ष की सीमा के भीतर है।`, te: `మీ కుటుంబ ఆదాయం ₹${rule.maxAnnualIncome.toLocaleString('en-IN')}/సంవత్సరం పరిమితిలో ఉంది.` });
    }

    if (rule.residentStatesOnly && scheme.states[0] !== 'all') {
      if (!scheme.states.includes(patient.state)) eligible = false;
      else reasons.push({ en: `This scheme operates in ${patient.state}.`, hi: `यह योजना ${patient.state} में लागू है।`, te: `ఈ పథకం ${patient.state}లో అమలులో ఉంది.` });
    }

    if (rule.requiresRationCard || rule.requiresSECCListing) {
      if (patient.rationCard === 'none') eligible = false;
      else if (rule.acceptedRationCardTypes && !rule.acceptedRationCardTypes.includes(patient.rationCard)) eligible = false;
      else reasons.push({ en: 'You hold a ration card type accepted by this scheme.', hi: 'आपके पास इस योजना द्वारा स्वीकृत राशन कार्ड है।', te: 'ఈ పథకం ఆమోదించిన రేషన్ కార్డ్ మీ వద్ద ఉంది.' });
    }

    if (rule.alreadyInsuredExcluded && patient.existingPolicy && patient.existingPolicy !== 'none') {
      eligible = false;
    }

    if (eligible && reasons.length > 0) {
      const procedureCovered = !patient.procedure || patient.procedure === 'other' ||
        scheme.coveredProcedureCategories.includes(patient.procedure);
      results.push({ scheme, reasons, procedureCovered });
    }
  }

  return results;
}

/* ---------------------------------------------------------- */

function applyTranslations() {
  document.body.setAttribute('lang', currentLang);
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  populateStateOptions();
  if (lastResults) renderResults(lastResults, lastPatient);
  renderHospitalCityFilter();
  renderHospitalList();
}

function populateStateOptions() {
  const select = document.getElementById('stateSelect');
  if (!select) return;
  const current = select.value;
  const opts = t('stateOptions');
  const englishOpts = TRANSLATIONS.en.stateOptions;
  select.innerHTML = opts.map((label, i) => `<option value="${englishOpts[i]}">${label}</option>`).join('');
  if (current) select.value = current;
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewName).classList.add('active');
  document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === viewName));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------- Multi-step form ---------------- */
function goToStep(step) {
  currentStep = step;
  document.querySelectorAll('.form-step').forEach(s => s.style.display = 'none');
  document.getElementById('formStep' + step).style.display = 'block';
  document.getElementById('formProgressFill').style.width = (step === 1 ? '50%' : '100%');
  document.getElementById('formProgressLabel').textContent = `${t('formSectionOf')} ${step} / 2`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleStep1Next(e) {
  e.preventDefault();
  const name = document.getElementById('patientName').value.trim();
  if (!name) {
    document.getElementById('patientName').focus();
    return;
  }
  goToStep(2);
}

function handleFormSubmit(e) {
  e.preventDefault();

  const patient = {
    name: document.getElementById('patientName').value.trim(),
    age: document.getElementById('patientAge').value,
    gender: document.querySelector('input[name="gender"]:checked')?.value || '',
    contact: document.getElementById('patientContact').value.trim(),
    condition: document.getElementById('patientCondition').value.trim(),
    state: document.getElementById('stateSelect').value,
    income: Number(document.getElementById('incomeInput').value) || 0,
    rationCard: document.querySelector('input[name="ration"]:checked')?.value || 'none',
    employment: document.querySelector('input[name="employment"]:checked')?.value || 'unemployed',
    existingPolicy: document.querySelector('input[name="policy"]:checked')?.value || 'none',
    procedure: document.getElementById('procedureSelect').value
  };

  const results = checkEligibility(patient);
  lastResults = results;
  lastPatient = patient;
  renderResults(results, patient);
  switchView('results');
}

function renderResults(results, patient) {
  const container = document.getElementById('resultsContainer');
  const heading = document.getElementById('resultsHeading');
  heading.textContent = t('resultsTitle');

  const summaryEl = document.getElementById('patientSummary');
  if (patient && patient.name) {
    const genderLabel = patient.gender ? t('gender' + patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)) : '';
    const metaParts = [patient.age ? `${patient.age}` : '', genderLabel, patient.state].filter(Boolean).join(' · ');
    summaryEl.innerHTML = `
      <div>
        <div class="summary-label">${t('patientSummaryTitle')}</div>
        <div class="summary-name">${escapeHtml(patient.name)}</div>
      </div>
      <div class="summary-meta">${escapeHtml(metaParts)}</div>
      ${patient.condition ? `<div class="summary-meta">"${escapeHtml(patient.condition)}"</div>` : ''}
    `;
    summaryEl.style.display = 'flex';
  } else {
    summaryEl.style.display = 'none';
  }

  if (results.length === 0) {
    container.innerHTML = `
      <div class="no-results-card">
        <h3>${t('resultsNone')}</h3>
        <p>${t('resultsNoneBody')}</p>
        <p><strong>${t('helpline')}:</strong> 104 (Aarogyasri) &middot; 14555 (PM-JAY)</p>
      </div>`;
    return;
  }

  container.innerHTML = results.map(r => {
    const s = r.scheme;
    const reasonsHtml = r.reasons.map(reason => `<li>${reason[currentLang] || reason.en}</li>`).join('');
    const docsHtml = s.requiredDocuments.map(d => `<li>${d[currentLang] || d.en}</li>`).join('');
    const typeLabel = { state: 'State scheme', central: 'Central scheme', private: 'Private insurance' }[s.type];
    const isPrivate = s.type === 'private';

    return `
      <div class="scheme-card ${isPrivate ? 'type-private' : ''}">
        <span class="scheme-type-badge ${isPrivate ? 'private' : ''}">${typeLabel}</span>
        <h3>${s.name[currentLang] || s.name.en}</h3>
        <p class="scheme-desc">${s.description[currentLang] || s.description.en}</p>

        <div class="scheme-section">
          <div class="scheme-section-label">${t('whyEligible')}</div>
          <ul class="doc-list">${reasonsHtml}</ul>
        </div>

        <div class="scheme-section">
          <div class="scheme-section-label">${t('coverage')}</div>
          <p style="margin:0;color:var(--ink-soft)">${s.coverageAmount[currentLang] || s.coverageAmount.en}</p>
        </div>

        <div class="scheme-section">
          <div class="scheme-section-label">${t('documentsNeeded')}</div>
          <ul class="doc-list">${docsHtml}</ul>
        </div>

        <div class="scheme-footer">
          <span><strong>${t('helpline')}:</strong> ${s.helpline}</span>
          <a href="${s.officialUrl}" target="_blank" rel="noopener">${t('officialSite')} &#8599;</a>
          <button class="btn-secondary" onclick="showHospitalsForScheme('${s.id}')">${t('findHospitalsNear')}</button>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Hospitals ---------------- */
let hospitalSchemeFilter = null;

function showHospitalsForScheme(schemeId) {
  hospitalSchemeFilter = schemeId;
  switchView('hospitals');
  renderHospitalList();
}

function renderHospitalCityFilter() {
  const select = document.getElementById('cityFilter');
  if (!select) return;
  const cities = [...new Set(HOSPITALS.map(h => h.city))].sort();
  select.innerHTML = `<option value="">${t('allCities')}</option>` + cities.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderHospitalList() {
  const container = document.getElementById('hospitalsContainer');
  if (!container) return;
  const cityFilter = document.getElementById('cityFilter')?.value || '';

  let list = HOSPITALS;
  if (cityFilter) list = list.filter(h => h.city === cityFilter);
  if (hospitalSchemeFilter) list = list.filter(h => h.empanelledSchemes.includes(hospitalSchemeFilter));

  const titleEl = document.getElementById('hospitalsSubtitle');
  if (hospitalSchemeFilter) {
    const scheme = SCHEMES.find(s => s.id === hospitalSchemeFilter);
    titleEl.textContent = `${t('hospitalsForScheme')} ${scheme.shortName[currentLang] || scheme.shortName.en}`;
    titleEl.style.display = 'block';
  } else {
    titleEl.style.display = 'none';
  }

  if (list.length === 0) {
    container.innerHTML = `<p style="color:var(--ink-soft)">No hospitals found for this filter.</p>`;
    return;
  }

  container.innerHTML = list.map(h => {
    const chips = h.empanelledSchemes.map(sid => {
      const s = SCHEMES.find(x => x.id === sid);
      return s ? `<span class="scheme-chip">${s.shortName[currentLang] || s.shortName.en}</span>` : '';
    }).join('');
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`;

    return `
      <div class="hospital-card">
        <div class="hospital-info">
          <h3>${h.name}</h3>
          <div class="addr">${h.address}</div>
          <div class="scheme-chips">${chips}</div>
        </div>
        <div class="hospital-actions">
          <a href="tel:${h.phone}">${t('callHospital')}: ${h.phone}</a>
          <a href="${mapUrl}" target="_blank" rel="noopener">${t('viewOnMap')} &#8599;</a>
        </div>
      </div>`;
  }).join('');
}

/* ---------------- Misc ---------------- */
function initRadioHighlighting() {
  document.querySelectorAll('.radio-option').forEach(opt => {
    const input = opt.querySelector('input');
    input.addEventListener('change', () => {
      document.querySelectorAll(`input[name="${input.name}"]`).forEach(i => {
        i.closest('.radio-option').classList.toggle('checked', i.checked);
      });
    });
  });
}

function resetForm() {
  document.getElementById('eligibilityForm').reset();
  document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('checked'));
  document.querySelectorAll('input[type="radio"]:checked').forEach(i => i.closest('.radio-option')?.classList.add('checked'));
  goToStep(1);
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  initRadioHighlighting();
  goToStep(1);

  document.getElementById('langSelect').addEventListener('change', (e) => {
    currentLang = e.target.value;
    applyTranslations();
  });

  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('heroStartBtn').addEventListener('click', () => switchView('check'));
  document.getElementById('step1NextBtn').addEventListener('click', handleStep1Next);
  document.getElementById('step2BackBtn').addEventListener('click', () => goToStep(1));
  document.getElementById('eligibilityForm').addEventListener('submit', handleFormSubmit);
  document.getElementById('startOverBtn').addEventListener('click', () => { resetForm(); switchView('check'); });
  document.getElementById('printResultsBtn').addEventListener('click', () => window.print());
  document.getElementById('cityFilter').addEventListener('change', renderHospitalList);
  document.getElementById('navHospitalsDirectBtn').addEventListener('click', () => {
    hospitalSchemeFilter = null;
    renderHospitalList();
  });

  switchView('home');
});
