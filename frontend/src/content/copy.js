// Centralized copy for PUBLIC pages (Board + Job + Apply flow).
// This file intentionally avoids recruiter/dashboard strings.
//
// Edit text here to change the UI copy without hunting components.

export const COPY = {
  board: {
    // BoardPage hero
    heroTitleTop: "Shape the future",
    heroTitleEmphasis: "of financial infrastructure.",
    heroSubtitle:
      "Boutique fintech consultancy at the intersection of data, distributed ledger technology, and payments.",

    // Above filters
    openPositionsLabel: "Open positions:",

    // Empty state
    noMatches: "No positions match the selected filters.",

    // Footer
    footer: "© 2025 Laminar · All rights reserved",
  },

  job: {
    // JobPage header
    openPositionKicker: "Open position",
    backToJobs: "Back to jobs",

    // Apply CTA
    applyCta: "Apply for this position",
    backButton: "← Back",

    // After submission
    receivedTitle: "Application received",
    receivedBody: "Thank you for applying. We’ll be in contact soon.",
  },

  apply: {
    // ApplyInlineForm section
    title: "Apply",

    fields: {
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      linkedin: "LinkedIn profile URL",
      cvUpload: "CV upload",
    },

    placeholders: {
      linkedin: "https://linkedin.com/in/yourprofile",
      cvTap: "Tap to attach your CV (PDF only)",
    },

    validation: {
      emailInvalid: "Please enter a valid email address.",
      linkInvalid: "Please enter a valid URL (including https://).",
      consentRequired: "Consent is required to submit your application.",
      alreadyApplied: "It looks like you already applied for this position with this email address.",
      submitFailed: "Couldn’t submit right now. Please try again.",
    },

    submitButton: {
      idle: "Submit application",
      submitting: "Submitting…",
    },
  },

  legal: {
    // ApplyInlineForm consent checkbox.
    // Replace URLs once your policies are published.
    privacyPolicyUrl: "https://www.laminarpay.com/privacy",
    termsUrl: "https://www.laminarpay.com/terms",

    consentLabelPrefix: "I consent to the processing of my personal data for recruitment purposes, in accordance with the",
    consentLabelPrivacy: "Privacy Policy",
    consentLabelAnd: "and",
    consentLabelTerms: "Terms",
    consentLabelSuffix: ".",
  },
};

