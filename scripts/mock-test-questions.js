// CLAT 2027 Mock Test 04 - Complete Questions Data
// Total: 120 questions across 5 sections
// Scoring: +1 for correct, -0.25 for incorrect

const mockTestQuestions = {
  title: "CLAT 2027 Mock Test 04",
  description: "Full-length mock test for CLAT 2027 preparation",
  total_questions: 120,
  total_marks: 120,
  duration_minutes: 120,
  marking_scheme: {
    correct: 1,
    incorrect: -0.25,
    unattempted: 0
  },
  sections: [
    {
      name: "English Language",
      questions: 24,
      time_suggested: 30
    },
    {
      name: "Current Affairs including General Knowledge", 
      questions: 28,
      time_suggested: 20
    },
    {
      name: "Legal Reasoning",
      questions: 32,
      time_suggested: 35
    },
    {
      name: "Logical Reasoning",
      questions: 24,
      time_suggested: 25
    },
    {
      name: "Quantitative Techniques",
      questions: 12,
      time_suggested: 10
    }
  ],
  questions: []
};

// ENGLISH LANGUAGE (Q1-24)
// Passage 1: Astrology (Q1-6)
const englishPassage1 = `Indian astrology, more accurately called Vedic astrology, originated at least 4,000 years ago and has a rich mythology about many gods and goddesses. It is interwoven with the sister fields of yoga and Ayurveda. The connections among the three are so deep that studying or practicing one without the others is like trying to balance on a one-legged stool. Vedic astrology promotes balance. It describes the planets and signs in terms of three qualities: cardinal (creative), fixed (stable), and mutable (changeable). There are four cardinal signs, four fixed signs and four mutable signs. Likewise the nine planets are counted as three cardinal, three fixed and three mutable. The key is to create balance from these energies.`;

mockTestQuestions.questions.push(
  {
    id: 1,
    section: "English Language",
    passage: englishPassage1,
    question: "According to the passage, what is the relationship between Vedic astrology, yoga, and Ayurveda?",
    options: {
      A: "They have no relation to each other",
      B: "They are interconnected sister fields that complement each other",
      C: "Vedic astrology is superior to yoga and Ayurveda",
      D: "They compete with each other for followers"
    }
  },
  {
    id: 2,
    section: "English Language",
    passage: englishPassage1,
    question: "The passage suggests that practicing one field without the others is:",
    options: {
      A: "The most effective approach",
      B: "Like trying to balance on a one-legged stool",
      C: "Recommended for beginners",
      D: "A modern innovation"
    }
  },
  {
    id: 3,
    section: "English Language",
    passage: englishPassage1,
    question: "How many cardinal signs are mentioned in Vedic astrology?",
    options: {
      A: "Three",
      B: "Four",
      C: "Nine",
      D: "Twelve"
    }
  },
  {
    id: 4,
    section: "English Language",
    passage: englishPassage1,
    question: "The three qualities described in Vedic astrology are:",
    options: {
      A: "Past, present, and future",
      B: "Body, mind, and soul",
      C: "Cardinal, fixed, and mutable",
      D: "Sun, moon, and stars"
    }
  },
  {
    id: 5,
    section: "English Language",
    passage: englishPassage1,
    question: "What is the key principle promoted by Vedic astrology according to the passage?",
    options: {
      A: "Prediction of future",
      B: "Creating balance from energies",
      C: "Worshipping gods and goddesses",
      D: "Mathematical calculations"
    }
  },
  {
    id: 6,
    section: "English Language",
    passage: englishPassage1,
    question: "How old is Indian/Vedic astrology according to the passage?",
    options: {
      A: "At least 1,000 years",
      B: "At least 2,000 years",
      C: "At least 3,000 years",
      D: "At least 4,000 years"
    }
  }
);

// Passage 2: Montessori Method (Q7-12)
const englishPassage2 = `The Montessori method of education, developed by Italian physician and educator Maria Montessori, emphasizes independence, freedom within limits, and respect for a child's natural psychological, physical, and social development. Based on Montessori's observations of children from birth to maturity, her educational approach suggests that children learn best in a prepared environment. Montessori education involves free activity within a "prepared environment," meaning an educational environment tailored to basic human characteristics and to the specific characteristics of children at different ages. The role of the teacher, according to Montessori, is primarily that of an observer whose ultimate goal is to intervene less and less as the child develops.`;

mockTestQuestions.questions.push(
  {
    id: 7,
    section: "English Language",
    passage: englishPassage2,
    question: "What does the Montessori method primarily emphasize?",
    options: {
      A: "Strict discipline and memorization",
      B: "Independence, freedom within limits, and respect for natural development",
      C: "Competitive learning and standardized testing",
      D: "Teacher-centered instruction"
    }
  },
  {
    id: 8,
    section: "English Language",
    passage: englishPassage2,
    question: "According to the passage, what is a 'prepared environment'?",
    options: {
      A: "A classroom with expensive equipment",
      B: "An environment where teachers prepare lessons",
      C: "An educational environment tailored to human characteristics and age-specific needs",
      D: "A sterile laboratory setting"
    }
  },
  {
    id: 9,
    section: "English Language",
    passage: englishPassage2,
    question: "What is the teacher's primary role in Montessori education?",
    options: {
      A: "To lecture continuously",
      B: "To observe and intervene less as the child develops",
      C: "To enforce strict rules",
      D: "To grade and rank students"
    }
  },
  {
    id: 10,
    section: "English Language",
    passage: englishPassage2,
    question: "Maria Montessori's educational approach was based on:",
    options: {
      A: "Traditional teaching methods",
      B: "Government educational policies",
      C: "Her observations of children from birth to maturity",
      D: "Religious teachings"
    }
  },
  {
    id: 11,
    section: "English Language",
    passage: englishPassage2,
    question: "The passage suggests that in Montessori education, children learn best through:",
    options: {
      A: "Strict schedules and rigid structure",
      B: "Free activity within a prepared environment",
      C: "Continuous teacher instruction",
      D: "Isolation from other children"
    }
  },
  {
    id: 12,
    section: "English Language",
    passage: englishPassage2,
    question: "What was Maria Montessori's original profession?",
    options: {
      A: "Teacher",
      B: "Psychologist",
      C: "Physician",
      D: "Social worker"
    }
  }
);

// Passage 3: Digital Divide (Q13-18)
const englishPassage3 = `The digital divide refers to the gap between individuals, households, businesses, and geographic areas at different socio-economic levels with regard to their opportunities to access information and communication technologies. The divide exists both within and between countries and regions of the world. While the term initially referred to gaps in ownership of computers, it has evolved to include gaps in access to the internet, digital literacy skills, and the quality of internet connections. The COVID-19 pandemic has highlighted and exacerbated these disparities, as remote work, online education, and digital health services became essential. Bridging the digital divide requires not only infrastructure investment but also efforts to improve digital literacy and ensure affordable access to technology for all segments of society.`;

mockTestQuestions.questions.push(
  {
    id: 13,
    section: "English Language",
    passage: englishPassage3,
    question: "What does the term 'digital divide' refer to?",
    options: {
      A: "The separation between digital and analog technologies",
      B: "The gap in access to information and communication technologies",
      C: "The division between software and hardware",
      D: "The conflict between technology companies"
    }
  },
  {
    id: 14,
    section: "English Language",
    passage: englishPassage3,
    question: "According to the passage, the digital divide exists:",
    options: {
      A: "Only in developing countries",
      B: "Only between countries",
      C: "Both within and between countries and regions",
      D: "Only in rural areas"
    }
  },
  {
    id: 15,
    section: "English Language",
    passage: englishPassage3,
    question: "How has the meaning of 'digital divide' evolved over time?",
    options: {
      A: "It now only refers to smartphone ownership",
      B: "It has expanded to include internet access, digital literacy, and connection quality",
      C: "It has become less relevant",
      D: "It now only refers to social media usage"
    }
  },
  {
    id: 16,
    section: "English Language",
    passage: englishPassage3,
    question: "What impact did COVID-19 have on the digital divide?",
    options: {
      A: "It eliminated the divide",
      B: "It had no effect",
      C: "It highlighted and exacerbated the disparities",
      D: "It only affected wealthy nations"
    }
  },
  {
    id: 17,
    section: "English Language",
    passage: englishPassage3,
    question: "According to the passage, bridging the digital divide requires:",
    options: {
      A: "Only providing free computers",
      B: "Infrastructure investment, digital literacy improvement, and affordable access",
      C: "Banning technology in certain areas",
      D: "Government control of the internet"
    }
  },
  {
    id: 18,
    section: "English Language",
    passage: englishPassage3,
    question: "Which services became essential during the pandemic according to the passage?",
    options: {
      A: "Television and radio",
      B: "Postal services",
      C: "Remote work, online education, and digital health services",
      D: "Public transportation"
    }
  }
);

// Passage 4: Retirement Planning (Q19-24)
const englishPassage4 = `Planning for retirement is one of the most important financial decisions individuals make in their lifetime. Yet, studies show that a significant percentage of people are unprepared for their retirement years. The shift from defined benefit pension plans to defined contribution plans has transferred the responsibility of retirement planning from employers to employees. This change requires individuals to be more proactive in understanding investment options, risk management, and long-term financial planning. Financial literacy plays a crucial role in retirement preparedness. Those who understand compound interest, inflation, and investment diversification are better positioned to build adequate retirement savings. Starting early is perhaps the most critical factor, as it allows the power of compound interest to work over a longer period.`;

mockTestQuestions.questions.push(
  {
    id: 19,
    section: "English Language",
    passage: englishPassage4,
    question: "What major shift in retirement planning does the passage describe?",
    options: {
      A: "From individual to government responsibility",
      B: "From defined contribution to defined benefit plans",
      C: "From defined benefit to defined contribution plans",
      D: "From private to public pension systems"
    }
  },
  {
    id: 20,
    section: "English Language",
    passage: englishPassage4,
    question: "According to the passage, what does the shift in retirement planning require from individuals?",
    options: {
      A: "Less involvement in planning",
      B: "More proactive understanding of investments and financial planning",
      C: "Complete reliance on employers",
      D: "Avoiding all financial risks"
    }
  },
  {
    id: 21,
    section: "English Language",
    passage: englishPassage4,
    question: "What role does financial literacy play in retirement preparedness?",
    options: {
      A: "It has no impact",
      B: "It plays a crucial role",
      C: "It is only important for wealthy individuals",
      D: "It complicates the planning process"
    }
  },
  {
    id: 22,
    section: "English Language",
    passage: englishPassage4,
    question: "Which concepts should individuals understand for better retirement savings?",
    options: {
      A: "Only stock market trends",
      B: "Only government policies",
      C: "Compound interest, inflation, and investment diversification",
      D: "Only real estate values"
    }
  },
  {
    id: 23,
    section: "English Language",
    passage: englishPassage4,
    question: "What does the passage identify as perhaps the most critical factor in retirement planning?",
    options: {
      A: "Having a high income",
      B: "Starting early",
      C: "Avoiding all investments",
      D: "Waiting until age 50"
    }
  },
  {
    id: 24,
    section: "English Language",
    passage: englishPassage4,
    question: "Why is starting early important for retirement planning?",
    options: {
      A: "It reduces the need to save",
      B: "It allows compound interest to work over a longer period",
      C: "It guarantees high returns",
      D: "It eliminates all financial risks"
    }
  }
);

// CURRENT AFFAIRS INCLUDING GENERAL KNOWLEDGE (Q25-52)
mockTestQuestions.questions.push(
  {
    id: 25,
    section: "Current Affairs",
    question: "The 23rd Shanghai Cooperation Organisation (SCO) Summit was hosted by which country in July 2023?",
    options: {
      A: "Kazakhstan",
      B: "India",
      C: "Russia",
      D: "China"
    }
  },
  {
    id: 26,
    section: "Current Affairs",
    question: "According to the UN Sustainable Development Goals Report 2023, which country topped the SDG Index?",
    options: {
      A: "Sweden",
      B: "Finland",
      C: "Denmark",
      D: "Norway"
    }
  },
  {
    id: 27,
    section: "Current Affairs",
    question: "The United States announced a $345 million military aid package to which country in July 2023?",
    options: {
      A: "Israel",
      B: "Ukraine",
      C: "South Korea",
      D: "Poland"
    }
  },
  {
    id: 28,
    section: "Current Affairs",
    question: "Which Indian state launched the 'Gruha Jyothi' scheme offering free electricity up to 200 units?",
    options: {
      A: "Tamil Nadu",
      B: "Telangana",
      C: "Karnataka",
      D: "Andhra Pradesh"
    }
  },
  {
    id: 29,
    section: "Current Affairs",
    question: "The Reserve Bank of India kept the repo rate unchanged at what percentage in June 2023?",
    options: {
      A: "6.25%",
      B: "6.50%",
      C: "6.75%",
      D: "7.00%"
    }
  },
  {
    id: 30,
    section: "Current Affairs",
    question: "Which country became the 31st member of NATO in 2023?",
    options: {
      A: "Sweden",
      B: "Finland",
      C: "Ukraine",
      D: "Georgia"
    }
  },
  {
    id: 31,
    section: "Current Affairs",
    question: "The G20 Summit 2023 was held in which Indian city?",
    options: {
      A: "Mumbai",
      B: "Bengaluru",
      C: "New Delhi",
      D: "Chennai"
    }
  },
  {
    id: 32,
    section: "Current Affairs",
    question: "Which space agency successfully launched the Chandrayaan-3 mission to the Moon in 2023?",
    options: {
      A: "NASA",
      B: "ISRO",
      C: "ESA",
      D: "JAXA"
    }
  },
  {
    id: 33,
    section: "Current Affairs",
    question: "The 'Threads' social media platform was launched by which company?",
    options: {
      A: "Twitter",
      B: "Google",
      C: "Meta",
      D: "Microsoft"
    }
  },
  {
    id: 34,
    section: "Current Affairs",
    question: "Which country hosted the FIFA Women's World Cup 2023?",
    options: {
      A: "France",
      B: "United States",
      C: "Australia and New Zealand",
      D: "Brazil"
    }
  },
  {
    id: 35,
    section: "Current Affairs",
    question: "The African Union was granted permanent membership in which international organization in 2023?",
    options: {
      A: "United Nations Security Council",
      B: "G20",
      C: "BRICS",
      D: "World Trade Organization"
    }
  },
  {
    id: 36,
    section: "Current Affairs",
    question: "Which Indian sportsperson won the men's singles title at the BWF World Championships 2023?",
    options: {
      A: "Kidambi Srikanth",
      B: "Lakshya Sen",
      C: "HS Prannoy",
      D: "Sai Praneeth"
    }
  },
  {
    id: 37,
    section: "Current Affairs",
    question: "The 'Bharat Mandapam' convention center was inaugurated in which city?",
    options: {
      A: "Mumbai",
      B: "New Delhi",
      C: "Kolkata",
      D: "Hyderabad"
    }
  },
  {
    id: 38,
    section: "Current Affairs",
    question: "Which country announced its withdrawal from the Black Sea Grain Deal in July 2023?",
    options: {
      A: "Ukraine",
      B: "Turkey",
      C: "Russia",
      D: "Romania"
    }
  },
  {
    id: 39,
    section: "Current Affairs",
    question: "The 'Meri Maati Mera Desh' campaign was launched to commemorate:",
    options: {
      A: "75 years of Independence",
      B: "100 years of Gandhi's Dandi March",
      C: "50 years of Green Revolution",
      D: "25 years of Kargil Victory"
    }
  },
  {
    id: 40,
    section: "Current Affairs",
    question: "Which Indian state topped the NITI Aayog's Export Preparedness Index 2022?",
    options: {
      A: "Maharashtra",
      B: "Gujarat",
      C: "Tamil Nadu",
      D: "Karnataka"
    }
  },
  {
    id: 41,
    section: "Current Affairs",
    question: "The International Day of Yoga is celebrated on:",
    options: {
      A: "March 21",
      B: "June 21",
      C: "September 21",
      D: "December 21"
    }
  },
  {
    id: 42,
    section: "Current Affairs",
    question: "Which organization publishes the Global Innovation Index?",
    options: {
      A: "World Bank",
      B: "UNDP",
      C: "WIPO",
      D: "WTO"
    }
  },
  {
    id: 43,
    section: "Current Affairs",
    question: "The 'PM Vishwakarma' scheme is aimed at supporting:",
    options: {
      A: "Farmers",
      B: "Traditional artisans and craftspeople",
      C: "IT professionals",
      D: "Healthcare workers"
    }
  },
  {
    id: 44,
    section: "Current Affairs",
    question: "Which country launched the world's first 3D-printed rocket in 2023?",
    options: {
      A: "United States",
      B: "China",
      C: "Japan",
      D: "United Kingdom"
    }
  },
  {
    id: 45,
    section: "Current Affairs",
    question: "The BRICS Summit 2023 was held in which country?",
    options: {
      A: "Brazil",
      B: "South Africa",
      C: "India",
      D: "China"
    }
  },
  {
    id: 46,
    section: "Current Affairs",
    question: "Which Indian airport was named the 'Best Airport' by Skytrax in 2023?",
    options: {
      A: "Mumbai Airport",
      B: "Delhi Airport",
      C: "Bengaluru Airport",
      D: "Hyderabad Airport"
    }
  },
  {
    id: 47,
    section: "Current Affairs",
    question: "The 'Amrit Bharat Station' scheme aims to:",
    options: {
      A: "Build new airports",
      B: "Modernize railway stations",
      C: "Construct new highways",
      D: "Develop waterways"
    }
  },
  {
    id: 48,
    section: "Current Affairs",
    question: "Which company became the first to achieve a $3 trillion market capitalization in 2023?",
    options: {
      A: "Microsoft",
      B: "Apple",
      C: "Amazon",
      D: "Google"
    }
  },
  {
    id: 49,
    section: "Current Affairs",
    question: "The 'Global Stocktake' report is associated with:",
    options: {
      A: "World Trade Organization",
      B: "Paris Climate Agreement",
      C: "International Monetary Fund",
      D: "World Health Organization"
    }
  },
  {
    id: 50,
    section: "Current Affairs",
    question: "Which Indian cricketer announced retirement from international cricket in 2023?",
    options: {
      A: "MS Dhoni",
      B: "Shikhar Dhawan",
      C: "Cheteshwar Pujara",
      D: "Ajinkya Rahane"
    }
  },
  {
    id: 51,
    section: "Current Affairs",
    question: "The 'Voice of Global South Summit' was hosted by:",
    options: {
      A: "Brazil",
      B: "South Africa",
      C: "India",
      D: "Indonesia"
    }
  },
  {
    id: 52,
    section: "Current Affairs",
    question: "Which technology company launched 'Bard' as its AI chatbot?",
    options: {
      A: "Microsoft",
      B: "Google",
      C: "Meta",
      D: "Amazon"
    }
  }
);

// LEGAL REASONING (Q53-84)
// Legal Passage 1: Constitutional Amendment (Q53-60)
const legalPassage1 = `Article 368 of the Indian Constitution deals with the powers of Parliament to amend the Constitution and its procedure. It states that Parliament may, in exercise of its constituent power, amend by way of addition, variation, or repeal any provision of the Constitution in accordance with the procedure laid down in the article. However, the Supreme Court in the Kesavananda Bharati case (1973) held that while Parliament has wide powers to amend the Constitution, it cannot destroy or alter the 'basic structure' of the Constitution. The basic structure doctrine acts as a limitation on the amending power of Parliament. This doctrine ensures that certain fundamental features of the Constitution remain inviolable and cannot be amended away.`;

mockTestQuestions.questions.push(
  {
    id: 53,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "According to Article 368, Parliament can amend the Constitution by:",
    options: {
      A: "Only addition of new provisions",
      B: "Only variation of existing provisions",
      C: "Addition, variation, or repeal of any provision",
      D: "Only with prior permission from the Supreme Court"
    }
  },
  {
    id: 54,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "The 'basic structure' doctrine was established in which case?",
    options: {
      A: "Golaknath case",
      B: "Kesavananda Bharati case",
      C: "Minerva Mills case",
      D: "Indira Gandhi case"
    }
  },
  {
    id: 55,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "The basic structure doctrine serves as:",
    options: {
      A: "A guide for drafting new laws",
      B: "A limitation on Parliament's amending power",
      C: "A procedure for constitutional interpretation",
      D: "An absolute bar on all amendments"
    }
  },
  {
    id: 56,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "According to the passage, certain fundamental features of the Constitution are:",
    options: {
      A: "Subject to change by simple majority",
      B: "Amendable only by referendum",
      C: "Inviolable and cannot be amended away",
      D: "Changeable only by the President"
    }
  },
  {
    id: 57,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "If Parliament passes a constitutional amendment that violates the basic structure, it would be:",
    options: {
      A: "Automatically valid",
      B: "Subject to judicial review and could be struck down",
      C: "Valid after Presidential assent",
      D: "Valid if passed by two-thirds majority"
    }
  },
  {
    id: 58,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "A law student argues that Parliament's power to amend is absolute. Based on the passage, this argument is:",
    options: {
      A: "Correct, as Article 368 gives unlimited power",
      B: "Incorrect, as the basic structure doctrine limits this power",
      C: "Partially correct for ordinary laws only",
      D: "Correct only for financial amendments"
    }
  },
  {
    id: 59,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "If a constitutional amendment seeks to remove judicial review entirely, it would likely be:",
    options: {
      A: "Valid as Parliament has constituent power",
      B: "Invalid as it would violate the basic structure",
      C: "Valid if passed unanimously",
      D: "Subject to referendum"
    }
  },
  {
    id: 60,
    section: "Legal Reasoning",
    passage: legalPassage1,
    question: "The Kesavananda Bharati judgment established that:",
    options: {
      A: "Parliament cannot amend the Constitution",
      B: "All amendments require judicial approval",
      C: "Parliament has wide but not unlimited amending powers",
      D: "Only the Supreme Court can amend the Constitution"
    }
  }
);

// Legal Passage 2: Environmental Liability (Q61-68)
const legalPassage2 = `The principle of 'Polluter Pays' is a fundamental concept in environmental law that requires the party responsible for producing pollution to bear the costs of managing it to prevent damage to human health or the environment. In India, this principle has been recognized by the Supreme Court in various cases and is now considered part of environmental jurisprudence. The National Green Tribunal Act, 2010, explicitly incorporates this principle along with the precautionary principle and sustainable development. Under this principle, the polluter is not only liable for compensating the victims of pollution but also for restoring the environmental damage. The liability is absolute and is not subject to any exceptions based on the lawfulness of the activity or the care taken to prevent pollution.`;

mockTestQuestions.questions.push(
  {
    id: 61,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "The 'Polluter Pays' principle requires:",
    options: {
      A: "The government to bear pollution management costs",
      B: "The pollution victims to manage the damage",
      C: "The polluter to bear the costs of managing pollution",
      D: "Insurance companies to cover all damages"
    }
  },
  {
    id: 62,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "According to the passage, the liability under the Polluter Pays principle is:",
    options: {
      A: "Limited to lawful activities",
      B: "Subject to exceptions based on care taken",
      C: "Absolute with no exceptions",
      D: "Applicable only to intentional pollution"
    }
  },
  {
    id: 63,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "The National Green Tribunal Act, 2010 incorporates which principles?",
    options: {
      A: "Only the Polluter Pays principle",
      B: "Polluter Pays, precautionary principle, and sustainable development",
      C: "Only sustainable development",
      D: "Only the precautionary principle"
    }
  },
  {
    id: 64,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "Under the Polluter Pays principle, the polluter is liable for:",
    options: {
      A: "Only compensating victims",
      B: "Only restoring environmental damage",
      C: "Both compensating victims and restoring environmental damage",
      D: "Neither compensation nor restoration"
    }
  },
  {
    id: 65,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "A factory operating with all required permits causes accidental pollution. Under the principle discussed, the factory would be:",
    options: {
      A: "Not liable as it had permits",
      B: "Not liable as it was accidental",
      C: "Liable despite having permits and the accidental nature",
      D: "Liable only if negligence is proved"
    }
  },
  {
    id: 66,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "If a company argues that it took all reasonable care to prevent pollution, under this principle:",
    options: {
      A: "It would be exempted from liability",
      B: "Its liability would be reduced",
      C: "It would still be absolutely liable",
      D: "The court would decide based on the circumstances"
    }
  },
  {
    id: 67,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "The Polluter Pays principle in India has been:",
    options: {
      A: "Rejected by the Supreme Court",
      B: "Recognized by the Supreme Court in various cases",
      C: "Applied only to government entities",
      D: "Limited to air pollution only"
    }
  },
  {
    id: 68,
    section: "Legal Reasoning",
    passage: legalPassage2,
    question: "A chemical plant legally disposes waste but it seeps into groundwater. The plant would be:",
    options: {
      A: "Not liable as disposal was legal",
      B: "Liable only for future prevention",
      C: "Absolutely liable for all damages and restoration",
      D: "Liable only if it knew about the seepage"
    }
  }
);

// Legal Passage 3: Emergency Provisions (Q69-76)
const legalPassage3 = `Article 352 of the Indian Constitution empowers the President to proclaim a state of Emergency if he is satisfied that the security of India or any part thereof is threatened by war, external aggression, or armed rebellion. This is known as National Emergency. During such emergency, the federal structure of the Constitution can be modified, and the Union government gets overriding powers. However, the 44th Constitutional Amendment Act, 1978, introduced important safeguards. The proclamation of emergency must now be approved by both Houses of Parliament by a special majority within one month. Furthermore, the emergency can be revoked by the President at any time without requiring Parliamentary approval, or Parliament can revoke it by passing a resolution to that effect.`;

mockTestQuestions.questions.push(
  {
    id: 69,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "Under Article 352, National Emergency can be proclaimed due to:",
    options: {
      A: "Only war",
      B: "Only external aggression",
      C: "War, external aggression, or armed rebellion",
      D: "Any disturbance of peace"
    }
  },
  {
    id: 70,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "The 44th Constitutional Amendment Act, 1978, introduced:",
    options: {
      A: "The concept of emergency",
      B: "Important safeguards for emergency proclamation",
      C: "Absolute presidential powers",
      D: "Removal of emergency provisions"
    }
  },
  {
    id: 71,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "Parliamentary approval for emergency proclamation requires:",
    options: {
      A: "Simple majority in one House",
      B: "Simple majority in both Houses",
      C: "Special majority in both Houses",
      D: "No parliamentary approval"
    }
  },
  {
    id: 72,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "The emergency proclamation must be approved by Parliament within:",
    options: {
      A: "One week",
      B: "One month",
      C: "Two months",
      D: "Six months"
    }
  },
  {
    id: 73,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "During National Emergency, the federal structure:",
    options: {
      A: "Remains unchanged",
      B: "Can be modified with Union government getting overriding powers",
      C: "Is completely abolished",
      D: "Transfers all powers to states"
    }
  },
  {
    id: 74,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "The President can revoke the emergency:",
    options: {
      A: "Only with Parliamentary approval",
      B: "At any time without requiring Parliamentary approval",
      C: "Only after one year",
      D: "Never once proclaimed"
    }
  },
  {
    id: 75,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "If Parliament wants to revoke an emergency proclamation, it can do so by:",
    options: {
      A: "Approaching the Supreme Court",
      B: "Waiting for Presidential action",
      C: "Passing a resolution to that effect",
      D: "Calling for a referendum"
    }
  },
  {
    id: 76,
    section: "Legal Reasoning",
    passage: legalPassage3,
    question: "If the President proclaims emergency but Parliament fails to approve it within the stipulated time:",
    options: {
      A: "The emergency continues indefinitely",
      B: "The emergency proclamation ceases to operate",
      C: "The Supreme Court decides",
      D: "Fresh proclamation is required"
    }
  }
);

// Legal Passage 4: Arbitration Law (Q77-84)
const legalPassage4 = `The Arbitration and Conciliation Act, 2015, amended the 1996 Act to make arbitration a preferred mode of settlement of commercial disputes and to make India a hub of international commercial arbitration. Section 34 of the Act provides for setting aside of arbitral awards by courts on limited grounds. The grounds include incapacity of parties, invalidity of arbitration agreement, lack of proper notice, the award dealing with disputes beyond the scope of submission to arbitration, and the award being in conflict with the public policy of India. The Supreme Court has consistently held that courts should adopt a hands-off approach in arbitration matters and should not interfere with arbitral awards unless the grounds mentioned in Section 34 are clearly established. The scope of 'public policy' has been narrowly interpreted to prevent excessive judicial interference.`;

mockTestQuestions.questions.push(
  {
    id: 77,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "The 2015 amendment to the Arbitration Act aimed to:",
    options: {
      A: "Discourage arbitration",
      B: "Make arbitration a preferred mode for commercial dispute settlement",
      C: "Give more power to courts",
      D: "Eliminate international arbitration"
    }
  },
  {
    id: 78,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "Under Section 34, arbitral awards can be set aside on:",
    options: {
      A: "Any grounds the court deems fit",
      B: "Limited grounds specified in the Act",
      C: "Only procedural irregularities",
      D: "No grounds whatsoever"
    }
  },
  {
    id: 79,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "Which of the following is NOT mentioned as a ground for setting aside an arbitral award?",
    options: {
      A: "Incapacity of parties",
      B: "Invalidity of arbitration agreement",
      C: "Disagreement with the merits of the award",
      D: "Lack of proper notice"
    }
  },
  {
    id: 80,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "The Supreme Court's approach to arbitration matters has been to:",
    options: {
      A: "Actively review all awards",
      B: "Adopt a hands-off approach",
      C: "Replace arbitrators' decisions",
      D: "Encourage court intervention"
    }
  },
  {
    id: 81,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "The scope of 'public policy' in arbitration has been interpreted:",
    options: {
      A: "Broadly to allow more judicial review",
      B: "Narrowly to prevent excessive judicial interference",
      C: "To include all government policies",
      D: "To exclude commercial matters"
    }
  },
  {
    id: 82,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "If an arbitral award deals with matters beyond the submission to arbitration, it:",
    options: {
      A: "Is automatically valid",
      B: "Can be set aside under Section 34",
      C: "Requires fresh arbitration",
      D: "Becomes a court judgment"
    }
  },
  {
    id: 83,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "A party unhappy with an arbitral award on its merits alone:",
    options: {
      A: "Can easily get it set aside",
      B: "Cannot get it set aside unless Section 34 grounds exist",
      C: "Can appeal to higher courts freely",
      D: "Must accept the award"
    }
  },
  {
    id: 84,
    section: "Legal Reasoning",
    passage: legalPassage4,
    question: "The 2015 amendment's goal to make India a hub of international commercial arbitration suggests:",
    options: {
      A: "Reducing the credibility of arbitration",
      B: "Increasing judicial interference",
      C: "Creating a pro-arbitration legal framework",
      D: "Eliminating domestic arbitration"
    }
  }
);

// LOGICAL REASONING (Q85-108)
// Logical Passage 1: Air Pollution (Q85-90)
const logicalPassage1 = `A recent study on air pollution in metropolitan cities revealed interesting patterns. Cities with higher industrial activity showed 40% more particulate matter than cities primarily focused on services. However, cities with extensive green cover, despite having industries, showed 25% less pollution than purely industrial cities without greenery. The study also found that cities with efficient public transportation systems had 30% lower vehicular emissions. Interestingly, coastal cities showed better air quality indices compared to landlocked cities, with sea breezes helping disperse pollutants. The research concluded that a combination of factors, rather than a single element, determines a city's air quality.`;

mockTestQuestions.questions.push(
  {
    id: 85,
    section: "Logical Reasoning",
    passage: logicalPassage1,
    question: "Based on the passage, which type of city would likely have the best air quality?",
    options: {
      A: "A landlocked industrial city with no green cover",
      B: "A coastal service-focused city with green cover and good public transport",
      C: "An industrial city with excellent public transport but no greenery",
      D: "A service city with no public transport or green cover"
    }
  },
  {
    id: 86,
    section: "Logical Reasoning",
    passage: logicalPassage1,
    question: "If City X has industries but also extensive green cover, its pollution levels compared to a purely industrial city would be:",
    options: {
      A: "25% higher",
      B: "25% lower",
      C: "40% higher",
      D: "The same"
    }
  },
  {
    id: 87,
    section: "Logical Reasoning",
    passage: logicalPassage1,
    question: "The passage suggests that sea breezes in coastal cities:",
    options: {
      A: "Increase pollution",
      B: "Have no effect on air quality",
      C: "Help disperse pollutants",
      D: "Only affect temperature"
    }
  },
  {
    id: 88,
    section: "Logical Reasoning",
    passage: logicalPassage1,
    question: "Which conclusion can be drawn from the study?",
    options: {
      A: "Only industrial activity affects air quality",
      B: "Public transportation has no impact on air quality",
      C: "Multiple factors interact to determine air quality",
      D: "Geography is irrelevant to pollution levels"
    }
  },
  {
    id: 89,
    section: "Logical Reasoning",
    passage: logicalPassage1,
    question: "A city with efficient public transportation would have vehicular emissions that are:",
    options: {
      A: "30% higher than cities without it",
      B: "30% lower than cities without it",
      C: "Unchanged",
      D: "Doubled"
    }
  },
  {
    id: 90,
    section: "Logical Reasoning",
    passage: logicalPassage1,
    question: "If a landlocked industrial city adds extensive green cover, the expected change in pollution would be:",
    options: {
      A: "No change",
      B: "Increase by 25%",
      C: "Decrease, but still higher than coastal cities",
      D: "Become the lowest among all cities"
    }
  }
);

// Logical Passage 2: UPI Transactions (Q91-96)
const logicalPassage2 = `The Unified Payments Interface (UPI) has revolutionized digital transactions in India. Data shows that UPI transactions grew by 70% year-on-year in 2023, with the average transaction value being ₹1,800. Interestingly, 60% of all UPI transactions occur between 6 PM and 10 PM, suggesting heavy usage during evening shopping hours. Small merchants adopted UPI at twice the rate of large retailers, with 85% of street vendors now accepting UPI payments compared to 45% of established retail chains. The data also reveals that users aged 25-40 account for 55% of all transactions, while those above 60 years contribute only 8%. Rural areas showed a 150% growth in UPI adoption, outpacing urban growth of 50%.`;

mockTestQuestions.questions.push(
  {
    id: 91,
    section: "Logical Reasoning",
    passage: logicalPassage2,
    question: "Which group shows the highest UPI adoption rate according to the passage?",
    options: {
      A: "Large retailers",
      B: "Street vendors",
      C: "Users above 60 years",
      D: "Urban areas"
    }
  },
  {
    id: 92,
    section: "Logical Reasoning",
    passage: logicalPassage2,
    question: "If UPI transactions were 100 million in 2022, how many would there be in 2023?",
    options: {
      A: "150 million",
      B: "170 million",
      C: "70 million",
      D: "200 million"
    }
  },
  {
    id: 93,
    section: "Logical Reasoning",
    passage: logicalPassage2,
    question: "The concentration of transactions between 6 PM and 10 PM suggests:",
    options: {
      A: "System failures during day time",
      B: "Heavy usage during evening shopping hours",
      C: "Restrictions on morning transactions",
      D: "Preference for night-time banking"
    }
  },
  {
    id: 94,
    section: "Logical Reasoning",
    passage: logicalPassage2,
    question: "What percentage of established retail chains have NOT adopted UPI?",
    options: {
      A: "45%",
      B: "55%",
      C: "85%",
      D: "15%"
    }
  },
  {
    id: 95,
    section: "Logical Reasoning",
    passage: logicalPassage2,
    question: "The growth rate in rural areas compared to urban areas is:",
    options: {
      A: "One-third",
      B: "Same",
      C: "Three times",
      D: "Half"
    }
  },
  {
    id: 96,
    section: "Logical Reasoning",
    passage: logicalPassage2,
    question: "What percentage of UPI transactions are made by users NOT in the 25-40 age group?",
    options: {
      A: "55%",
      B: "45%",
      C: "8%",
      D: "Cannot be determined"
    }
  }
);

// Logical Passage 3: Women's Digital Empowerment (Q97-102)
const logicalPassage3 = `A nationwide survey on women's digital empowerment revealed significant insights. Among women with smartphones, 75% use them primarily for communication, 45% for education, 30% for business, and 20% for entertainment. In rural areas, women who received digital literacy training showed a 200% increase in income-generating activities compared to those without training. The survey found that households where women manage digital payments save 15% more than those where only men handle finances. Additionally, women entrepreneurs using digital platforms reported 40% higher revenues than those relying on traditional methods. However, the digital gender gap persists, with only 25% of women in rural areas owning smartphones compared to 65% of men.`;

mockTestQuestions.questions.push(
  {
    id: 97,
    section: "Logical Reasoning",
    passage: logicalPassage3,
    question: "According to the survey, what is the primary use of smartphones among women?",
    options: {
      A: "Education",
      B: "Business",
      C: "Communication",
      D: "Entertainment"
    }
  },
  {
    id: 98,
    section: "Logical Reasoning",
    passage: logicalPassage3,
    question: "The impact of digital literacy training on rural women's income-generating activities is:",
    options: {
      A: "50% increase",
      B: "100% increase",
      C: "200% increase",
      D: "No change"
    }
  },
  {
    id: 99,
    section: "Logical Reasoning",
    passage: logicalPassage3,
    question: "If a woman entrepreneur using traditional methods earns ₹10,000, what would be the expected revenue using digital platforms?",
    options: {
      A: "₹12,000",
      B: "₹14,000",
      C: "₹15,000",
      D: "₹20,000"
    }
  },
  {
    id: 100,
    section: "Logical Reasoning",
    passage: logicalPassage3,
    question: "The smartphone ownership gap between rural men and women is:",
    options: {
      A: "25 percentage points",
      B: "40 percentage points",
      C: "65 percentage points",
      D: "90 percentage points"
    }
  },
  {
    id: 101,
    section: "Logical Reasoning",
    passage: logicalPassage3,
    question: "Households where women manage digital payments show savings that are:",
    options: {
      A: "15% less than male-managed households",
      B: "Equal to male-managed households",
      C: "15% more than male-managed households",
      D: "40% more than traditional households"
    }
  },
  {
    id: 102,
    section: "Logical Reasoning",
    passage: logicalPassage3,
    question: "The percentages for smartphone usage (75%, 45%, 30%, 20%) add up to more than 100%, which suggests:",
    options: {
      A: "The survey has errors",
      B: "Women use smartphones for multiple purposes",
      C: "The data is fabricated",
      D: "Only one category should be counted"
    }
  }
);

// Logical Passage 4: AI in Healthcare (Q103-108)
const logicalPassage4 = `Artificial Intelligence adoption in healthcare has shown remarkable results. Hospitals using AI-powered diagnostic tools report 35% faster diagnosis times and 28% improvement in accuracy. The cost of implementation, however, remains a barrier, with initial setup requiring an average investment of ₹50 lakhs. Studies show that for every 100 patients diagnosed using AI assistance, 12 cases of early-stage diseases are detected that might have been missed by conventional methods. Interestingly, patient satisfaction scores increased by 22% in AI-enabled facilities, primarily due to reduced waiting times. Healthcare professionals initially resistant to AI showed 80% acceptance rates after six months of usage, with younger doctors (below 35 years) showing 95% acceptance compared to 65% among senior doctors (above 50 years).`;

mockTestQuestions.questions.push(
  {
    id: 103,
    section: "Logical Reasoning",
    passage: logicalPassage4,
    question: "The primary advantage of AI-powered diagnostic tools mentioned in the passage is:",
    options: {
      A: "Lower cost",
      B: "Faster diagnosis and improved accuracy",
      C: "Complete replacement of doctors",
      D: "Elimination of all medical errors"
    }
  },
  {
    id: 104,
    section: "Logical Reasoning",
    passage: logicalPassage4,
    question: "For every 1,000 patients diagnosed using AI assistance, how many early-stage disease cases would likely be detected that conventional methods might miss?",
    options: {
      A: "12",
      B: "120",
      C: "28",
      D: "35"
    }
  },
  {
    id: 105,
    section: "Logical Reasoning",
    passage: logicalPassage4,
    question: "The acceptance rate gap between younger and senior doctors is:",
    options: {
      A: "15 percentage points",
      B: "20 percentage points",
      C: "30 percentage points",
      D: "35 percentage points"
    }
  },
  {
    id: 106,
    section: "Logical Reasoning",
    passage: logicalPassage4,
    question: "Patient satisfaction improvement in AI-enabled facilities is primarily attributed to:",
    options: {
      A: "Lower treatment costs",
      B: "Better hospital infrastructure",
      C: "Reduced waiting times",
      D: "More experienced doctors"
    }
  },
  {
    id: 107,
    section: "Logical Reasoning",
    passage: logicalPassage4,
    question: "If a hospital typically diagnoses conditions in 100 minutes, with AI tools the expected time would be:",
    options: {
      A: "35 minutes",
      B: "65 minutes",
      C: "72 minutes",
      D: "135 minutes"
    }
  },
  {
    id: 108,
    section: "Logical Reasoning",
    passage: logicalPassage4,
    question: "The 80% acceptance rate after six months suggests that:",
    options: {
      A: "AI is immediately accepted by all",
      B: "Resistance decreases with experience",
      C: "20% will never accept AI",
      D: "AI will be discontinued"
    }
  }
);

// QUANTITATIVE TECHNIQUES (Q109-120)
mockTestQuestions.questions.push(
  {
    id: 109,
    section: "Quantitative Techniques",
    question: "A survey of 50 students shows that 30 students like mathematics, 25 like science, and 15 like both subjects. How many students like neither mathematics nor science?",
    options: {
      A: "5",
      B: "10",
      C: "15",
      D: "20"
    }
  },
  {
    id: 110,
    section: "Quantitative Techniques",
    question: "The price of a commodity increases by 20% every year. If the current price is ₹600, what was the price 2 years ago?",
    options: {
      A: "₹400",
      B: "₹416.67",
      C: "₹480",
      D: "₹500"
    }
  },
  {
    id: 111,
    section: "Quantitative Techniques",
    question: "In a class of 40 students, the average marks in mathematics is 65. If the average marks of boys is 70 and that of girls is 60, find the number of boys in the class.",
    options: {
      A: "15",
      B: "20",
      C: "25",
      D: "30"
    }
  },
  {
    id: 112,
    section: "Quantitative Techniques",
    question: "A train travels the first half of a journey at 60 km/hr and the second half at 40 km/hr. What is the average speed for the entire journey?",
    options: {
      A: "45 km/hr",
      B: "48 km/hr",
      C: "50 km/hr",
      D: "52 km/hr"
    }
  }
);

// Question 113 with pie chart data
mockTestQuestions.questions.push(
  {
    id: 113,
    section: "Quantitative Techniques",
    question: "A pie chart shows the distribution of a company's revenue sources: Products: 45%, Services: 30%, Licensing: 15%, Others: 10%. If the total revenue is ₹80 lakhs, what is the revenue from Services?",
    options: {
      A: "₹20 lakhs",
      B: "₹24 lakhs",
      C: "₹30 lakhs",
      D: "₹36 lakhs"
    }
  },
  {
    id: 114,
    section: "Quantitative Techniques",
    question: "The ratio of the ages of A and B is 4:5. After 5 years, the ratio will be 5:6. What is the present age of A?",
    options: {
      A: "15 years",
      B: "20 years",
      C: "25 years",
      D: "30 years"
    }
  },
  {
    id: 115,
    section: "Quantitative Techniques",
    question: "A shopkeeper marks his goods 40% above the cost price and allows a discount of 20%. What is his profit percentage?",
    options: {
      A: "8%",
      B: "10%",
      C: "12%",
      D: "15%"
    }
  },
  {
    id: 116,
    section: "Quantitative Techniques",
    question: "If the compound interest on a sum for 2 years at 10% per annum is ₹420, what is the simple interest on the same sum for the same period at the same rate?",
    options: {
      A: "₹380",
      B: "₹400",
      C: "₹410",
      D: "₹440"
    }
  }
);

// Data table for Q117-119
const carSalesTable = `
Year | Sedan | SUV | Hatchback
2019 | 250   | 180 | 320
2020 | 280   | 220 | 300
2021 | 300   | 260 | 280
2022 | 320   | 300 | 260
`;

mockTestQuestions.questions.push(
  {
    id: 117,
    section: "Quantitative Techniques",
    question: `Based on the car sales data:
${carSalesTable}
What is the percentage increase in SUV sales from 2019 to 2022?`,
    options: {
      A: "50%",
      B: "60%",
      C: "66.67%",
      D: "70%"
    }
  },
  {
    id: 118,
    section: "Quantitative Techniques",
    question: `From the same car sales data, in which year was the total sales of all three types of cars the highest?`,
    options: {
      A: "2019",
      B: "2020",
      C: "2021",
      D: "2022"
    }
  },
  {
    id: 119,
    section: "Quantitative Techniques",
    question: `What is the average annual sales of Sedans over the four-year period?`,
    options: {
      A: "275",
      B: "287.5",
      C: "290",
      D: "295"
    }
  },
  {
    id: 120,
    section: "Quantitative Techniques",
    question: "A mixture contains milk and water in the ratio 5:3. If 16 liters of water is added to the mixture, the ratio becomes 5:7. What is the quantity of milk in the original mixture?",
    options: {
      A: "15 liters",
      B: "20 liters",
      C: "25 liters",
      D: "30 liters"
    }
  }
);

module.exports = mockTestQuestions;