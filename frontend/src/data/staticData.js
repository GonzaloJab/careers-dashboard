let _idSeq = 3;
export const nextId = () => ++_idSeq;

export const TEAMS = ["Wholesale", "Retail", "Operations", "Technology", "Research"];
export const LOCS = ["Madrid", "London", "Barcelona", "Amsterdam", "Remote"];
export const SENS = ["Junior", "Mid", "Mid-Senior", "Senior", "Lead", "Principal"];
export const REMOTES = ["Onsite", "Hybrid", "Remote"];
export const TYPES = ["Full-time", "Part-time", "Contract", "Freelance"];
export const JOB_STATUSES = ["drafting", "open", "closed"];

export const INIT_JOBS = [
  {
    id: 1,
    status: "open",
    title: "Business Data Consultant",
    team: "Retail",
    location: "Madrid",
    remote: "Hybrid",
    seniority: "Senior",
    type: "Full-time",
    description:
      "Lead data strategy and analytics initiatives for retail payments clients. Work with payment processors, banks, and fintechs to turn transaction data into actionable insights.",
    questions: [
      {
        id: "q1",
        label: "Years of experience in payments or fintech",
        type: "select",
        options: ["<1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"],
        isMust: false,
      },
      {
        id: "q2",
        label: "Languages you work professionally in",
        type: "multicheck",
        options: ["English", "Spanish", "French", "German", "Portuguese"],
        isMust: true,
      },
      {
        id: "q3",
        label: "Data tools you use regularly",
        type: "multicheck",
        options: ["SQL", "Python", "Power BI", "Tableau", "Spark", "dbt", "Other"],
        isMust: false,
      },
      {
        id: "q4",
        label: "SQL proficiency level",
        type: "select",
        options: ["Beginner", "Intermediate", "Advanced", "Expert"],
        isMust: false,
      },
    ],
    criteria: [
      {
        questionId: "q1",
        label: "Min. 3 years experience",
        matchValues: ["3–5 years", "5–10 years", "10+ years"],
      },
      { questionId: "q2", label: "English required", matchValues: ["English"] },
    ],
  },
  {
    id: 2,
    status: "open",
    title: "DLT Technical Consultant",
    team: "Wholesale",
    location: "London",
    remote: "Remote",
    seniority: "Mid-Senior",
    type: "Contract",
    description:
      "Design and implement distributed ledger solutions for wholesale financial markets. Advise institutional clients on tokenisation, settlement, and on-chain data architecture.",
    questions: [
      {
        id: "q1",
        label: "Years of experience with DLT / blockchain",
        type: "select",
        options: ["<1 year", "1–3 years", "3–5 years", "5–10 years", "10+ years"],
        isMust: false,
      },
      {
        id: "q2",
        label: "Languages you work professionally in",
        type: "multicheck",
        options: ["English", "Spanish", "French", "German", "Portuguese"],
        isMust: true,
      },
      {
        id: "q3",
        label: "DLT platforms you have worked with",
        type: "multicheck",
        options: [
          "Ethereum / EVM",
          "Hyperledger Fabric",
          "Corda",
          "Solana",
          "Stellar",
          "DAML",
          "Other",
        ],
        isMust: false,
      },
      {
        id: "q4",
        label: "Background in wholesale finance",
        type: "select",
        options: ["None", "Some exposure", "Solid background", "Deep expertise"],
        isMust: false,
      },
    ],
    criteria: [
      {
        questionId: "q1",
        label: "Min. 1 year DLT experience",
        matchValues: ["1–3 years", "3–5 years", "5–10 years", "10+ years"],
      },
      { questionId: "q2", label: "English required", matchValues: ["English"] },
    ],
  },
];

export const MOCK_APPS = [
  {
    id: 1,
    jobId: 1,
    name: "Elena Márquez",
    linkedin: "https://linkedin.com",
    status: "new",
    date: "2025-04-10",
    answers: { q1: "5–10 years", q2: ["English", "Spanish"], q3: ["SQL", "Python"], q4: "Expert" },
  },
  {
    id: 2,
    jobId: 2,
    name: "James Okonkwo",
    linkedin: "https://linkedin.com",
    status: "new",
    date: "2025-04-11",
    answers: { q1: "3–5 years", q2: ["English"], q3: ["Ethereum / EVM"], q4: "Solid background" },
  },
  {
    id: 3,
    jobId: 1,
    name: "Luisa Ferreira",
    linkedin: "https://linkedin.com",
    status: "shortlisted",
    date: "2025-04-12",
    answers: { q1: "3–5 years", q2: ["English", "Portuguese"], q3: ["dbt", "Python"], q4: "Advanced" },
  },
  {
    id: 4,
    jobId: 2,
    name: "Tobias Müller",
    linkedin: "https://linkedin.com",
    status: "interview",
    date: "2025-04-12",
    answers: { q1: "5–10 years", q2: ["English", "German"], q3: ["Corda", "DAML"], q4: "Deep expertise" },
  },
  {
    id: 5,
    jobId: 1,
    name: "Sara Andersen",
    linkedin: "",
    status: "new",
    date: "2025-04-13",
    answers: { q1: "1–3 years", q2: ["English", "French"], q3: ["Tableau"], q4: "Intermediate" },
  },
  {
    id: 6,
    jobId: 2,
    name: "Hiroshi Nakamura",
    linkedin: "https://linkedin.com",
    status: "new",
    date: "2025-04-14",
    answers: {
      q1: "<1 year",
      q2: ["English"],
      q3: ["Ethereum / EVM", "Solana"],
      q4: "Some exposure",
    },
  },
];

