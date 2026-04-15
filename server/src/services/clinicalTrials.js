import axios from 'axios';

const BASE = 'https://clinicaltrials.gov/api/v2/studies';

export async function getClinicalTrials(disease, query = '', pageSize = 40) {
  try {
    const searchTerm = disease || query;

    const [recruiting, completed] = await Promise.all([
      // Actively recruiting trials
      axios.get(BASE, {
        params: {
          'query.cond': searchTerm,
          'query.term': query || undefined,
          'filter.overallStatus': 'RECRUITING',
          pageSize: Math.floor(pageSize / 2),
          format: 'json',
        }
      }),
      // Recently completed trials
      axios.get(BASE, {
        params: {
          'query.cond': searchTerm,
          'filter.overallStatus': 'COMPLETED',
          pageSize: Math.floor(pageSize / 2),
          format: 'json',
        }
      })
    ]);

    const allStudies = [
      ...(recruiting.data?.studies || []),
      ...(completed.data?.studies || []),
    ];

    return allStudies.map(study => {
      const proto = study?.protocolSection;
      const id = proto?.identificationModule?.nctId || '';
      const title = proto?.identificationModule?.briefTitle || 'No title';
      const status = proto?.statusModule?.overallStatus || 'Unknown';
      const phase = proto?.designModule?.phases?.[0] || null;

      // Eligibility
      const eligibility = proto?.eligibilityModule;
      const criteria = eligibility?.eligibilityCriteria?.slice(0, 500) || '';
      const minAge = eligibility?.minimumAge || null;
      const maxAge = eligibility?.maximumAge || null;

      // Location
      const locations = proto?.contactsLocationsModule?.locations || [];
      const locationStr = locations
        .slice(0, 3)
        .map(l => [l.city, l.country].filter(Boolean).join(', '))
        .join(' | ');

      // Contact
      const contacts = proto?.contactsLocationsModule?.centralContacts || [];
      const contact = contacts[0]
        ? { name: contacts[0].name, email: contacts[0].email, phone: contacts[0].phone }
        : null;

      // Dates
      const startDate = proto?.statusModule?.startDateStruct?.date || null;
      const completionDate = proto?.statusModule?.completionDateStruct?.date || null;

      return {
        id: `ct_${id}`,
        nctId: id,
        title,
        status,
        phase,
        eligibilityCriteria: criteria,
        ageRange: minAge || maxAge ? `${minAge || '?'} – ${maxAge || '?'}` : null,
        location: locationStr || 'Not specified',
        contact,
        startDate,
        completionDate,
        url: `https://clinicaltrials.gov/study/${id}`,
        source: 'ClinicalTrials.gov',
      };
    }).filter(t => t.title && t.nctId);

  } catch (err) {
    console.error('ClinicalTrials error:', err.message);
    return [];
  }
}