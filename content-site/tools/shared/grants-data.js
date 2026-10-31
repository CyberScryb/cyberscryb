/* Idaho small business funding dataset — generated 2026-10-31. Canonical source: ~/workspace/grants-dataset/idaho.json */
window.CS_GRANTS = {
  meta: {
    state: 'ID',
    name: 'Idaho Small Business Funding Dataset',
    version: '2026-10-31',
    verified: '2026-10-31',
    count: 43,
    note: 'Every entry verified by opening its URL on 2026-10-31. Deadlines and amounts change; verify on the source page before applying.',
  },
  categories: {
    'state-grant': 'State grants',
    'federal-grant': 'Federal grants',
    'tax-incentive': 'Tax incentives',
    'workforce-training': 'Workforce training funds',
    loan: 'Loans',
    microloan: 'Microloans / CDFI',
    'pitch-competition': 'Pitch competitions',
    'foundation-grant': 'Foundation & corporate grants',
  },
  entries: [
    {
      id: 'tri',
      category: 'tax-incentive',
      name: 'Tax Reimbursement Incentive (TRI)',
      org: 'Idaho Department of Commerce',
      amount: 'Up to 30% credit on new state tax revenues, for up to 15 years',
      deadline: 'rolling',
      eligibility:
        'Businesses adding new full-time jobs paying at/above county average wage (20 jobs rural, 50 urban)',
      url: 'https://commerce.idaho.gov/incentives/tax-incentives/',
      notes:
        'Performance-based, post-performance tax credit for expanding or relocating businesses; requires Economic Advisory Council approval.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'idaho-business-advantage',
      category: 'tax-incentive',
      name: 'Idaho Business Advantage',
      org: 'Idaho Department of Commerce (with Idaho State Tax Commission)',
      amount:
        'Package: 3.75% enhanced investment tax credit, 2.5% real property improvement credit, 25% sales tax rebate, $1,500-$3,000/new job',
      deadline: 'rolling',
      eligibility:
        'Businesses investing at least $500,000 in new facilities and creating 10+ jobs paying $40,000+/yr with benefits',
      url: 'https://commerce.idaho.gov/incentives/tax-incentives/',
      notes:
        'Tax incentive package claimed via Form 89SE; Tax Commission oversees it. Can be used alongside the TRI.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'idaho-opportunity-fund',
      category: 'state-grant',
      name: 'Idaho Opportunity Fund',
      org: 'Idaho Department of Commerce',
      amount: 'Varies (negotiated grants; e.g. recent $400,000 infrastructure award)',
      deadline: 'rolling',
      eligibility:
        "Businesses creating or retaining quality jobs via public infrastructure improvements, awarded at the Commerce Director's discretion",
      url: 'https://commerce.idaho.gov/incentives/tax-incentives/',
      notes:
        'Deal-closing grant fund for public infrastructure (water, power, wastewater, roads) needed to attract or accommodate a facility.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'step-grant',
      category: 'state-grant',
      name: 'State Trade Expansion Program (STEP) Grant',
      org: 'Idaho Department of Commerce (federally funded by SBA)',
      amount: '$2,000-$12,000 per activity; Idaho FY26 STEP award $438,667 total',
      deadline: 'rolling with per-opportunity windows; current grant period through Sept 29, 2027',
      eligibility:
        'Idaho small businesses meeting SBA size standards that export or are exploring new export markets',
      url: 'https://commerce.idaho.gov/business/step/',
      notes:
        'Reimburses trade shows, international marketing, website globalization and trade missions; apply via the Idaho Commerce Grants Portal. Typically 75% of eligible costs.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'rcif',
      category: 'state-grant',
      name: 'Rural Community Investment Fund (RCIF)',
      org: 'Idaho Department of Commerce',
      amount: '$50,000-$500,000 per grant (local match required)',
      deadline: 'Quarterly: third Monday of December, March, June, September (next: Dec 21, 2026)',
      eligibility:
        'Cities under 25,000, counties, and tribes with projects of measurable rural benefit supporting business expansion/job creation',
      url: 'https://commerce.idaho.gov/communities/grants/rural-community-block-grant/',
      notes:
        'State-funded grant for rural infrastructure: streets, water/sewer, utilities, or industrial buildings leased to a business.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'idaho-gem-grant',
      category: 'state-grant',
      name: 'Idaho Gem Grant',
      org: 'Idaho Department of Commerce',
      amount: 'Up to $50,000 per project (matching funds expected)',
      deadline: 'Quarterly: third Monday of June, September, December, March (next: Dec 21, 2026)',
      eligibility:
        'Rural Idaho city, county, or tribal governments (pop. 10,000 or less) applying for economic development projects',
      url: 'https://commerce.idaho.gov/communities/grants/',
      notes:
        'Funds water/sewer infrastructure for new businesses, blight remediation, and assets tied directly to private-sector job creation.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'wdtf-employer-grant',
      category: 'workforce-training',
      name: 'WDTF Employer Grant',
      org: 'Idaho Workforce Development Council',
      amount: 'Varies (reimbursement of training costs; one grant open per employer at a time)',
      deadline: 'rolling; reviewed first-come, first-served',
      eligibility:
        'Idaho employers expanding their workforce or retraining workers for specific economic opportunities',
      url: 'https://wdc.idaho.gov/grants/',
      notes:
        'Reimburses employee training costs (instructor wages, materials, travel); entry-level wages at least $12/hr and health benefits required.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'wdtf-industry-sector-grant',
      category: 'workforce-training',
      name: 'WDTF Industry Sector Grant',
      org: 'Idaho Workforce Development Council',
      amount: 'Varies (consortium must provide 25% cash or 100% in-kind match)',
      deadline: 'annual cycle (see WDC grants page for current timeline)',
      eligibility:
        'Consortium of at least 3 industry partners with shared talent needs, partnered with a training provider',
      url: 'https://wdc.idaho.gov/grants/',
      notes:
        'Funds training solutions for shared workforce gaps; training must lead to transferable, industry-recognized skills and credentials.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'wdtf-apprenticeship-incentive',
      category: 'workforce-training',
      name: 'WDTF Registered Apprenticeship Incentive',
      org: 'Idaho Workforce Development Council',
      amount: 'Up to $1,000 per apprentice per year; max $10,000 per employer per year',
      deadline: 'open through June 30, 2027',
      eligibility:
        'Idaho employers using a USDOL-registered apprenticeship to train new or newly promoted employees',
      url: 'https://wdc.idaho.gov/grants/',
      notes:
        'Offsets extraordinary costs of running a registered apprenticeship; paid after apprentice completes 500+ hours of on-the-job training.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'igem-herc',
      category: 'state-grant',
      name: 'IGEM Initiative (Idaho Global Entrepreneurial Mission) - HERC',
      org: 'Idaho Dept of Commerce via State Board of Education/IGEM-HERC (university-administered)',
      amount:
        '$400,000-$1,000,000 depending on track (Proof of Concept, Initial Startup, Commercialization)',
      deadline:
        'FY2027 pre-proposals were due Oct 27, 2025 - ROUND CLOSED; next cycle not yet posted',
      eligibility:
        'Partnerships between Idaho public research universities (Boise State, ISU, UI) and industry partners',
      url: 'https://www.boisestate.edu/research-osp/2025/09/05/update-idaho-global-entrepreneurial-mission-igem-grant-program/',
      notes:
        'Seed funding for technology commercialization with near-term tech transfer to Idaho industry; private sector must show strong collaboration. FY2027 priorities: biotech, energy, HPC, AI/ML, cybersecurity, semiconductors.',
      status: 'closed',
      state: 'ID',
    },
    {
      id: 'idstf',
      category: 'workforce-training',
      name: 'Industry-Driven Skills Training Fund (IDSTF)',
      org: 'Idaho Department of Labor',
      amount: 'Up to 80% reimbursement of approved training costs, up to $25,000 per employee',
      deadline:
        'rolling (employer applications currently being accepted per March 2026 announcement)',
      eligibility:
        'Idaho employers in advanced manufacturing, domestic mineral production, or nuclear energy training/upskilling workers',
      url: 'http://idahoatwork.com/2026/03/06/businesses-are-encouraged-to-apply-for-skills-training-funds/',
      notes:
        '$8M USDOL grant for SFY26; covers OJT, customized/vendor-led training, specialized skills, certifications. Contact IDSTF@labor.idaho.gov.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'ideal-employer-tax-credit',
      category: 'tax-incentive',
      name: 'Idaho College Savings Program Employer Tax Credit',
      org: 'Idaho State Tax Commission',
      amount: '20% tax credit per employee, capped at $500 per employee per year',
      deadline: 'rolling (claimed on Idaho income tax return)',
      eligibility:
        "Idaho employers contributing to employees' IDeal (Idaho 529) college savings accounts",
      url: 'https://commerce.idaho.gov/incentives/tax-incentives/',
      notes:
        'Employer can contribute as bonus, gift, or match into employee IDeal accounts and claim the credit against Idaho income tax.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'sba-7a',
      category: 'loan',
      name: 'SBA 7(a) Loan Program',
      org: 'U.S. Small Business Administration',
      amount: 'Up to $5,000,000',
      deadline: 'rolling (apply any time through participating lenders)',
      eligibility:
        'For-profit U.S. small businesses meeting SBA size standards, unable to obtain credit elsewhere on reasonable terms',
      url: 'https://www.sba.gov/funding-programs/loans/7a-loans',
      notes:
        "SBA's primary loan program; SBA guarantees a portion to the lender. Covers working capital, equipment, real estate, debt refinance, ownership changes.",
      status: 'open',
      state: 'ID',
    },
    {
      id: 'sba-504',
      category: 'loan',
      name: 'SBA 504 Loan Program',
      org: 'U.S. Small Business Administration',
      amount:
        'Up to $5.5 million (SBA-backed debenture); typical split 50% bank / 40% CDC / 10% borrower',
      deadline: 'rolling (apply any time through a Certified Development Company)',
      eligibility:
        'For-profit U.S. small businesses purchasing major fixed assets; owner must occupy at least 51% of financed real estate',
      url: 'https://www.sba.gov/loans/504-loans/',
      notes:
        'Long-term, fixed-rate financing for commercial real estate and long-life machinery/equipment. Cannot be used for working capital or inventory. 10/20/25-year terms.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'sba-microloan',
      category: 'microloan',
      name: 'SBA Microloan Program',
      org: 'U.S. Small Business Administration',
      amount: 'Up to $50,000 (average ~$13,000)',
      deadline: 'rolling (apply any time through SBA-approved nonprofit intermediary lenders)',
      eligibility:
        'Startups and small businesses needing under $50k; cannot be used for existing debt or real estate',
      url: 'https://www.sba.gov/funding-programs/loans/microloans',
      notes:
        'Delivered through community-based nonprofit intermediaries that also provide technical assistance. Max repayment term 7 years; rates generally 8-13%.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'sba-community-advantage',
      category: 'loan',
      name: 'SBA Community Advantage (CA SBLC) Loans',
      org: 'U.S. Small Business Administration',
      amount: 'Up to $500,000 per loan',
      deadline: 'rolling (apply any time through a Community Advantage lender)',
      eligibility:
        'Small businesses in underserved markets: rural areas, LMI communities, HUBZones, Opportunity Zones, businesses under 2 years old, or veteran-owned',
      url: 'https://legacy.sba.gov/document/support-community-advantage-small-business-lending-companies-ca-sblcs',
      notes:
        '7(a)-guaranteed loans via mission-oriented nonprofit lenders. Strong fit for rural Idaho businesses that struggle with conventional banks.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'sbir-sttr',
      category: 'federal-grant',
      name: "SBIR/STTR (America's Seed Fund)",
      org: 'SBA-coordinated; funded by 11 federal agencies (DoD, NIH, NSF, DOE, etc.)',
      amount: 'Phase I up to $335,937; Phase II up to $2,239,578 (as of Oct 16, 2026)',
      deadline: 'rolling - deadlines vary by agency solicitation/topic; check sbir.gov topics',
      eligibility:
        'U.S.-owned for-profit small businesses with fewer than 500 employees doing R&D; STTR requires a nonprofit research-institution partner',
      url: 'https://www.sbir.gov/about',
      notes:
        'Non-dilutive grants/contracts for early-stage R&D; business keeps IP and equity. Three phases from feasibility to commercialization.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'rbdg',
      category: 'federal-grant',
      name: 'Rural Business Development Grants (RBDG)',
      org: 'USDA Rural Development',
      amount: 'Generally $10,000-$500,000; FY2026 made $27.7M available nationally',
      deadline:
        'CLOSED for FY2026 (June 15/30, 2026); annual cycle - watch for FY2027 notice, typically published in fall',
      eligibility:
        'Public bodies, federally recognized tribes, and nonprofits serving rural areas - for-profit businesses CANNOT apply directly',
      url: 'https://www.rd.usda.gov/programs-services/business-programs/rural-business-development-grants',
      notes:
        'Funds technical assistance, feasibility studies, revolving loan funds, and enterprise development benefiting small rural businesses (<50 employees, <$1M revenue) in towns under 50,000. Idaho businesses benefit via grantee intermediaries.',
      status: 'closed',
      state: 'ID',
    },
    {
      id: 'bi-guaranteed-loans',
      category: 'loan',
      name: 'Business & Industry (B&I) Guaranteed Loans',
      org: 'USDA Rural Development',
      amount:
        'No fixed cap; FY2026 guarantee 85% for loans under $5M, 80% for $5M+; 3% upfront fee',
      deadline:
        'rolling - applications accepted year-round from lenders through local USDA offices',
      eligibility:
        'For-profit/nonprofit businesses, co-ops, tribes, and individuals in rural areas (towns under 50,000); borrower works through a commercial lender',
      url: 'https://www.rd.usda.gov/programs-services/business-programs/business-and-industry-guaranteed-loan',
      notes:
        'Loan guarantee to commercial lenders for rural business expansion, equipment, land/buildings, and debt refinance that improves cash flow. Terms up to 40 years. Highly relevant across rural Idaho.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'reap-grants',
      category: 'federal-grant',
      name: 'Rural Energy for America Program (REAP) Grants',
      org: 'USDA Rural Development',
      amount:
        'Up to $500,000 (renewable energy systems) or $250,000 (energy efficiency); max 25% of project costs',
      deadline:
        'Annual notice cycle; major rule change effective Oct 16, 2026 - grants now only for projects already built and operating 12+ months (apply after completion)',
      eligibility:
        'Existing rural ag producers and rural small businesses (not startups) with completed renewable energy or efficiency projects',
      url: 'https://www.rd.usda.gov/programs-services/energy-programs/rural-energy-america-program-renewable-energy-systems-energy-efficiency-improvement-grants',
      notes:
        'Reimburses installed renewable energy systems (solar, wind, biomass, geothermal) and efficiency upgrades. FY2026 funding notice was rescinded April 2026; program reopened under new post-completion rule.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'reap-guaranteed-loans',
      category: 'loan',
      name: 'Rural Energy for America Program (REAP) Guaranteed Loans',
      org: 'USDA Rural Development',
      amount:
        'Guarantees on loans up to 75% of eligible project costs (loans up to $25M); guarantee up to 80%',
      deadline: 'rolling - applications accepted year-round at local USDA offices',
      eligibility: 'Rural small businesses and ag producers in areas of 50,000 or fewer residents',
      url: 'https://www.rd.usda.gov/programs-services/energy-programs/rural-energy-america-program-renewable-energy-systems-energy-efficiency-improvement-guaranteed-loans',
      notes:
        'Loan guarantees through commercial lenders for renewable energy and efficiency projects; can be combined with REAP grants up to 75% of total project costs. 1% guarantee fee.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'vapg',
      category: 'federal-grant',
      name: 'Value-Added Producer Grants (VAPG)',
      org: 'USDA Rural Development',
      amount:
        'Planning grants up to $50,000; working capital grants up to $200,000; 1:1 match required; ~$25M nationally',
      deadline: 'CLOSED for FY2026 (Feb 17 - April 22, 2026); annual cycle, typically January-May',
      eligibility:
        'Independent ag producers, producer groups, farmer/rancher co-ops, majority producer-owned ventures that own >50% of the raw commodity',
      url: 'https://www.rd.usda.gov/programs-services/business-programs/value-added-producer-grants',
      notes:
        'Helps producers process and market value-added products (e.g., farm-to-retail food brands). Priority for beginning, veteran, and socially disadvantaged producers; 10% of funds reserved.',
      status: 'closed',
      state: 'ID',
    },
    {
      id: 'eda-public-works',
      category: 'federal-grant',
      name: 'EDA Public Works and Economic Adjustment Assistance',
      org: 'U.S. Economic Development Administration (Dept. of Commerce)',
      amount: 'Planning grants typically $150k-$650k; construction $200k-$3M+',
      deadline:
        'rolling - no deadlines; applications accepted until NOFO canceled or funds exhausted',
      eligibility:
        'Units of government, tribes, nonprofits, higher education in economically distressed regions - for-profit businesses CANNOT apply directly',
      url: 'https://www.eda.gov/funding/funding-opportunities',
      notes:
        'Funds infrastructure, strategy, and revolving loan funds (which then lend to local small businesses). Idaho businesses benefit indirectly via EDA-funded RLFs and incubators.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'bew-main-pitch',
      category: 'pitch-competition',
      name: 'Boise Entrepreneur Week Main Pitch Competition',
      org: 'Boise Entrepreneur Week (a Trailhead event)',
      amount: '$50,000 grand prize',
      deadline: 'Annual cycle (next round ~2027; 2026 final was Oct 1, 2026)',
      eligibility: 'Early-stage Idaho startups; semifinal applications in summer',
      url: 'https://boiseentrepreneurweek.org/pitch-competitions/',
      notes:
        "Idaho's largest pitch competition; 2026 grand prize went to Sonura Care. Six finalists from 43 applicants in 2026, plus sponsored awards.",
      status: 'open',
      state: 'ID',
    },
    {
      id: 'bew-trailmix',
      category: 'pitch-competition',
      name: 'Trailmix Pitch Competition',
      org: 'Boise Entrepreneur Week (presented by Albertsons)',
      amount: '$25,000 total ($20,000 grand prize)',
      deadline: 'Annual cycle (2026 round held Sept 28 - Oct 2, 2026)',
      eligibility: 'Idaho food and beverage startups',
      url: 'https://boiseentrepreneurweek.org/pitch-competitions/',
      notes:
        'Helps food/bev founders go from farmers market to supermarket; grand winner gets shelf space at Albertsons/Boise Co-op. 2026 winner: Delo Pop.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'bew-military-pitch',
      category: 'pitch-competition',
      name: 'Military Pitch Competition',
      org: 'Boise Entrepreneur Week + Veteran Entrepreneur Alliance (funded by Mission43)',
      amount: '$10,000 in total prizes',
      deadline: 'Annual cycle (2026 round held Sept 29, 2026)',
      eligibility: 'Veteran and military-connected entrepreneurs in Idaho',
      url: 'https://boiseentrepreneurweek.org/pitch-competitions/',
      notes:
        'Military track of Boise Entrepreneur Week with networking, panel, and pitch. 2026 first place: DNA Innovations.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'startup-world-cup-boise',
      category: 'pitch-competition',
      name: 'Startup World Cup Boise Regional Qualifier',
      org: 'Trailhead Boise (presented by Alturas Capital)',
      amount: 'Path to $1,000,000 investment prize at San Francisco Grand Finale',
      deadline: 'Annual cycle (2026 regional qualifier held May 21, 2026)',
      eligibility: 'Idaho founders/startups; 10 regional finalists pitch live',
      url: 'https://trailheadboise.org/startup-world-cup-regional-qualifier/',
      notes:
        "Idaho's official delegate slot to the global Startup World Cup. Idaho track record is strong: top-10 global finish in 2024.",
      status: 'open',
      state: 'ID',
    },
    {
      id: 'impact-pitch',
      category: 'pitch-competition',
      name: 'IMPACT Pitch',
      org: 'Business Impact NW (nonprofit CDFI)',
      amount: '$10,000 per category winner (Startup/Idea, Early, Established)',
      deadline: 'Annual cycle (2026 applications closed June 1, 2026; final Oct 1, 2026)',
      eligibility: 'Small businesses in Alaska, Idaho, Oregon, Washington with community impact',
      url: 'https://businessimpactnw.org/annual-events/impact-pitch/overview/',
      notes:
        'Multi-round competition with assigned business coach; 2026 had 200+ applicants and $46K total prizes. Idaho finalists included Boise and Idaho Falls businesses.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'idaho-entrepreneur-challenge',
      category: 'pitch-competition',
      name: 'Idaho Entrepreneur Challenge',
      org: 'Boise State Venture College (prize money underwritten by Zions Bank)',
      amount: '$100,000 prize pool (first place ~$15,300 per track)',
      deadline: 'Next event April 8-9, 2027; applications due February 23, 2027',
      eligibility: 'Student teams from Idaho colleges/universities (students only)',
      url: 'https://www.boisestate.edu/venturecollege/pitch-competitions/',
      notes:
        "Idaho's largest collegiate pitch competition; winners get funding plus a golden ticket to Boise Entrepreneur Week. 2027 cycle is currently open for applications.",
      status: 'open',
      state: 'ID',
    },
    {
      id: 'verizon-digital-ready',
      category: 'foundation-grant',
      name: 'Verizon Small Business Digital Ready Grants',
      org: 'Verizon (administered by nonprofit LISC)',
      amount: '$10,000 per grant (10 awarded each month)',
      deadline:
        'Rolling monthly through December 2026; complete 2 free courses by Dec 7, 2026 to unlock application',
      eligibility:
        'U.S. for-profit small businesses, owner 18+; free program, no Verizon commitment',
      url: 'https://digitalready.verizonwireless.com/',
      notes:
        "Official page states 'Applications for our 2026 $10,000 grants are now open.' 1,500+ businesses funded since 2021. Currently the most accessible live grant.",
      status: 'open',
      state: 'ID',
    },
    {
      id: 'forever-idaho',
      category: 'foundation-grant',
      name: 'Forever Idaho Grant Program',
      org: 'Idaho Community Foundation',
      amount: 'Up to $25,000 (most grants $3,000-$8,000)',
      deadline:
        'Annual regional cycles (2026 deadlines: June 15 North/East, August 15 Southwest/South Central)',
      eligibility: '501(c)(3) nonprofits and government entities in Idaho only',
      url: 'https://www.idahocf.org/docs/grants/2026-Forever-Idaho-Grant-Guidelines.pdf',
      notes:
        "'Bolstering support for entrepreneurs and small business owners' is a named impact area, but only nonprofit/community entities can apply, not for-profit businesses.",
      status: 'open',
      state: 'ID',
    },
    {
      id: 'hiring-our-heroes',
      category: 'foundation-grant',
      name: 'Hiring Our Heroes Small Business Grant Program',
      org: "U.S. Chamber of Commerce Foundation (support from FedEx Founder's Fund)",
      amount: '$25,000 grand prize + four $10,000 grants',
      deadline: 'December 15, 2026',
      eligibility:
        'For-profit businesses 51%+ veteran/Guard/Reserve/military-spouse owned, 3-20 employees, under $5M revenue, in vulnerable community or hardship',
      url: 'https://www.hiringourheroes.org/small-business-grant/',
      notes:
        'The current FedEx-backed small business grant (the old FedEx Small Business Grant Contest ran 2012-2024 and is retired). Winners notified by March 29, 2027.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'hello-alice',
      category: 'foundation-grant',
      name: 'Hello Alice Grant Hub',
      org: 'Hello Alice (corporate-sponsored partner rounds)',
      amount: 'Varies by round ($10,000-$50,000 in recent rounds)',
      deadline: 'Periodic rounds; 2026 Pilot Small Business Growth Fund closed March 31, 2026',
      eligibility:
        'U.S. for-profit small businesses (one free profile matches against every open round)',
      url: 'https://helloalice.com/grants/',
      notes:
        'Rotating catalogue of corporate grants ($67.5M+ distributed). No open round listed as of Oct 29, 2026; the free profile alerts you to the next one.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'mofi-loans',
      category: 'microloan',
      name: 'Small Business Loans',
      org: 'MoFi (formerly Montana & Idaho CDC) - certified nonprofit CDFI',
      amount: '$1,000 - $1,500,000',
      deadline: 'rolling',
      eligibility:
        'Idaho (plus MT, WY, UT, OR, WA) businesses denied bank/credit-union financing; free business consulting bundled',
      url: 'https://www.mofi.org',
      notes:
        'SBA Microloan and Community Advantage intermediary; partners with 126 bank/credit union systems. Also runs New Markets Tax Credit lending.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'eo-microlending',
      category: 'microloan',
      name: 'EO Microlending',
      org: 'Economic Opportunity by Jannus (Boise)',
      amount: 'Varies (SBA microlender; term up to 6 years)',
      deadline: 'rolling',
      eligibility:
        "Underserved Idahoans statewide - startups/expanders who don't meet bank credit criteria, incl. refugees and immigrants",
      url: 'https://eojannus.org',
      notes:
        'SBA Microloan program lender offering microloans for working capital, inventory, supplies, equipment, and high-rate business debt payoff, paired with one-on-one coaching.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'isbrlf',
      category: 'loan',
      name: 'Idaho Small Business Revolving Loan Fund (ISBRLF)',
      org: 'Idaho SBDC (Capital Access Team) via 5 economic development districts',
      amount: '$25,000 - $750,000 (companion loans, ~28% avg of financing package)',
      deadline: 'rolling',
      eligibility:
        'Idaho small businesses, esp. very small (<=10 employees) and socially/economically disadvantaged (SEDI) businesses; works alongside bank/credit-union financing',
      url: 'https://idahosbdc.org/capital-access-about-ssbci/',
      notes:
        '$26M Idaho SSBCI tranche for working capital, equipment, and real estate. Cannabis, passive real estate, gaming, and refi uses excluded.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'csp-2',
      category: 'loan',
      name: 'Idaho Collateral Support Program (CSP 2.0)',
      org: 'Idaho Housing and Finance Association (IHFA)',
      amount: "Pledged cash deposits covering up to 20% of a loan's collateral shortfall",
      deadline: 'rolling',
      eligibility:
        'Idaho for-profit businesses with <=100 employees that lack sufficient collateral; apply via a participating bank/lender',
      url: 'https://www.idahohousing.com/partners/project-financing/collateral-support-program/',
      notes:
        "$39.7M Idaho SSBCI tranche; IHFA deposits cash with the lender to unlock financing the borrower otherwise couldn't get. Deposit recycles to other borrowers at maturity.",
      status: 'open',
      state: 'ID',
    },
    {
      id: 'pac-loans',
      category: 'loan',
      name: 'SBA 504 Loans + Revolving Loan Funds',
      org: 'Panhandle Area Council (Hayden)',
      amount: 'Varies',
      deadline: 'rolling',
      eligibility:
        'Small businesses in northern Idaho (Kootenai, Bonner, Boundary, Benewah, Shoshone counties region)',
      url: 'https://pacidaho.org/',
      notes:
        'EDD operating since 1972; administers SBA 504 loans and its own RLF gap financing, plus startup office/industrial bay space via its Innovation Space.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'ceda-finance',
      category: 'loan',
      name: 'Business Development & Finance Loan Programs',
      org: 'Clearwater Economic Development Association (Lewiston)',
      amount: '$5,000 - $1.5M',
      deadline: 'rolling',
      eligibility:
        'Startups/expansions in north central Idaho (Clearwater, Latah, Lewis, Idaho, Nez Perce counties) and southeast Washington',
      url: 'https://clearwater-eda.org/business-development-finance/',
      notes:
        '$5M in loan capital across multiple RLFs (EDA, USDA Intermediary Relending, USDA Rural Microentrepreneur, Idaho SSBCI) with local decisions and flexible structures.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'ceda-rise',
      category: 'microloan',
      name: 'RISE - Revitalization Investment for Small Enterprises',
      org: 'Clearwater Economic Development Association (Lewiston)',
      amount: '$2,000 - $20,000 (owner match of ~50% of loan amount required)',
      deadline: 'rolling',
      eligibility:
        'Small businesses and nonprofits in north central Idaho that own or lease their commercial property',
      url: 'https://clearwater-eda.org/rise/',
      notes:
        'Unsecured microloans at 2 points below WSJ Prime, 2-5 year terms, $150 closing fee, no prepayment penalty, for storefront improvements (signage, windows, lighting, security).',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'sicog-rlf',
      category: 'loan',
      name: 'Revolving Loan Program for Southeast Idaho',
      org: 'Southeast Idaho Council of Governments (Pocatello)',
      amount: 'Up to $250,000; microloans up to $10,000',
      deadline: 'rolling',
      eligibility:
        'For-profit small businesses in Bannock, Bear Lake, Bingham, Caribou, Franklin, Oneida, and Power counties; 10% equity, 1:1 collateral',
      url: 'https://sicog.org/revolving-loan-program/',
      notes:
        'EDA/USDA-capitalized RLF, often alongside bank financing, for real estate, equipment, inventory, and working capital. Funds startups; does not refinance existing debt.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'rda-microloan',
      category: 'microloan',
      name: 'Microloan Program',
      org: 'Regional Development Alliance (RDA, Idaho Falls region)',
      amount: 'Up to $50,000 (one round of financing per business)',
      deadline: 'rolling',
      eligibility:
        'New/startup businesses in Bannock, Bingham, Bonneville, Butte, Custer, Jefferson, or Madison counties',
      url: 'http://rdaidaho.org/funds/microloans/',
      notes:
        'Fast, simplified startup financing; RDA also runs a Regional Investment Fund, Entrepreneur Fund, and Rural Retail Loan Fund for the same 7-county region.',
      status: 'open',
      state: 'ID',
    },
    {
      id: 'atni-edc',
      category: 'loan',
      name: 'Native Business Financing',
      org: 'Affiliated Tribes of Northwest Indians Economic Development Corporation (ATNI-EDC) - Native CDFI',
      amount: '$25,000 - $500,000',
      deadline: 'rolling',
      eligibility:
        'Native entrepreneurs and small businesses across the 57 ATNI member tribes, including Idaho tribes (works with imperfect credit/limited collateral)',
      url: 'http://atniedc.com/rlf/ssbci/',
      notes:
        'Loans for startups, acquisitions, working capital, equipment, commercial real estate, tribal projects, and farming/fishing/timber; TA and business-plan matching included.',
      status: 'open',
      state: 'ID',
    },
  ],
};
