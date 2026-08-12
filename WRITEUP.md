# Adaptly

Live demo: https://adaptlyai.netlify.app (click "Try Demo Student," no account needed)

## The problem

If you ask why wealthy students tend to score higher on the SAT, the answer is not that they are smarter. A big part of it is that many of them have a private tutor, and what a good tutor actually provides is attention. The tutor watches every practice test, notices that a student keeps missing a certain kind of algebra problem, adjusts the week's plan, and checks whether the fix worked. That cycle of watching, diagnosing, and adjusting is the real product, and it costs anywhere from fifty to hundreds of dollars an hour.

Students at underserved public schools almost never get that. What they get, if anything, is a shared prep book or a generic website that serves the same practice sets to everyone. Nothing in that experience knows what they, specifically, keep getting wrong. So bright students stall, not because the material is beyond them, but because nobody and nothing is paying attention to where they are stuck.

Adaptly was built to be that attention. It takes the part of tutoring that actually moves scores, the constant diagnosing and adjusting, and turns it into software that any student can use for free.

## How the agent works

Adaptly runs one continuous loop: results come in, the agent diagnoses, decides what matters most, sends the student into practice, and adapts as soon as new evidence arrives.

It starts with evidence. A student logs their SAT and practice test scores and their mistakes, or Adaptly simply watches their answers as they practice inside the app. The agent engine turns all of that into a mastery score for each of the eight SAT skill domains, then ranks the skills by urgency using a weighted formula that considers how weak the skill is, how many recent mistakes landed there, how often answers are wrong, how confident the student felt, how long it has been since they practiced it, and how close the test date is.

The agent is also honest about what it does not know. A skill with no direct evidence is labeled "Not assessed" instead of showing an invented percentage. If all the agent has is a broad section score, it refuses to guess which specific skill is weak and instead prescribes a short diagnostic to find out. Nothing the student sees is fabricated.

The top-ranked skill becomes the Next Best Action, a concrete recommendation with a reason drawn from the student's own data, such as "2 of your last 2 Math mistakes were in Advanced Math," along with a question count and a time estimate. From there, the AI Study Planner hands the agent's live ranking, mastery map, and recent results to Google Gemini, which writes the student's complete plan in plain language: where they stand, what to focus on, what to do each week, when to take practice tests, and the single next action to take. Because the AI works from the agent's own ranking, the plan never contradicts what the student sees on their dashboard.

Practice itself adapts with every answer, stepping harder or easier based on how the student is doing. When they get a question wrong, one click on Ask AI Tutor brings back a personalized explanation of why the correct answer is right and why their particular choice was a tempting trap. And whenever new results land, the agent re-diagnoses on its own. A card called "Adaptly Noticed" reports what changed, and "Why did my plan change?" explains the new priority in plain language. The student never has to ask what to do next, which is the whole point.

This is deliberately not a chatbot. A chatbot waits to be asked. Adaptly watches, decides, acts, and adapts on the student's behalf, and every decision is grounded in the student's own logged evidence.

## Impact for underserved schools

Everything in Adaptly is free for students, including the AI planner and the AI tutor. The practice content is either original, written for Adaptly, or routes students to free official resources like Bluebook and Khan Academy, so there is no paywall hiding the good material and no vendor lock-in. Anyone can try the complete experience, AI included, through Demo Student mode in a single click, with no account and nothing saved, which matters for students who are wary of signing up for things or share a device at home or school. The app itself is lightweight and runs fine on modest hardware and slow connections, and it is built to be usable by everyone, with keyboard navigation, screen reader announcements for dynamic updates, and no information conveyed by color alone.

The students who most need a tireless tutor are the ones least likely to ever meet one. Adaptly gives them the next best thing, and it never sends a bill.

## What's next

Weekly reminder scheduling, a larger original question bank, and a teacher view that shows a class's aggregate weak areas without exposing any individual student's mistakes.
