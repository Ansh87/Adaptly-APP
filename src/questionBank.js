// ============================================================
// SATGene Original Question Bank (Phase 2)
// ------------------------------------------------------------
// Every question, passage, and answer choice below is written by SATGene —
// none of it is copied, paraphrased, or adapted from College Board, Khan
// Academy, Bluebook, or any paid vendor. This bank exists ONLY to power the
// agent's adaptive practice loop and the Socratic tutor; it is intentionally
// small and will keep growing. It mirrors the *style* of the digital SAT
// (short stimulus + single-answer multiple choice, three difficulty bands)
// without reproducing any real test content.
//
// Schema per question:
//   id            unique string
//   section       "Reading & Writing" | "Math"  (must match SKILLS/AGENT_TAXONOMY)
//   skill         one of the 8 canonical skill names
//   difficulty    "easy" | "medium" | "hard"
//   passage       optional stimulus text (Reading & Writing only)
//   prompt        the question stem
//   choices       array of 4 answer strings
//   correctIndex  0-3
//   hints         exactly 4 strings, least → most revealing (Socratic ladder)
//   explanation   full worked explanation — the Instant (no-AI) fallback for "Explain"
// ============================================================

export const DIFFICULTIES = ["easy", "medium", "hard"];

export const QUESTION_BANK = {
  // ---------------- READING & WRITING ----------------
  "Information and Ideas": {
    easy: [
      {
        id: "ii-e-1",
        section: "Reading & Writing",
        skill: "Information and Ideas",
        difficulty: "easy",
        passage:
          "A community garden in Millbrook started with six raised beds in 2019. By 2023, volunteers had built thirty-one beds, and the waiting list for a plot had grown to over one hundred families.",
        prompt: "Which choice best states the main idea of the text?",
        choices: [
          "Millbrook's community garden has grown substantially and is now in high demand.",
          "Millbrook built its first raised bed in 2019.",
          "Waiting lists are a common problem for community gardens.",
          "Volunteers in Millbrook prefer raised beds to in-ground plots.",
        ],
        correctIndex: 0,
        hints: [
          "Look for the sentence(s) that summarize the whole passage rather than a single detail.",
          "The passage gives two numbers — beds and waiting-list families. What do both numbers show together?",
          "Both details (31 beds, 100+ families waiting) support one bigger claim about growth and demand.",
          "The correct choice must cover BOTH the growth in beds AND the demand (waiting list) — not just one.",
        ],
        explanation:
          "The passage's two facts (six beds growing to thirty-one, and a waiting list of over one hundred families) both support the idea that the garden grew a lot and is now in high demand — that's choice A. B and D restate single details, not the main idea. C is an assumption not stated in the text.",
      },
      {
        id: "ii-e-2",
        section: "Reading & Writing",
        skill: "Information and Ideas",
        difficulty: "easy",
        passage:
          "Marine biologist Elena Ruiz spent three summers tagging sea turtles along the same fifty-mile stretch of coastline. Of the 140 turtles she tagged, 118 were later spotted nesting within two miles of their original tagging site.",
        prompt: "The data in the text most strongly supports which conclusion?",
        choices: [
          "Most of the tagged turtles returned to nest very close to where they were originally tagged.",
          "Sea turtles cannot nest more than two miles from their birthplace.",
          "Ruiz tagged more turtles than any other researcher.",
          "The fifty-mile coastline is the only place turtles nest.",
        ],
        correctIndex: 0,
        hints: [
          "Focus on the ratio given: 118 out of 140. Is that most, or only some?",
          "118/140 is roughly 84% — a strong majority.",
          "The conclusion should stick close to what the data actually shows, not go beyond it.",
          "Choices B, C, and D all claim more than the data proves. Only one choice matches the 84% figure without overreaching.",
        ],
        explanation:
          "118 of 140 turtles (about 84%) nested within two miles of their tagging site — a strong majority returning close to the original spot. That directly supports A. B, C, and D all overstate or misstate what the data shows.",
      },
    ],
    medium: [
      {
        id: "ii-m-1",
        section: "Reading & Writing",
        skill: "Information and Ideas",
        difficulty: "medium",
        passage:
          "Economists once assumed that raising the minimum wage in a given city would reduce entry-level hiring there. But a 2021 study comparing bordering counties with different minimum wages found nearly identical job-growth rates on both sides of the border, complicating the simple supply-and-demand story.",
        prompt:
          "Which finding, if true, would most directly weaken the study's implied challenge to the traditional economic assumption?",
        choices: [
          "The counties studied had very different costs of living before the minimum wage change.",
          "Job growth on the higher-wage side of the border was measured using a different method that overcounted new jobs.",
          "Both counties saw overall population growth during the study period.",
          "Most minimum-wage workers in both counties worked in retail.",
        ],
        correctIndex: 1,
        hints: [
          "The study's challenge rests on the claim that job growth was 'nearly identical' on both sides.",
          "To weaken that challenge, you need something that undermines the reliability of the comparison itself.",
          "If the two sides weren't actually measured the same way, the 'nearly identical' finding could be an illusion.",
          "Choice B directly attacks the comparability of the job-growth numbers between the two counties — that's what undermines the finding.",
        ],
        explanation:
          "The study's argument depends on the job-growth numbers on both sides being genuinely comparable. If the higher-wage side's numbers were inflated by a flawed measurement method, the 'nearly identical' result is unreliable, weakening the challenge to the traditional assumption. A, C, and D don't attack the comparison itself.",
      },
      {
        id: "ii-m-2",
        section: "Reading & Writing",
        skill: "Information and Ideas",
        difficulty: "medium",
        passage:
          "A city planner proposed converting a downtown parking lot into a public plaza, citing a nearby city's plaza that increased foot traffic to local shops by 40 percent. Critics note that the nearby city's plaza sits next to a major transit hub, while the downtown lot in question does not.",
        prompt:
          "The critics' response mainly serves to do which of the following?",
        choices: [
          "Prove that public plazas never increase foot traffic to nearby shops.",
          "Suggest that the two situations may not be similar enough for the same result to be expected.",
          "Argue that transit hubs are more valuable than public plazas.",
          "Show that the planner's data about the 40 percent increase was fabricated.",
        ],
        correctIndex: 1,
        hints: [
          "Critics are pointing out a difference between the two locations — what's the effect of that difference?",
          "They're not disputing the 40 percent figure itself, just whether it applies here.",
          "This is a classic 'is the comparison valid' move — a key condition (transit hub access) differs between the cases.",
          "The critics are casting doubt on whether the plaza's success would transfer to a site without the transit hub — that's a comparability challenge, not a denial or an accusation of fraud.",
        ],
        explanation:
          "The critics aren't denying the 40 percent statistic or calling it fake (ruling out D) or claiming plazas never work (ruling out A) or ranking transit vs. plazas (ruling out C). They're pointing to a key difference — transit access — that could make the comparison invalid, i.e., questioning whether the same result would happen downtown. That's B.",
      },
    ],
    hard: [
      {
        id: "ii-h-1",
        section: "Reading & Writing",
        skill: "Information and Ideas",
        difficulty: "hard",
        passage:
          "In a longitudinal study, researchers tracked 2,000 students from age 10 to age 25, correlating hours of unstructured outdoor play in childhood with self-reported life satisfaction in adulthood. The correlation was positive but modest (r = 0.21), and the researchers noted that families who prioritized outdoor play also tended to have higher household incomes and more flexible work schedules.",
        prompt:
          "Which statement best captures a limitation the researchers themselves seem to acknowledge?",
        choices: [
          "The correlation might partly reflect income and scheduling advantages rather than outdoor play itself.",
          "Life satisfaction cannot be measured through self-report surveys.",
          "The study proves outdoor play has no effect on adult well-being.",
          "A correlation of 0.21 means the two variables are unrelated.",
        ],
        correctIndex: 0,
        hints: [
          "Look at what the researchers mention alongside the correlation — income and flexible schedules.",
          "Why would mentioning those confounding factors matter for interpreting the r = 0.21 result?",
          "A modest correlation plus a noted confound is a classic signal: 'correlation isn't necessarily causation here.'",
          "The researchers are flagging that a third factor (income/scheduling) could explain part or all of the outdoor-play/satisfaction link — that's a confound, described in choice A.",
        ],
        explanation:
          "By noting that outdoor-play families also had higher income and more flexible schedules, the researchers are flagging a possible confounding variable — the correlation might be driven by socioeconomic advantage rather than play itself. That's A. C misreads 'modest positive correlation' as 'no effect,' D misinterprets what r = 0.21 means, and B is an unsupported overgeneralization.",
      },
      {
        id: "ii-h-2",
        section: "Reading & Writing",
        skill: "Information and Ideas",
        difficulty: "hard",
        passage:
          "A pharmaceutical trial found that a new drug reduced migraine frequency by 35 percent compared to placebo among the 400 participants who completed the full 12-week trial. However, of the 550 participants originally enrolled, 150 dropped out — disproportionately from the treatment group, where many cited side effects.",
        prompt:
          "Which choice best explains why the reported 35 percent figure might overstate the drug's real-world effectiveness?",
        choices: [
          "Participants who tolerated the drug well enough to finish the trial were more likely to remain in the treatment group, skewing the completer sample toward responders.",
          "A 12-week trial is too short to measure migraine frequency accurately.",
          "Placebo groups always outperform treatment groups in medical trials.",
          "400 participants is too small a sample to draw any conclusion.",
        ],
        correctIndex: 0,
        hints: [
          "Focus on WHO dropped out and WHY — disproportionately from the treatment group, citing side effects.",
          "If people who reacted badly left the treatment group, who's left in the 'completers' being measured?",
          "This is a survivorship-style bias: the remaining treatment-group completers may not represent everyone who started the drug.",
          "Because dropouts skewed toward the treatment group's side-effect sufferers, the 400 'completers' analyzed over-represent people who tolerated the drug well — inflating the apparent benefit. That's choice A.",
        ],
        explanation:
          "The disproportionate treatment-group dropout (due to side effects) means the 400 completers analyzed are not representative of everyone who started the drug — people who couldn't tolerate it left, leaving a rosier-looking sample. That's a form of survivorship bias, captured in A. B, C, and D are either false claims or irrelevant to this specific bias.",
      },
    ],
  },

  "Craft and Structure": {
    easy: [
      {
        id: "cs-e-1",
        section: "Reading & Writing",
        skill: "Craft and Structure",
        difficulty: "easy",
        passage:
          "The old lighthouse had watched over the harbor for a century, its light sweeping the water each night like a patient hand smoothing a wrinkled blanket.",
        prompt: "The comparison in the sentence mainly serves to emphasize the light's",
        choices: ["gentle, steady quality", "extreme brightness", "unreliable schedule", "great age"],
        correctIndex: 0,
        hints: [
          "What image does 'a patient hand smoothing a wrinkled blanket' create?",
          "Patient and smoothing both suggest a calm, careful motion — not speed or harshness.",
          "The simile isn't about how old or bright the light is — it's about the way it moves.",
          "'Patient' and 'smoothing' both point to gentleness and steadiness, which is choice A.",
        ],
        explanation:
          "The simile compares the light's sweep to a patient hand smoothing a blanket — gentle, careful, repetitive. That emphasizes steadiness and gentleness (A), not brightness, unreliability, or age.",
      },
      {
        id: "cs-e-2",
        section: "Reading & Writing",
        skill: "Craft and Structure",
        difficulty: "easy",
        passage:
          "In casual conversation, chemists often call the compound 'salt.' In a lab report, however, they must write its precise name: sodium chloride.",
        prompt: "As used in the text, the word \"precise\" most nearly means",
        choices: ["exact", "friendly", "outdated", "confusing"],
        correctIndex: 0,
        hints: [
          "The sentence contrasts casual language ('salt') with something used in formal writing.",
          "What quality would a lab report need that a casual nickname doesn't have?",
          "Lab reports need accuracy and specificity, not friendliness or confusion.",
          "'Precise name' means the exact, scientifically specific name — that's 'exact,' choice A.",
        ],
        explanation:
          "The contrast is between a casual nickname ('salt') and the formal, scientifically accurate term. 'Precise' here means exact/specific — choice A.",
      },
    ],
    medium: [
      {
        id: "cs-m-1",
        section: "Reading & Writing",
        skill: "Craft and Structure",
        difficulty: "medium",
        passage:
          "Text 1: Urban beekeeping should be encouraged in every city; bees pollinate community gardens and the honey yields are a welcome bonus. Text 2: Urban beekeeping sounds appealing, but untrained hobbyists often keep hives too close to sidewalks, and the resulting stings-per-year in some neighborhoods have risen sharply since backyard hives became popular.",
        prompt:
          "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1 that urban beekeeping 'should be encouraged in every city'?",
        choices: [
          "By agreeing completely, since both texts focus on the benefits of pollination.",
          "By suggesting that encouragement should come with training or placement requirements to address safety concerns.",
          "By arguing that honey production is not valuable enough to justify beekeeping.",
          "By claiming that bees provide no real benefit to community gardens.",
        ],
        correctIndex: 1,
        hints: [
          "Text 2 doesn't reject beekeeping outright — it raises a specific concern (untrained hobbyists, hive placement).",
          "What would a reasonable response to that concern look like — banning bees entirely, or something more moderate?",
          "Text 2's problem is about HOW beekeeping is done (untrained, poor placement), not whether it should happen at all.",
          "The most consistent response given Text 2's actual complaint is to encourage beekeeping WITH safeguards, matching choice B.",
        ],
        explanation:
          "Text 2's concern is specifically about untrained hobbyists placing hives unsafely — not a blanket objection to beekeeping. The most consistent response is to support beekeeping but add training or placement rules, which is B. A ignores Text 2's concern; C and D misstate Text 2's actual argument.",
      },
      {
        id: "cs-m-2",
        section: "Reading & Writing",
        skill: "Craft and Structure",
        difficulty: "medium",
        passage:
          "The novel's first chapter unfolds entirely in a single unbroken paragraph, mirroring the protagonist's racing, uninterruptible thoughts on the night before her exam.",
        prompt: "The structural choice described in the text primarily serves to",
        choices: [
          "reflect the character's mental state through the form of the writing itself",
          "make the chapter easier to skim quickly",
          "hide important plot details from the reader",
          "shorten the overall length of the novel",
        ],
        correctIndex: 0,
        hints: [
          "Notice the word 'mirroring' — what is the paragraph structure mirroring?",
          "An unbroken paragraph and 'racing, uninterruptible thoughts' — is that a coincidence?",
          "This is a form-mirrors-content technique: how the text looks reflects what's happening in the character's mind.",
          "The single unbroken paragraph formally mirrors the character's racing, nonstop thoughts — that's choice A.",
        ],
        explanation:
          "The passage explicitly says the paragraph structure 'mirrors' the protagonist's racing thoughts — a form-reflects-content technique. That's A; the other choices aren't supported by the text.",
      },
    ],
    hard: [
      {
        id: "cs-h-1",
        section: "Reading & Writing",
        skill: "Craft and Structure",
        difficulty: "hard",
        passage:
          "Text 1: A historian argues that the fall of the ancient trading city was caused primarily by a decade-long drought that crippled its agricultural hinterland. Text 2: A different historian, examining the same archaeological record, contends that shifting trade routes — as neighboring powers built new roads bypassing the city — were the decisive factor, noting that drought-affected cities elsewhere survived by importing grain via those very trade routes.",
        prompt:
          "Which choice best describes how Text 2 relates to Text 1?",
        choices: [
          "Text 2 dismisses the drought entirely as irrelevant to the city's decline.",
          "Text 2 proposes an alternative primary cause while implicitly questioning whether the drought alone (absent lost trade access) would have been fatal.",
          "Text 2 confirms Text 1's argument using additional archaeological evidence.",
          "Text 2 argues that both historians are equally correct and the causes cannot be separated.",
        ],
        correctIndex: 1,
        hints: [
          "Does Text 2 say the drought didn't happen, or does it reframe the drought's importance?",
          "Text 2 mentions that other drought-affected cities survived — why include that detail?",
          "That detail suggests the drought alone wasn't fatal elsewhere; something else (trade access) made the difference here.",
          "Text 2 isn't denying the drought — it's arguing trade-route loss was the decisive factor, implying the drought alone might not have doomed the city. That's B.",
        ],
        explanation:
          "Text 2 doesn't deny the drought happened (ruling out A) or simply agree with Text 1 (ruling out C), nor does it call the causes inseparable (ruling out D). By noting that other drought-stricken cities survived via trade routes, Text 2 argues the loss of trade access — not drought alone — was decisive, which is B.",
      },
      {
        id: "cs-h-2",
        section: "Reading & Writing",
        skill: "Craft and Structure",
        difficulty: "hard",
        passage:
          "The essay's tone shifts abruptly in its final paragraph: after four paragraphs of dry, statistic-laden analysis of coral bleaching rates, the author writes, 'I have seen this reef. I have swum through what used to be a forest of color and is now a graveyard of gray stone.'",
        prompt:
          "The shift described in the text most likely serves which rhetorical purpose?",
        choices: [
          "To undermine the credibility of the statistics presented earlier in the essay",
          "To transition from impersonal data to a personal, emotional appeal that reinforces the essay's stakes",
          "To signal that the author disagrees with the scientific consensus on coral bleaching",
          "To introduce a new, unrelated topic for the reader to consider",
        ],
        correctIndex: 1,
        hints: [
          "The shift is from 'dry, statistic-laden' to first-person, vivid, emotional language. What's the effect?",
          "Is the author contradicting the data, or adding something the data alone can't convey?",
          "This is a classic ethos/pathos move: personal testimony added on top of statistical evidence, not instead of it.",
          "The personal, sensory language ('graveyard of gray stone') adds emotional weight to the same argument the statistics were building — that's choice B.",
        ],
        explanation:
          "The shift adds a first-person, emotionally vivid account on top of the statistical argument already made — reinforcing the stakes rather than undermining or replacing the data. That's B; A, C, and D aren't supported by the text.",
      },
    ],
  },

  "Expression of Ideas": {
    easy: [
      {
        id: "ei-e-1",
        section: "Reading & Writing",
        skill: "Expression of Ideas",
        difficulty: "easy",
        passage:
          "The team is finalizing the budget. ___ they need approval from the finance director before Friday.",
        prompt: "Which choice most logically completes the text?",
        choices: ["However,", "Additionally,", "For example,", "In contrast,"],
        correctIndex: 1,
        hints: [
          "Is the second sentence adding a related requirement, or contradicting the first sentence?",
          "'Finalizing the budget' and 'need approval' both sound like steps in the same process, not opposing ideas.",
          "A transition that adds a related point (not a contrast) fits best here.",
          "'Additionally' signals another related step in the same process — that's choice B.",
        ],
        explanation:
          "Both sentences describe steps in the same budget process — there's no contrast or example being given, just an added requirement. 'Additionally' (B) fits; 'However' and 'In contrast' wrongly signal opposition, and 'For example' wrongly signals an illustration.",
      },
      {
        id: "ei-e-2",
        section: "Reading & Writing",
        skill: "Expression of Ideas",
        difficulty: "easy",
        passage:
          "Notes: (1) The museum's new wing opens in June. (2) It will feature interactive science exhibits. (3) Admission will be free for the first month.",
        prompt:
          "The writer wants to combine the three notes into one sentence that emphasizes the free admission as a special, limited-time detail. Which choice best accomplishes this goal?",
        choices: [
          "The museum's new wing, which opens in June and features interactive science exhibits, will offer free admission for its first month.",
          "The museum's new wing opens in June, and it features interactive science exhibits, and admission is free.",
          "In June, admission is free, and the museum's new wing features interactive science exhibits.",
          "The museum's new wing features interactive science exhibits and opens in June with free admission always.",
        ],
        correctIndex: 0,
        hints: [
          "You need the free-admission detail to stand out as special and limited-time, not buried or made permanent.",
          "Look for a version that uses 'for its first month' clearly, keeping that detail as the emphasized, final point.",
          "Avoid choices that make admission sound permanent ('always') or that give all three facts equal, list-like weight.",
          "Choice A puts the June-opening and exhibits in a subordinate clause, saving 'free admission for its first month' as the main, emphasized point.",
        ],
        explanation:
          "The goal is to emphasize free admission as special and temporary. A subordinates the opening date and exhibits into a modifying clause and ends on 'free admission for its first month,' correctly emphasizing that detail. B lists facts with equal weight, C buries the emphasis, and D wrongly implies admission is always free.",
      },
    ],
    medium: [
      {
        id: "ei-m-1",
        section: "Reading & Writing",
        skill: "Expression of Ideas",
        difficulty: "medium",
        passage:
          "The startup's first product failed to gain users. ___ its second product, launched only eight months later, reached one million downloads within a week.",
        prompt: "Which choice most logically completes the text?",
        choices: ["Similarly,", "Yet", "Because of this,", "In other words,"],
        correctIndex: 1,
        hints: [
          "Compare the two outcomes: one product failed, the other succeeded quickly. Same direction, or opposite?",
          "A word signaling contrast is needed, not similarity or restatement.",
          "'Because of this' would wrongly suggest the failure caused the second product's success — that's not stated.",
          "'Yet' correctly signals the contrast between the first product's failure and the second product's rapid success.",
        ],
        explanation:
          "The sentence contrasts a failure with a fast success — that calls for a contrast transition. 'Yet' (B) fits; 'Similarly' and 'In other words' wrongly signal sameness/restatement, and 'Because of this' wrongly implies causation.",
      },
      {
        id: "ei-m-2",
        section: "Reading & Writing",
        skill: "Expression of Ideas",
        difficulty: "medium",
        passage:
          "Notes: (1) The researcher collected soil samples from twelve sites. (2) Each site was tested for nitrogen content. (3) Sites near the river had nitrogen levels nearly triple those farther away.",
        prompt:
          "The writer wants to combine the notes to highlight the contrast found in note 3 as the main point. Which choice best accomplishes this goal?",
        choices: [
          "The researcher collected soil samples from twelve sites and tested each for nitrogen content, and some sites were near a river.",
          "After testing soil samples from twelve sites for nitrogen content, the researcher found that sites near the river had nitrogen levels nearly triple those farther away.",
          "Twelve sites were tested for nitrogen content by the researcher, who also collected soil samples.",
          "Nitrogen content was tested at twelve sites, some near a river and some farther away, by the researcher.",
        ],
        correctIndex: 1,
        hints: [
          "The contrast — near-river sites vs. farther sites — needs to be the sentence's main, emphasized clause.",
          "Look for a version where the method (collecting/testing) is subordinated and the contrast is the main clause.",
          "Avoid choices that give the contrast equal or lesser weight compared to the collection process.",
          "Choice B subordinates the collection/testing into an introductory phrase and makes the nitrogen contrast the main clause — exactly the intended emphasis.",
        ],
        explanation:
          "The goal is to make the near-river-vs-farther nitrogen contrast the sentence's main point. B does this by putting the sampling process in an introductory phrase and the contrast in the main clause. The other choices bury or flatten that contrast.",
      },
    ],
    hard: [
      {
        id: "ei-h-1",
        section: "Reading & Writing",
        skill: "Expression of Ideas",
        difficulty: "hard",
        passage:
          "The committee reviewed dozens of grant proposals, most of which addressed climate resilience in coastal towns. ___ one proposal instead focused on drought resilience in inland farming communities, prompting a broader debate about the fund's geographic scope.",
        prompt: "Which choice most logically completes the text?",
        choices: ["Consequently,", "Notably,", "Similarly,", "As a result,"],
        correctIndex: 1,
        hints: [
          "Is the second sentence a result/cause of the first, or is it drawing attention to an exception within the group?",
          "'Most' proposals were about one topic; this one proposal stood out as different — what transition flags a standout example?",
          "'Consequently' and 'As a result' both wrongly imply causation, which isn't described here.",
          "'Notably' correctly flags this proposal as a noteworthy exception among the group, which is what triggered the debate.",
        ],
        explanation:
          "The sentence isn't describing a cause-and-effect relationship (ruling out 'Consequently'/'As a result') or a similarity (ruling out 'Similarly') — it's highlighting an exception worth noting, which triggered a debate. 'Notably' (B) fits best.",
      },
      {
        id: "ei-h-2",
        section: "Reading & Writing",
        skill: "Expression of Ideas",
        difficulty: "hard",
        passage:
          "Notes: (1) The city's transit agency piloted a fare-free bus route for six months. (2) Ridership on that route rose 22 percent. (3) Ridership on nearby fare-charging routes fell slightly during the same period. (4) The agency has not yet determined whether riders switched routes or were new to the system.",
        prompt:
          "The writer wants to combine the notes to present the finding while accurately conveying the agency's uncertainty about its cause. Which choice best accomplishes this goal?",
        choices: [
          "The fare-free pilot route saw ridership rise 22 percent while nearby fare-charging routes saw a slight decline, though the agency has not determined whether this reflects riders switching routes or genuinely new ridership.",
          "Because the fare-free pilot caused nearby routes to lose riders, the agency knows ridership simply shifted rather than grew.",
          "Ridership rose 22 percent on the fare-free route, proving that eliminating fares increases overall transit use.",
          "The agency piloted a fare-free route for six months, and ridership changed on nearby routes too, for unknown reasons entirely disconnected from the pilot.",
        ],
        correctIndex: 0,
        hints: [
          "Note 4 explicitly says the cause is undetermined — your answer must preserve that uncertainty, not resolve it.",
          "Eliminate any choice that states a cause as settled fact ('proves,' 'caused,' 'knows').",
          "The correct choice should present both ridership facts (rise and slight decline) AND flag the open question about cause.",
          "Only one choice reports both findings accurately while explicitly preserving the agency's stated uncertainty about switching vs. new ridership — that's choice A.",
        ],
        explanation:
          "Note 4 says the cause is unresolved, so the correct combination must state the ridership findings without claiming a settled explanation. A does exactly that. B and C wrongly assert a cause as proven/known, and D wrongly claims the changes are 'entirely disconnected' from the pilot, which isn't supported.",
      },
    ],
  },

  "Standard English Conventions": {
    easy: [
      {
        id: "sec-e-1",
        section: "Reading & Writing",
        skill: "Standard English Conventions",
        difficulty: "easy",
        prompt:
          "The chef, along with her two assistants, ___ preparing the tasting menu for tonight's private event.",
        choices: ["is", "are", "were", "have been"],
        correctIndex: 0,
        hints: [
          "Find the sentence's true subject — is it 'the chef' or 'her two assistants'?",
          "Phrases like 'along with...' are set off by commas and don't change the subject's number.",
          "The true subject, 'the chef,' is singular, so the verb must be singular too.",
          "'Is' agrees with the singular subject 'the chef' — the 'along with' phrase doesn't count toward agreement.",
        ],
        explanation:
          "'Along with her two assistants' is a parenthetical phrase, not part of the grammatical subject. The true subject is 'the chef' (singular), so the verb must be singular: 'is.'",
      },
      {
        id: "sec-e-2",
        section: "Reading & Writing",
        skill: "Standard English Conventions",
        difficulty: "easy",
        prompt:
          "After finishing the marathon, ___ was exhausted but proud.",
        choices: ["Maria", "her", "Maria's", "she was"],
        correctIndex: 0,
        hints: [
          "The sentence needs a subject to pair with the verb 'was.'",
          "Which choice can grammatically function as the subject of the sentence?",
          "'Her' and \"Maria's\" can't be subjects in this position; 'she was' would create a repeated verb.",
          "'Maria' correctly serves as the subject, paired with 'was exhausted but proud.'",
        ],
        explanation:
          "The sentence needs a subject before 'was.' 'Maria' works; 'her' is an object/possessive pronoun and can't be the subject, \"Maria's\" is possessive, and 'she was' would duplicate the verb.",
      },
    ],
    medium: [
      {
        id: "sec-m-1",
        section: "Reading & Writing",
        skill: "Standard English Conventions",
        difficulty: "medium",
        prompt:
          "The company's new policy—announced last week without warning—___ many long-time employees.",
        choices: ["have upset", "has upset", "upsetting", "upset, having"],
        correctIndex: 1,
        hints: [
          "Ignore the interrupting dash phrase for a moment: what's the core sentence?",
          "'The company's new policy ___ many long-time employees' — find the subject.",
          "'Policy' is singular, so the verb must agree in the singular form.",
          "'Has upset' is the correct singular present-perfect form agreeing with 'policy.'",
        ],
        explanation:
          "Setting aside the dash interruption, the core sentence is 'The company's new policy has upset many long-time employees.' The singular subject 'policy' requires the singular verb 'has upset.'",
      },
      {
        id: "sec-m-2",
        section: "Reading & Writing",
        skill: "Standard English Conventions",
        difficulty: "medium",
        prompt:
          "Determined to finish the project early, the deadline was moved up by the team.",
        choices: [
          "the deadline was moved up by the team",
          "the team moved up the deadline",
          "the deadline, moved up by the team,",
          "moving up the deadline was done by the team",
        ],
        correctIndex: 1,
        hints: [
          "Who is 'determined to finish the project early' — the deadline, or the team?",
          "A modifier at the start of a sentence must describe the subject that immediately follows it.",
          "As written, the sentence illogically says the deadline was 'determined' — that's a dangling modifier.",
          "Choice B puts 'the team' right after the introductory phrase, correctly making the team the one who is determined.",
        ],
        explanation:
          "The introductory phrase 'Determined to finish the project early' must modify the subject that follows. A deadline can't be 'determined' — only the team can. Choice B fixes this dangling modifier by making 'the team' the subject immediately following the phrase.",
      },
    ],
    hard: [
      {
        id: "sec-h-1",
        section: "Reading & Writing",
        skill: "Standard English Conventions",
        difficulty: "hard",
        prompt:
          "Neither the lead researcher nor her graduate students ___ aware of the funding cut until the announcement.",
        choices: ["was", "were", "is", "has been"],
        correctIndex: 1,
        hints: [
          "With 'neither...nor,' the verb agrees with the noun closest to it, not the first one.",
          "The noun closest to the verb here is 'graduate students' — singular or plural?",
          "'Graduate students' is plural, so the verb must be plural.",
          "'Were' correctly agrees with the nearer plural noun, 'graduate students.'",
        ],
        explanation:
          "In 'neither...nor' constructions, the verb agrees with the closer subject. Here that's 'her graduate students' (plural), so the correct verb is 'were.'",
      },
      {
        id: "sec-h-2",
        section: "Reading & Writing",
        skill: "Standard English Conventions",
        difficulty: "hard",
        prompt:
          "The report concluded that of all the proposals submitted, it was the engineering team's plan ___ most directly addressed the budget constraints.",
        choices: ["that", "who", "which, that", "whom"],
        correctIndex: 0,
        hints: [
          "You need a relative pronoun that refers back to 'plan' — a thing, not a person.",
          "'Who' and 'whom' refer to people; a plan isn't a person.",
          "Since the plan is being specifically identified (restrictively) among all proposals, the pronoun should introduce a restrictive clause.",
          "'That' correctly refers to the non-human noun 'plan' and introduces the restrictive clause identifying which plan.",
        ],
        explanation:
          "'Plan' is a thing, not a person, so 'who'/'whom' are wrong. The clause restrictively identifies which plan (out of all proposals) is meant, which calls for 'that' rather than a non-restrictive 'which.' 'Which, that' is not valid English.",
      },
    ],
  },

  // ---------------- MATH ----------------
  Algebra: {
    easy: [
      {
        id: "alg-e-1",
        section: "Math",
        skill: "Algebra",
        difficulty: "easy",
        prompt: "If 3x + 7 = 22, what is the value of x?",
        choices: ["3", "5", "7", "9"],
        correctIndex: 1,
        hints: [
          "Start by isolating the term with x — subtract 7 from both sides.",
          "3x + 7 = 22 becomes 3x = 15.",
          "Now divide both sides by 3.",
          "3x = 15, so x = 15 ÷ 3 = 5.",
        ],
        explanation: "3x + 7 = 22 → 3x = 15 → x = 5.",
      },
      {
        id: "alg-e-2",
        section: "Math",
        skill: "Algebra",
        difficulty: "easy",
        prompt: "A phone plan costs $20 per month plus $0.10 per text message. If a customer's bill was $35, how many text messages did they send?",
        choices: ["100", "150", "175", "350"],
        correctIndex: 1,
        hints: [
          "Set up an equation: 20 + 0.10t = 35, where t is the number of texts.",
          "Subtract 20 from both sides first.",
          "0.10t = 15",
          "Divide both sides by 0.10: t = 150.",
        ],
        explanation: "20 + 0.10t = 35 → 0.10t = 15 → t = 150 texts.",
      },
    ],
    medium: [
      {
        id: "alg-m-1",
        section: "Math",
        skill: "Algebra",
        difficulty: "medium",
        prompt: "If 2(x − 3) = 4x + 6, what is the value of x?",
        choices: ["-6", "-4", "4", "6"],
        correctIndex: 0,
        hints: [
          "Distribute the 2 on the left side first.",
          "2x − 6 = 4x + 6",
          "Move x terms to one side and constants to the other: −6 − 6 = 4x − 2x.",
          "−12 = 2x, so x = −6.",
        ],
        explanation: "2(x−3) = 4x+6 → 2x−6 = 4x+6 → −12 = 2x → x = −6.",
      },
      {
        id: "alg-m-2",
        section: "Math",
        skill: "Algebra",
        difficulty: "medium",
        prompt:
          "A line passes through the points (2, 5) and (6, 13). What is the slope of the line?",
        choices: ["1", "2", "3", "4"],
        correctIndex: 1,
        hints: [
          "Slope = (change in y) / (change in x).",
          "Change in y: 13 − 5 = 8. Change in x: 6 − 2 = 4.",
          "Slope = 8/4.",
          "8 ÷ 4 = 2.",
        ],
        explanation: "Slope = (13−5)/(6−2) = 8/4 = 2.",
      },
    ],
    hard: [
      {
        id: "alg-h-1",
        section: "Math",
        skill: "Algebra",
        difficulty: "hard",
        prompt:
          "The system of equations below has infinitely many solutions. What is the value of k?\n3x + 5y = 15\n6x + ky = 30",
        choices: ["5", "8", "10", "15"],
        correctIndex: 2,
        hints: [
          "For infinitely many solutions, the second equation must be a scalar multiple of the first.",
          "Compare the x-coefficients: 6 is 2 times 3. That scalar (2) must apply to every term.",
          "5 × 2 = 10 for the y-coefficient, and check: 15 × 2 = 30 for the constant — it matches.",
          "So k must equal 5 × 2 = 10.",
        ],
        explanation:
          "For infinitely many solutions, equation 2 must be exactly 2× equation 1 (since 6 = 2×3 and 30 = 2×15). That means k = 2×5 = 10.",
      },
      {
        id: "alg-h-2",
        section: "Math",
        skill: "Algebra",
        difficulty: "hard",
        prompt:
          "If |2x − 5| = 9, what is the sum of all possible values of x?",
        choices: ["0", "2", "5", "9"],
        correctIndex: 2,
        hints: [
          "An absolute value equation |A| = b splits into two cases: A = b and A = −b.",
          "Case 1: 2x − 5 = 9. Case 2: 2x − 5 = −9.",
          "Solve each: Case 1 gives x = 7. Case 2 gives x = −2.",
          "Sum the two solutions: 7 + (−2) = 5.",
        ],
        explanation:
          "|2x−5| = 9 means 2x−5 = 9 or 2x−5 = −9. Solving: x = 7 or x = −2. Their sum is 5.",
      },
    ],
  },

  "Advanced Math": {
    easy: [
      {
        id: "am-e-1",
        section: "Math",
        skill: "Advanced Math",
        difficulty: "easy",
        prompt: "If f(x) = x² + 3, what is f(4)?",
        choices: ["7", "16", "19", "22"],
        correctIndex: 2,
        hints: [
          "Substitute x = 4 into the function.",
          "f(4) = 4² + 3",
          "4² = 16",
          "16 + 3 = 19",
        ],
        explanation: "f(4) = 4² + 3 = 16 + 3 = 19.",
      },
      {
        id: "am-e-2",
        section: "Math",
        skill: "Advanced Math",
        difficulty: "easy",
        prompt: "Which value of x satisfies x² = 49?",
        choices: ["x = 7 only", "x = −7 only", "x = 7 or x = −7", "No real solution"],
        correctIndex: 2,
        hints: [
          "Think about which numbers, when squared, give 49.",
          "7² = 49. What about (−7)²?",
          "(−7)² = 49 as well, since a negative times a negative is positive.",
          "Both 7 and −7 satisfy the equation.",
        ],
        explanation: "Both 7² and (−7)² equal 49, so x = 7 or x = −7.",
      },
    ],
    medium: [
      {
        id: "am-m-1",
        section: "Math",
        skill: "Advanced Math",
        difficulty: "medium",
        prompt: "What are the solutions to x² − 5x + 6 = 0?",
        choices: ["x = 1, 6", "x = 2, 3", "x = -2, -3", "x = 2, -3"],
        correctIndex: 1,
        hints: [
          "Try factoring the quadratic into two binomials.",
          "You need two numbers that multiply to 6 and add to −5.",
          "−2 and −3 multiply to 6 and add to −5.",
          "So (x − 2)(x − 3) = 0, giving x = 2 or x = 3.",
        ],
        explanation: "x² − 5x + 6 factors as (x−2)(x−3) = 0, so x = 2 or x = 3.",
      },
      {
        id: "am-m-2",
        section: "Math",
        skill: "Advanced Math",
        difficulty: "medium",
        prompt: "If g(x) = 2x² − 8, for what value of x is g(x) = 0?",
        choices: ["x = 1 only", "x = 2 only", "x = 2 or x = −2", "x = 4 or x = −4"],
        correctIndex: 2,
        hints: [
          "Set the function equal to 0: 2x² − 8 = 0.",
          "Add 8 to both sides, then divide by 2: x² = 4.",
          "Take the square root of both sides — remember both roots.",
          "x = 2 or x = −2, since both square to 4.",
        ],
        explanation: "2x² − 8 = 0 → x² = 4 → x = 2 or x = −2.",
      },
    ],
    hard: [
      {
        id: "am-h-1",
        section: "Math",
        skill: "Advanced Math",
        difficulty: "hard",
        prompt:
          "The function h(x) = 3(2)^x models a population, in thousands, x years after tracking began. According to the model, in how many years does the population first exceed 96,000?",
        choices: ["4", "5", "6", "7"],
        correctIndex: 2,
        hints: [
          "Set up the inequality: 3(2)^x > 96 (in thousands).",
          "Divide both sides by 3: 2^x > 32.",
          "Recognize 32 as a power of 2: 32 = 2⁵.",
          "2^x > 2⁵ means x > 5, so the first whole year it exceeds 96,000 is x = 6.",
        ],
        explanation:
          "3(2)^x > 96 → 2^x > 32 = 2⁵ → x > 5. The first integer year satisfying this is x = 6.",
      },
      {
        id: "am-h-2",
        section: "Math",
        skill: "Advanced Math",
        difficulty: "hard",
        prompt:
          "If x² + y² = 25 and x + y = 7, what is the value of xy?",
        choices: ["7", "12", "13", "24"],
        correctIndex: 1,
        hints: [
          "Recall the identity: (x + y)² = x² + 2xy + y².",
          "Substitute what you know: 7² = 25 + 2xy.",
          "49 = 25 + 2xy, so 2xy = 24.",
          "Divide both sides by 2: xy = 12.",
        ],
        explanation:
          "(x+y)² = x²+2xy+y² → 49 = 25 + 2xy → 2xy = 24 → xy = 12.",
      },
    ],
  },

  "Problem-Solving and Data Analysis": {
    easy: [
      {
        id: "psda-e-1",
        section: "Math",
        skill: "Problem-Solving and Data Analysis",
        difficulty: "easy",
        prompt:
          "A recipe calls for 2 cups of flour for every 3 cups of sugar. If a baker uses 9 cups of sugar, how many cups of flour are needed to keep the same ratio?",
        choices: ["4", "5", "6", "7"],
        correctIndex: 2,
        hints: [
          "Set up a proportion: 2 flour / 3 sugar = x flour / 9 sugar.",
          "9 is 3 times 3, so scale the flour amount by the same factor.",
          "2 × 3 = 6.",
          "6 cups of flour keeps the 2:3 ratio at 9 cups of sugar.",
        ],
        explanation: "The ratio 2:3 scaled by 3 (since 9 = 3×3 sugar) gives 2×3 = 6 cups of flour.",
      },
      {
        id: "psda-e-2",
        section: "Math",
        skill: "Problem-Solving and Data Analysis",
        difficulty: "easy",
        prompt:
          "A survey of 40 students found that 25% prefer studying in the morning. How many students prefer studying in the morning?",
        choices: ["8", "10", "12", "15"],
        correctIndex: 1,
        hints: [
          "25% means one-quarter.",
          "Find one-quarter of 40.",
          "40 ÷ 4 = 10.",
          "So 10 students prefer studying in the morning.",
        ],
        explanation: "25% of 40 = 0.25 × 40 = 10.",
      },
    ],
    medium: [
      {
        id: "psda-m-1",
        section: "Math",
        skill: "Problem-Solving and Data Analysis",
        difficulty: "medium",
        prompt:
          "A store's revenue was $80,000 in January and grew to $92,000 in February. What was the percent increase in revenue?",
        choices: ["10%", "12%", "15%", "20%"],
        correctIndex: 2,
        hints: [
          "Percent change = (new − old) / old × 100.",
          "Difference: 92,000 − 80,000 = 12,000.",
          "12,000 / 80,000 = 0.15.",
          "0.15 as a percent is 15%.",
        ],
        explanation: "(92,000−80,000)/80,000 = 12,000/80,000 = 0.15 = 15%.",
      },
      {
        id: "psda-m-2",
        section: "Math",
        skill: "Problem-Solving and Data Analysis",
        difficulty: "medium",
        prompt:
          "In a data set of 5 numbers, the mean is 20. Four of the numbers are 15, 18, 22, and 25. What is the fifth number?",
        choices: ["18", "19", "20", "21"],
        correctIndex: 2,
        hints: [
          "Mean = sum of all values / count of values.",
          "If the mean of 5 numbers is 20, the total sum must be 20 × 5 = 100.",
          "Add the four known numbers: 15 + 18 + 22 + 25 = 80.",
          "Subtract from the total sum: 100 − 80 = 20.",
        ],
        explanation:
          "Sum of all 5 numbers = mean × count = 20 × 5 = 100. Sum of the four known numbers = 15+18+22+25 = 80. Fifth number = 100 − 80 = 20.",
      },
    ],
    hard: [
      {
        id: "psda-h-1",
        section: "Math",
        skill: "Problem-Solving and Data Analysis",
        difficulty: "hard",
        prompt:
          "A researcher surveys a random sample of 200 voters from a city and finds that 118 support a new transit bond. Based on this sample, which of the following is the best estimate of the number of supporters among the city's 50,000 registered voters, and why?",
        choices: [
          "29,500, because the sample proportion (59%) can be applied to the full population if the sample was random and representative.",
          "50,000, because all registered voters are assumed to support the bond.",
          "118, because that is the only confirmed number of supporters.",
          "23,600, because 118 out of 500 is the correct proportion.",
        ],
        correctIndex: 0,
        hints: [
          "Find the sample proportion first: 118 out of 200.",
          "118/200 = 0.59, or 59%.",
          "Apply that same proportion to the full population of 50,000 (assuming the sample is representative).",
          "0.59 × 50,000 = 29,500.",
        ],
        explanation:
          "118/200 = 59%. Applying that proportion to 50,000 registered voters (assuming a representative random sample) gives 0.59 × 50,000 = 29,500 — choice A. The other choices misapply the ratio or ignore it entirely.",
      },
      {
        id: "psda-h-2",
        section: "Math",
        skill: "Problem-Solving and Data Analysis",
        difficulty: "hard",
        prompt:
          "A car's value depreciates by 12% each year. If the car is worth $24,000 today, which expression gives its value, in dollars, t years from now?",
        choices: ["24000(0.12)^t", "24000(0.88)^t", "24000(1.12)^t", "24000 − 0.12t"],
        correctIndex: 1,
        hints: [
          "Depreciation by 12% means the car retains 88% of its value each year.",
          "Convert 88% to a decimal multiplier: 0.88.",
          "This is exponential decay, so the multiplier is raised to the power of t (years).",
          "The correct expression is 24000(0.88)^t.",
        ],
        explanation:
          "Losing 12% per year means retaining 100% − 12% = 88% = 0.88 of value each year, compounded over t years: 24000(0.88)^t.",
      },
    ],
  },

  "Geometry and Trigonometry": {
    easy: [
      {
        id: "gt-e-1",
        section: "Math",
        skill: "Geometry and Trigonometry",
        difficulty: "easy",
        prompt:
          "A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?",
        choices: ["9", "10", "12", "14"],
        correctIndex: 1,
        hints: [
          "Use the Pythagorean theorem: a² + b² = c².",
          "6² + 8² = 36 + 64.",
          "36 + 64 = 100.",
          "c² = 100, so c = 10.",
        ],
        explanation: "6² + 8² = 36 + 64 = 100 = c², so c = 10.",
      },
      {
        id: "gt-e-2",
        section: "Math",
        skill: "Geometry and Trigonometry",
        difficulty: "easy",
        prompt: "A circle has a radius of 5. What is its area, in terms of π?",
        choices: ["5π", "10π", "25π", "50π"],
        correctIndex: 2,
        hints: [
          "The area of a circle is A = πr².",
          "Substitute r = 5.",
          "5² = 25.",
          "So the area is 25π.",
        ],
        explanation: "A = πr² = π(5²) = 25π.",
      },
    ],
    medium: [
      {
        id: "gt-m-1",
        section: "Math",
        skill: "Geometry and Trigonometry",
        difficulty: "medium",
        prompt:
          "In a right triangle, one angle measures 30°. The side opposite that angle has length 5. What is the length of the hypotenuse?",
        choices: ["5", "10", "5√2", "5√3"],
        correctIndex: 1,
        hints: [
          "Recall the sine relationship: sin(angle) = opposite / hypotenuse.",
          "sin(30°) = 0.5, so 0.5 = 5 / hypotenuse.",
          "Solve for the hypotenuse: hypotenuse = 5 / 0.5.",
          "5 / 0.5 = 10.",
        ],
        explanation: "sin(30°) = opposite/hypotenuse → 0.5 = 5/h → h = 10.",
      },
      {
        id: "gt-m-2",
        section: "Math",
        skill: "Geometry and Trigonometry",
        difficulty: "medium",
        prompt:
          "Two angles of a triangle measure 55° and 65°. What is the measure of the third angle?",
        choices: ["50°", "55°", "60°", "70°"],
        correctIndex: 2,
        hints: [
          "The three angles of any triangle always sum to 180°.",
          "Add the two known angles: 55° + 65°.",
          "55 + 65 = 120.",
          "Subtract from 180: 180 − 120 = 60°.",
        ],
        explanation: "180° − (55° + 65°) = 180° − 120° = 60°.",
      },
    ],
    hard: [
      {
        id: "gt-h-1",
        section: "Math",
        skill: "Geometry and Trigonometry",
        difficulty: "hard",
        prompt:
          "A cone has a radius of 3 and a height of 4. What is its volume, in terms of π?",
        choices: ["12π", "16π", "36π", "48π"],
        correctIndex: 0,
        hints: [
          "The volume of a cone is V = (1/3)πr²h.",
          "Substitute r = 3 and h = 4.",
          "r² = 9, so (1/3)π(9)(4).",
          "(1/3)(9)(4) = 12, so V = 12π.",
        ],
        explanation: "V = (1/3)πr²h = (1/3)π(9)(4) = 12π.",
      },
      {
        id: "gt-h-2",
        section: "Math",
        skill: "Geometry and Trigonometry",
        difficulty: "hard",
        prompt:
          "In triangle ABC, angle C is 90°, angle A is 40°, and side AB (the hypotenuse) is 10. What is the length of side BC (opposite angle A), rounded to the nearest tenth?",
        choices: ["6.4", "7.7", "8.4", "9.4"],
        correctIndex: 0,
        hints: [
          "Side BC is opposite angle A, and AB is the hypotenuse — which trig ratio relates opposite and hypotenuse?",
          "sin(A) = opposite / hypotenuse, so sin(40°) = BC / 10.",
          "sin(40°) ≈ 0.643.",
          "BC ≈ 0.643 × 10 ≈ 6.4.",
        ],
        explanation: "sin(40°) = BC/10 → BC = 10·sin(40°) ≈ 10 × 0.643 ≈ 6.4.",
      },
    ],
  },
};

// ---- helpers ----
export function pickQuestion(skill, difficulty, excludeIds = []) {
  const bucket = (QUESTION_BANK[skill] && QUESTION_BANK[skill][difficulty]) || [];
  const pool = bucket.filter((q) => !excludeIds.includes(q.id));
  const useBucket = pool.length > 0 ? pool : bucket; // recycle if exhausted
  if (useBucket.length === 0) return null;
  return useBucket[Math.floor(Math.random() * useBucket.length)];
}

export function bankSizeFor(skill, difficulty) {
  return ((QUESTION_BANK[skill] && QUESTION_BANK[skill][difficulty]) || []).length;
}
