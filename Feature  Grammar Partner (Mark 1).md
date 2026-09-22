# Feature : Grammar Partner (Mark 1)  
  
  
  
### End to End workflow:  
1. User opens Narrate screen & records  
2. STT transcription  
3. Speech Analyser LLM call  
4. Store narration + errors inDB  
5. Update EMA error scores  
6. Feedback can be viewed by user if they want to.   
7. Select highest-priority error type to focus for drills  
8. If user decides to do drill session, then drill begins  
9. Drill session Begins  
10. we collect context of the related errors from DB and give it to LLM , ask it to generate concept, errors made and explanation in short bites, and questions for first round, a pre-made scenario question relevant to the drill session focus topic  
11. we teach the concept, the errors made in a simple , short and easy to digest manner (not as a long text)  
12. first round of drill: ask the question, give options (have premade answer to tell for correct or wrong submission)  
13. second round of drill: display the pre-made scenario question, and ask user to speak freely (maybe for 1-2 mins).   
14. feed the new speech and look for improvements. Update the EMA scores.   
15. show drill summary  
  
  
```
note: we are removing that controlled production phase for now because already this feels very intense. let's see with the current flow first and if needed we could add it in version 2. always we could make a change.

```
  
  
### Frontend:  
1. let's first test it with web application. then we will ship the mobile application later on. right now the focus is a web application  
2. tech stack: React with vite, typescript  
  
### UI flow for frontend:  
1. Narrate Screen with two options: the user can type in the title they want to talk about or they could choose a randomly given topic. for now, we can have it as a predefined fixed topic and change it later on. there is a record option on the screen once the title has been chosen. and the same button is used to stop recording. additionally, there is a submit button to submit the audio. There is also another option to view past sessions (keep view past sessions as non-functional for now) .   
2. Processing screen once the recording has been submitted  
3. Result Screen with the feedback summary in 2-3 lines. there are 3 buttons : 1. go back to narrate screen, 2. download the feedback as a pdf, 3. start drill session  
4. if the user clicks download the feedback as pdf, it downloads a pdf and opens the file for them.   
5. if the user clicks back, they go back to the narrate screen.   
6. if the user clicks drill session, we route to the Drill session guide page.   
7. Drill session guide page: just a page about the process of drill session and a button to start drills.  
8. the user clicks starts drill in the guide page, we show a processing screen with some text like “getting the customised drills ready for you”, simultaneously we send a request to the backend to get the drills ready.   
9. stage 1 page: where we introduce the concept and the error made in short bytes.   
10. stage 2 page: MCQs after understanding the concept where the user can click options and choose the answer  
11. stage 3 page: a scenario based question appears and there is an option to start recording and there is another button to submit. once user finishes recording , they can submit. Once submitted they see a processing screen until we get the summary. Simultaneously we process the drill responses in the backend.   
12. drill summary page: once finished processing, they get the summary of the drill session. it also has button to go back to narration page).   
  
  
  
### Backend choices:  
1. Database designing - DB Schema (done below)  
2. SQL database to use : Supabase to store data and we communicate with it using our backend. Only our backend can be used to connect with supabase  
3. Server tech stack : FastAPl based backend  
4. Designing API endpoints: done below  
5. STT service: WhisperAI can be used here with just one API call.   
6. Authentication: Supabase authentication - Email/password , OAuth (sign-in with google)  
7. LLM choices:  
    - Speech analysis: Gemini 2.5 pro  
    - Concept explanation, errors explanation : Groq model  
    - 3 MCQ questions, options, explanation for each option: Groq model  
    - Scenario question focused on the drill topic: Groq model  
  
  
### Database Schema Designing:  
```


```
```
Users(id, auth_id, username, created_at)


```
```
Narrations(id, user_id, title, is_drill_response boolean default false,
            transcript, created_at)


```
```
Feedback(id, narration_id, error_class, original_sentence, error_part, explanation, corrected_sentence)


```
```
UserErrorProfile(user_id, error_class, ema_score, opportunity_count_total, last_updated)
  -- PK (user_id, error_class)


```
```
Drills(id, user_id, narration_id, focus_error_class, started_at, completed_at, AI_response)
  -- UNIQUE(narration_id)

```
```

DrillSteps(id, drill_session_id, step_type, step_order,
           AI_content jsonb,
           user_response jsonb,       -- null except mcq
           transcript_id,             -- null except scenario, FK -> Narrations
           focus_opportunity_count,   -- null except scenario
           focus_error_count,         -- null except scenario
           created_at)

```
```
  -- UNIQUE(drill_session_id, step_order)

```
```



```
  
### API designing:  
1. Middleware handler for verifying authentication   
    * Whenever the client sends the token or session key, the job of the middleware is to verify if the user is legitimate and if the token is issued by Supabase auth service.    
2. Post Narrations/: submits audio recording from client to server  
    * Input: audio file, isDrill boolean to determine if this a plain narration or part of the drill step, drill_id if this part of the drill.   
    * Validate if the file submitted is the audio file and ensure if it hasn’t been submitted again to avoid reprocessing everything. If this is part of the drill session, then validate if the drill_id belongs to the actual user as presented by user_id. Also check if the drill has already been completed - check if completed_at is NULL.   
    * Send the audio file to the STT service which will send reply back with the transcript of the speech.   
    * Store the transcript in the Narrations table (and set is_drill_response as true if this is part of the drill)  
    * Send the Transcript of the speech to the speech analyser LLM.   
    * The LLM will respond a structured output containing each sentence, opportunities and the error made.   
    * Compute EMA scores for each category.   
    * If isDrill is true (part of drill), extract *just* the focus category's counts and write them onto DrillSteps.focus_opportunity_count / focus_error_count, Set DrillSteps.transcript_id to the new narration's id where it's the row matching drill_id AND step_type = 'scenario', Set Drills.completed_at once this write finishes  
    * Store the values in Feedback table, UserErrorProfile table, DrillSteps table  and Drills table together as a single transaction.    
    * Response:  sentence wise error correction.   
3. Get Narrations/: gets past sessions of the user and displays them  
    * Input: user id obtained from the auth middleware  
    * Retrieves all the narrations done by the user from the table Narrations where is_drill_response is false. It gets the narration title and date  
    * Response: all narrations by the user : their title, date  
4. Get Narrations/{id}/feedback/pdf: downloads the feedback as a PDF.   
    * Input: narration id  
    * Checks if the narration_id belongs to the current user.   
    * Retrieves the feedback stored for the given narration from the Feedback table and formats it into a PDF as a table.   
    * Response: the PDF file.   
5. Post Drill/: if the drill session has already been initiated, check DB and wait for response or if it has not been initiated,  then start a drill session  
    * Input: narration_id  
    * Output: concept title, concept, examples, Question, scenario prompt  
    * Check if the narration_id belongs to the current user.  
    * (How do we know if a drill session for this narration has already been initiated and is in progress?)  
    * If narration_id is already present in the Drills database, then respond back directly.   
    * Find the focus topic for the current drill session for this person (retrieve the right focus topic UserErrorProfile)  
    * Find the recent 5 errors made by the user of the focus-topic on the from the feedback table.   
    * Call the drill generator LLM to generate the expected output (as described later in this document)  
    * Store the data in the drill steps, as well as in the Drills database  
    * Response: Send back the data to the client side  
6. Patch Drill-steps/{id} : stores the human responses for MCQ in the database.  
    * Input: step_id  
    * Checks if the drill_id of the current_step belongs to the current user_id  
    * For the current drill MCQs, store the user’s response sent by the client in the DrillSteps table.   
    * Response: None except status codes  
7. Get /drills/{id}/summary: if summary present in DB, shows the summary of the drill. Else, it shows a message wait until it’s being processed.   
    * Input: drill_id  
    * Checks if the current drill_id belongs to the current user  
    * output: It returns the feedback given by the LLM for now - the errors, reasoning and its correction.   
    * Checks if it’s already present in the DB. we respond with no summary.   
    * If the feedback exists in the database, we return it.   
  
  
### Taxonomy:  

| Category | Count this, per sentence |
| ---------------------- | ---------------------------------------------------------------- |
| Tense | finite verbs |
| Subject-Verb Agreement | finite verbs with an explicit subject |
| Article/Determiner | singular countable noun phrases |
| Preposition | contexts requiring a preposition (time, place, verb-collocation) |
| Noun Number | countable noun instances |
| Verb Form | non-finite verb slots (after another verb/preposition) |
| Word Order | independent clauses |
| Pronoun | pronoun instances |
| Sentence Structure | sentence/clause boundaries |
| Other | Anything that doesn’t fall into above category |
  
  
  
### Output Structure of LLMs:  
Output expected from Speech Analyser LLM per sentence:  
**Final structure, per sentence:**  
```
{
  "sentence": "She go to the market yesterday and drink coffee.",
  "opportunities": ["tense", "tense", "word_order"],
  "errors": [
    {
      "category": "tense",
      "reasoning": "Simple past tense is needed for a completed action with a specific past time reference (\"yesterday\").",
      "error_part": "go to"
    },
    {
      "category": "tense",
      "reasoning": "Same time reference applies to the second verb in this compound sentence.",
      "error_part": "drink"
    }
  ],
  "corrected_sentence": "She went to the market yesterday and drank coffee."
}

```
  
**A clean sentence just looks like:**  
```
{
  "sentence": "I finished my homework before dinner.",
  "opportunities": ["tense", "sentence_structure"],
  "errors": [],
  "corrected_sentence": ""
}

```
  
  
Output expected from Drill Generator LLM per sentence:  
```
{
  "concept_title": "Past Tense",
  "concept_explanation": "...",
  "examples": [
    {"original_sentence": "...", "reason_for_error": "...", "corrected_sentence": "..."}
  ],
  "questions": [
    {
      "question": "...",
      "options": [
        {"id": "a", "statement": "...", "reason": "..."},
        {"id": "b", "statement": "...", "reason": "..."},
        {"id": "c", "statement": "...", "reason": "..."}
      ],
      "correct_option_id": "b"
    }
  ],
  "scenario_prompt": "..."
}

```
  
  
### Agents Designing:  
1. Speech Analyser: (Gemini 2.5 pro)  
    - Inputs: speech (in one go or in multiple batches), taxonomy, expected output structure, instructions.  
    - Output: every sentence structured as already discussed above.   
2. Drill Generator: (Groq model)  
    - Inputs: focus topic, mistakes made by user, instructions, expected output structure  
    - Output: a structured output containing concept, examples, questions, scenario prompt as shown above  
  
  
### Scoring Methodology:  
- Exponential Moving Average (EMA) scores: it's a weighted average where the weight on each past observation shrinks *exponentially* the further back it is — not a hard cutoff, not equal weighting, a smooth geometric decay. That's the direct answer to something we established way back: "recent-weighted, but not amnesiac."  
* A plain average would treat a mistake from your first-ever narration exactly the same as one from five minutes ago; EMA lets recent performance dominate while old data fades rather than vanishing outright.  
```
The formula, concretely, per (user, error_class) row:

```
```
    new_ema = α × session_error_rate + (1 − α) × old_ema


```
```
where session_error_rate = (error_count / opportunity_count) for that category in this narration, and α (alpha) is the smoothing factor, ~0.4 — the knob controlling how much weight a single new session gets versus everything that came before.

```
* **Worked out example of EMA:**  
    * Start: ema = 0 (new user, no data)  
    * Narration 1: 2 tense errors out of 5 opportunities → rate = 0.4 → ema = 0.4×0.4 + 0.6×0 = 0.16  
    * Narration 2: 1 out of 6 → rate = 0.167 → ema = 0.4×0.167 + 0.6×0.16 = 0.163  
    * Narration 3: 0 out of 4 (genuinely improved) → rate = 0 → ema = 0.4×0 + 0.6×0.163 = 0.098  
* EMA scoring has to be updated two times:  
    * Once during the narration on any topic  
    * Second, during the drill session’s scenario question  
* EMA scores can be updated for other categories in the drill session even if the drill session doesn’t focus on those topics. Why to waste data ?  
* The mistakes made by the user during the MCQs of the drill session are not counted to update the EMA scores.  
  
  
  
  
**Missing things: (mostly low level design)**  
1. Backend module layout  (we could ask Claude to give this)  
2. **Frontend module layout **  
  
  
