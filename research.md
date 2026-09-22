# Research Notes: Spoken English Drill App

A survey of the broader research landscape around non-native spoken English difficulties — prevalence data, related problems we hadn't originally considered, and science-backed drill methods (AI-based and traditional) that could inform the app's design.

---

## A. Prevalence — How Common Are These Problems?

### A1. Grammar inaccuracy is widespread among non-native speakers
A study of non-English-department students found major challenges across language skills, with 80% of students showing inaccuracies in grammar specifically. Lack of vocabulary was repeatedly identified as the most-cited problem, ahead of grammar and pronunciation.

**Sources:**
- [The Speaking Difficulties Encountered by Non-English Students in Language Classroom](https://www.researchgate.net/publication/332579065_The_Speaking_Difficulties_Encountered_by_Non-English_Students_in_Language_Classroom)
- [STUDENTS' DIFFICULTIES IN SPEAKING ENGLISH](https://poltekstpaul.ac.id/jurnal/index.php/jsoscied/article/download/416/307)

### A2. The vocabulary gap between native and non-native speakers is large
Native English speakers typically have a vocabulary of 15,000–20,000 word families. Non-native speakers typically have only 2,000–3,000. Spoken language is also harder to self-correct in real time than written language, where a learner can revise as they go.

**Source:**
- [Multilingualism and international mental health research – The barriers for non-native speakers of English (PLOS Mental Health)](https://journals.plos.org/mentalhealth/article?id=10.1371/journal.pmen.0000033)

---

## B. Related Problems Not in Our Original List

### B1. Errors are likely systematic, not random — traceable to L1 interference
This is studied under "contrastive analysis" and "error analysis." Learners tend to transfer the structure of their native language (L1) onto the target language (L2), producing predictable, patterned errors rather than random ones. A classic example: French word order errors made by English speakers ("elle regarde les" instead of "elle les regarde"), caused by transferring English word order into French. Research also links how persistent ("fossilized") an error becomes to how strongly the learner's L1 continues to interfere.

**Implication for us:** a personal error log isn't just useful for tracking mistakes — it should actively try to identify the 2–3 structural mismatches between the user's native language and English driving most of their errors, since these are likely to be highly predictable and drillable once named.

**Sources:**
- [Error analysis (linguistics) — Wikipedia](https://en.wikipedia.org/wiki/Error_analysis_(linguistics))
- [Analysis of the Interlanguage of Second Language Learners: Implications for the Classroom (IntechOpen)](https://www.intechopen.com/chapters/83784)
- [Language transfer — Wikipedia](https://en.wikipedia.org/wiki/Language_transfer)

### B2. Production and comprehension are near-separate skills — input barely transfers to output
This is a stronger and more specific claim than the general "output hypothesis." DeKeyser's research found that extensive listening-comprehension training increased processing speed but did not significantly reduce errors in production. Conversely, oral output training led to more accurate production without hindering comprehension. A separate study on Italian L2 learners found automatization of grammar was consistently less advanced in production than in comprehension. This is evidence that comprehension and production develop as largely independent skills, not that one simply "unlocks" the other given enough time.

**Source:**
- [DeKeyser, R. M., & Suzuki, Y. (2025). Skill Acquisition Theory (preprint)](https://yuichisuzuki.net/wp-content/uploads/2025/07/PreprintDeKeyser-R.-M.-Suzuki-Y.-2025.-Skill-acquisition-theory.-In-B.-VanPatten-G.-D.-Keating-S.-Wulff-Eds.-Theories-in-second-language-acquisition-An-introduction-4th-ed.-pp.-157-182-.pdf)

### B3. The vocabulary problem may partly be a "chunks" problem
Fluent speakers rely heavily on prefabricated multi-word chunks (collocations, idioms, sentence stems) instead of constructing every sentence from individual words. These chunks are stored and retrieved as single units, which is what allows fast, automatic, natural-sounding speech. A vocabulary shortfall may really be a shortfall in ready-made phrases ("as far as I'm concerned," "that being said") rather than single words — meaning drills built around individual word recall may be missing half the problem.

**Sources:**
- [Why Teaching Chunks in MFL is More Effective for Developing Fluency (The Language Gym)](https://gianfrancoconti.com/2025/03/11/why-teaching-chunks-in-mfl-is-more-effective-for-developing-fluency-a-research-based-perspective/)
- [Formulaic Language and the Lexicon](https://www.researchgate.net/publication/27650884_Formulaic_Language_and_the_Lexicon)

### B4. How an AI corrects errors matters as much as whether it corrects them
Research comparing feedback types found that implicit correction (recasts — simply repeating a sentence back correctly without explanation) led learners to actually notice and use the fix only 31% of the time, compared to 50% for explicit correction with an explanation. A separate study found explicit correction was significantly more effective overall, likely because it raises conscious awareness of the specific error.

**Implication for us:** the app's correction feature should explain *why* something was wrong, not just silently rewrite the sentence.

**Sources:**
- [Corrective Feedback Clarifications in Second Language Acquisition](https://capu.arcabc.ca/_flysystem/repo-bin/2021-11/capu_5693.pdf)
- [The effectiveness of implicit and explicit error correction on learners' performance (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0346251X08001176)

---

## C. Science-Backed Drill Methods Beyond Our Original 3 Ideas

### C1. The 4/3/2 Technique (timed repeated retelling)
A learner talks about a familiar topic for 4 minutes, then repeats the *same content* to a new listener in 3 minutes, then again in 2 minutes. Because the content no longer needs to be generated from scratch each round, attention is freed up to focus on monitoring accuracy and retrieving words that failed the first time. The shrinking time window also forces the speaker to cut filler and speak more concisely. Studies found significantly reduced hesitations and faster speech rate by the third delivery, and one study found these fluency gains were retained over time and transferred to new, unpracticed speaking tasks.

**Why this fits an AI app well:** the AI can act as a "different listener" each round, transcribe all three deliveries, and visually show the same content getting tighter and more fluent across attempts — a measurable, visible progress signal from a single ~9-minute session.

**Sources:**
- [Fluency development through repetition: 4/3/2 versus 3/3/3 (Vrije Universiteit Brussel)](https://researchportal.vub.be/en/publications/fluency-development-through-repetition-432-versus-333/)
- [En route to spoken fluency via task repetition — the '4, 3, 2 technique' (The Language Gym)](https://gianfrancoconti.com/2017/03/04/en-route-to-spoken-fluency-via-task-repetition-the-4-3-2-technique-and-market-place/)
- [Effects of the 4/3/2 Activity Revisited](http://kazuyasaito.net/LTR2021.pdf)
- [4, 3, 2, 1: Fluency! (Hacking Chinese)](https://www.hackingchinese.com/4-3-2-1-fluency-a-great-technique-for-boost-your-mandarin-speaking-ability/)

### C2. Chunk / Collocation Training
A controlled intervention teaching lexical chunks (collocations and idioms) to EFL learners produced significantly better speaking fluency gains than a control group that didn't receive chunk-focused training.

**Implication for us:** a distinct drill type from straightforward vocabulary practice — instead of "learn more words," the goal is "learn more pre-assembled phrases that can be deployed instantly without being constructed live."

**Source:**
- [Intermediate EFL learners' formulaic language speaking proficiency: Where does the teaching of lexical chunks figure? (Frontiers in Psychology)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.949675/full)

### C3. Practice must be meaningful, not just repetitive
Skill Acquisition Theory holds that practice needs to be meaningful — targeting a specific, noticed gap — rather than just repetition for its own sake, in order to drive the shift from effortful, rule-based production to fast, automatic fluency.

**Implication for us:** a design caution — avoid building a tool that just racks up "minutes practiced" without each session targeting something specific the user actually got wrong or struggled with.

**Source:**
- [Language-as-Skill Approach in Foreign Language Education (Liberty University Digital Commons)](https://digitalcommons.liberty.edu/cgi/viewcontent.cgi?article=5344&context=doctoral)

---

*Compiled June 2026. This is a working research reference — add notes, links, or counter-evidence as we find them.*
