// Smart job data detection engine with multi-layer approach

const JobDetector = {
  /**
   * Main detection function that uses all layers
   * @returns {Object} Detected job data with confidence scores
   */
  detect() {
    const results = {
      company: { value: '', confidence: 0, source: '' },
      jobTitle: { value: '', confidence: 0, source: '' },
      location: { value: '', confidence: 0, source: '' },
      description: { value: '', confidence: 0, source: '' }
    };

    // Layer 1: Structured Data (highest confidence)
    this.detectFromStructuredData(results);

    // Layer 2: Semantic HTML (high confidence)
    this.detectFromSemanticHTML(results);

    // Layer 3: Text Analysis (medium confidence)
    this.detectFromTextAnalysis(results);

    // Layer 4: Fallback methods (low confidence)
    this.applyFallbacks(results);

    return {
      company: results.company.value,
      jobTitle: results.jobTitle.value,
      location: results.location.value,
      description: results.description.value,
      confidence: {
        company: results.company.confidence,
        jobTitle: results.jobTitle.confidence,
        location: results.location.confidence,
        description: results.description.confidence
      },
      sources: {
        company: results.company.source,
        jobTitle: results.jobTitle.source,
        location: results.location.source,
        description: results.description.source
      }
    };
  },

  /**
   * Layer 1: Detect from structured data (JSON-LD, OpenGraph)
   */
  detectFromStructuredData(results) {
    // Try JSON-LD schema
    const jsonLdData = this.findJobPostingSchema();
    if (jsonLdData) {
      if (jsonLdData.hiringOrganization && jsonLdData.hiringOrganization.name) {
        this.updateField(results, 'company', jsonLdData.hiringOrganization.name, 95, 'JSON-LD Schema');
      }
      if (jsonLdData.title) {
        this.updateField(results, 'jobTitle', jsonLdData.title, 95, 'JSON-LD Schema');
      }
      if (jsonLdData.jobLocation) {
        const location = this.parseJobLocation(jsonLdData.jobLocation);
        if (location) {
          this.updateField(results, 'location', location, 95, 'JSON-LD Schema');
        }
      }
      if (jsonLdData.description) {
        this.updateField(results, 'description', jsonLdData.description, 95, 'JSON-LD Schema');
      }
    }

    // Try OpenGraph meta tags
    const ogData = this.extractFromOpenGraph();
    if (ogData.title && results.jobTitle.confidence < 85) {
      this.updateField(results, 'jobTitle', ogData.title, 85, 'OpenGraph Meta');
    }
    if (ogData.siteName && results.company.confidence < 85) {
      this.updateField(results, 'company', ogData.siteName, 85, 'OpenGraph Meta');
    }
    if (ogData.description && results.description.confidence < 85) {
      this.updateField(results, 'description', ogData.description, 85, 'OpenGraph Meta');
    }
  },

  /**
   * Layer 2: Detect from semantic HTML
   */
  detectFromSemanticHTML(results) {
    // Known job site patterns
    const patterns = {
      // LinkedIn
      linkedin: {
        company: '.topcard__org-name-link, .top-card-layout__card .topcard__flavor--black-link',
        jobTitle: '.topcard__title, .top-card-layout__title',
        location: '.topcard__flavor--bullet, .top-card-layout__second-subline',
        description: '.show-more-less-html__markup, .description__text'
      },
      // Indeed
      indeed: {
        company: '[data-company-name], .jobsearch-InlineCompanyRating-companyHeader, .icl-u-lg-mr--sm',
        jobTitle: '.jobsearch-JobInfoHeader-title, h1.icl-u-xs-mb--xs',
        location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle',
        description: '#jobDescriptionText, .jobsearch-jobDescriptionText'
      },
      // Glassdoor
      glassdoor: {
        company: '[data-test="employer-name"], .EmployerProfile_employerName__QvlPJ',
        jobTitle: '[data-test="job-title"], .JobDetails_jobTitle__cNuIa',
        location: '[data-test="location"], .JobDetails_location__MbnUM',
        description: '[data-test="job-description"], .JobDetails_jobDescription__uW_fK'
      }
    };

    // Try site-specific patterns
    const hostname = window.location.hostname.toLowerCase();
    let sitePattern = null;

    if (hostname.includes('linkedin.com')) {
      sitePattern = patterns.linkedin;
    } else if (hostname.includes('indeed.com')) {
      sitePattern = patterns.indeed;
    } else if (hostname.includes('glassdoor.com')) {
      sitePattern = patterns.glassdoor;
    }

    if (sitePattern) {
      this.trySelectors(results, 'company', sitePattern.company, 80, 'Known Site Pattern');
      this.trySelectors(results, 'jobTitle', sitePattern.jobTitle, 80, 'Known Site Pattern');
      this.trySelectors(results, 'location', sitePattern.location, 80, 'Known Site Pattern');
      if (sitePattern.description) {
        this.trySelectors(results, 'description', sitePattern.description, 80, 'Known Site Pattern');
      }
    }

    // Try common generic selectors
    this.trySelectors(results, 'company', '.company-name, [data-company], .hiring-company, .employer-name', 75, 'Semantic HTML');
    this.trySelectors(results, 'jobTitle', '.job-title, [data-job-title], .position-title, h1[class*="title"]', 75, 'Semantic HTML');
    this.trySelectors(results, 'location', '.location, [data-location], .job-location, .work-location', 75, 'Semantic HTML');
    this.trySelectors(results, 'description', '.job-description, [data-description], .description, .job-details, [class*="description"]', 70, 'Semantic HTML');

    // Try ARIA labels
    this.tryAriaLabels(results);
  },

  /**
   * Layer 3: Text analysis and pattern matching
   */
  detectFromTextAnalysis(results) {
    // Get visible text content
    const bodyText = document.body.innerText;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'));

    // Detect company name
    if (results.company.confidence < 60) {
      const company = this.findCompanyName(bodyText, headings);
      if (company) {
        this.updateField(results, 'company', company, 60, 'Text Analysis');
      }
    }

    // Detect job title
    if (results.jobTitle.confidence < 60) {
      const jobTitle = this.findJobTitle(headings, bodyText);
      if (jobTitle) {
        this.updateField(results, 'jobTitle', jobTitle, 60, 'Text Analysis');
      }
    }

    // Detect location
    if (results.location.confidence < 60) {
      const location = this.findLocation(bodyText);
      if (location) {
        this.updateField(results, 'location', location, 60, 'Text Analysis');
      }
    }
  },

  /**
   * Layer 4: Fallback methods
   */
  applyFallbacks(results) {
    // Use page title for job title if nothing better found
    if (results.jobTitle.confidence < 40) {
      const titleMatch = document.title.match(/^([^-|]+)/);
      if (titleMatch && titleMatch[1].trim()) {
        this.updateField(results, 'jobTitle', titleMatch[1].trim(), 40, 'Page Title');
      }
    }

    // Extract company from domain
    if (results.company.confidence < 40) {
      const hostname = window.location.hostname;
      const company = hostname.replace(/^www\./, '').split('.')[0];
      const capitalizedCompany = company.charAt(0).toUpperCase() + company.slice(1);
      this.updateField(results, 'company', capitalizedCompany, 35, 'Domain Name');
    }

    // Use first H1 for job title
    if (results.jobTitle.confidence < 40) {
      const firstH1 = document.querySelector('h1');
      if (firstH1 && firstH1.textContent.trim()) {
        this.updateField(results, 'jobTitle', firstH1.textContent.trim(), 35, 'First H1');
      }
    }
  },

  /**
   * Helper: Update field if new confidence is higher
   */
  updateField(results, field, value, confidence, source) {
    if (!value || value.trim().length === 0) return;

    const cleanValue = value.trim().replace(/\s+/g, ' ');

    if (confidence > results[field].confidence) {
      results[field] = {
        value: cleanValue,
        confidence: confidence,
        source: source
      };
    }
  },

  /**
   * Find JobPosting JSON-LD schema
   */
  findJobPostingSchema() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);

        // Handle both single object and array formats
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (item['@type'] === 'JobPosting') {
            return item;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  },

  /**
   * Parse job location from various formats
   */
  parseJobLocation(jobLocation) {
    if (typeof jobLocation === 'string') {
      return jobLocation;
    }

    if (jobLocation.address) {
      const addr = jobLocation.address;
      if (typeof addr === 'string') return addr;

      // Format: City, State
      const parts = [];
      if (addr.addressLocality) parts.push(addr.addressLocality);
      if (addr.addressRegion) parts.push(addr.addressRegion);
      if (parts.length > 0) return parts.join(', ');

      if (addr.addressCountry) return addr.addressCountry;
    }

    return null;
  },

  /**
   * Extract from OpenGraph meta tags
   */
  extractFromOpenGraph() {
    return {
      title: this.getMetaContent('og:title'),
      siteName: this.getMetaContent('og:site_name'),
      description: this.getMetaContent('og:description') || this.getMetaContent('description')
    };
  },

  /**
   * Get meta tag content
   */
  getMetaContent(property) {
    const meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    return meta ? meta.getAttribute('content') : null;
  },

  /**
   * Try multiple selectors for a field
   */
  trySelectors(results, field, selectors, confidence, source) {
    if (results[field].confidence >= confidence) return;

    const selectorList = selectors.split(',').map(s => s.trim());

    for (const selector of selectorList) {
      try {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          this.updateField(results, field, element.textContent.trim(), confidence, source);
          if (results[field].confidence >= confidence) return;
        }
      } catch (e) {
        continue;
      }
    }
  },

  /**
   * Try ARIA labels
   */
  tryAriaLabels(results) {
    const allElements = document.querySelectorAll('[aria-label]');

    for (const el of allElements) {
      const label = el.getAttribute('aria-label').toLowerCase();
      const text = el.textContent.trim();

      if (!text) continue;

      if ((label.includes('company') || label.includes('employer')) && results.company.confidence < 70) {
        this.updateField(results, 'company', text, 70, 'ARIA Label');
      }

      if ((label.includes('job') || label.includes('title') || label.includes('position')) && results.jobTitle.confidence < 70) {
        this.updateField(results, 'jobTitle', text, 70, 'ARIA Label');
      }

      if (label.includes('location') && results.location.confidence < 70) {
        this.updateField(results, 'location', text, 70, 'ARIA Label');
      }
    }
  },

  /**
   * Find company name using patterns
   */
  findCompanyName(text, headings) {
    // Pattern 1: "at Company" or "@ Company"
    const atPattern = /(?:at|@)\s+([A-Z][A-Za-z0-9\s&.,-]{2,50})(?:\.|,|\s|$)/g;
    let match = atPattern.exec(text);
    if (match && match[1]) {
      return this.cleanCompanyName(match[1]);
    }

    // Pattern 2: Look for company suffixes
    const suffixPattern = /\b([A-Z][A-Za-z0-9\s&.,-]{2,50}?)\s+(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company)\b/g;
    match = suffixPattern.exec(text);
    if (match) {
      return this.cleanCompanyName(match[0]);
    }

    // Pattern 3: Check headings for company-like text
    for (const heading of headings) {
      const headingText = heading.textContent.trim();
      if (headingText.length > 3 && headingText.length < 50) {
        const fontSize = parseFloat(window.getComputedStyle(heading).fontSize);
        if (fontSize > 14 && fontSize < 24) {
          // Medium-sized heading, might be company name
          if (this.looksLikeCompanyName(headingText)) {
            return headingText;
          }
        }
      }
    }

    return null;
  },

  /**
   * Find job title
   */
  findJobTitle(headings, text) {
    // Look for job keywords in large headings
    const jobKeywords = [
      'engineer', 'developer', 'designer', 'manager', 'analyst', 'specialist',
      'director', 'coordinator', 'consultant', 'architect', 'lead', 'senior',
      'junior', 'intern', 'associate', 'administrator', 'technician', 'officer'
    ];

    // Check H1 first (most likely to be job title)
    const h1Elements = document.querySelectorAll('h1');
    for (const h1 of h1Elements) {
      const text = h1.textContent.trim();
      if (this.containsJobKeyword(text, jobKeywords)) {
        return text;
      }
    }

    // Check other headings
    for (const heading of headings) {
      const text = heading.textContent.trim();
      if (text.length > 5 && text.length < 100 && this.containsJobKeyword(text, jobKeywords)) {
        const fontSize = parseFloat(window.getComputedStyle(heading).fontSize);
        if (fontSize > 18) {
          return text;
        }
      }
    }

    return null;
  },

  /**
   * Find location
   */
  findLocation(text) {
    // Pattern 1: City, State format
    const cityStatePattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2})\b/g;
    let match = cityStatePattern.exec(text);
    if (match) {
      return `${match[1]}, ${match[2]}`;
    }

    // Pattern 2: Remote work
    if (/\b(remote|work from home|wfh)\b/i.test(text)) {
      return 'Remote';
    }

    // Pattern 3: "Location:" label
    const locationPattern = /location:?\s*([A-Z][a-zA-Z\s,.-]+(?:,\s*[A-Z]{2})?)/i;
    match = locationPattern.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Pattern 4: US States (full names)
    const states = ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania',
                   'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'Massachusetts', 'Washington'];
    for (const state of states) {
      const stateRegex = new RegExp(`\\b${state}\\b`, 'i');
      if (stateRegex.test(text)) {
        return state;
      }
    }

    return null;
  },

  /**
   * Clean company name
   */
  cleanCompanyName(name) {
    return name.trim().replace(/\s+/g, ' ').replace(/[,.]$/, '');
  },

  /**
   * Check if text looks like a company name
   */
  looksLikeCompanyName(text) {
    // Has capital letters and reasonable length
    if (text.length < 2 || text.length > 50) return false;

    // Contains company suffixes
    if (/\b(Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company)\b/i.test(text)) return true;

    // Starts with capital and doesn't look like a sentence
    if (/^[A-Z]/.test(text) && !/\s(the|a|an|is|are|was|were)\s/i.test(text)) return true;

    return false;
  },

  /**
   * Check if text contains job keywords
   */
  containsJobKeyword(text, keywords) {
    const textLower = text.toLowerCase();
    return keywords.some(keyword => textLower.includes(keyword));
  }
};
