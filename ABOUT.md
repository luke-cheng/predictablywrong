## Predictably Wrong

### Inspiration

We were inspired by the classic [**Guess 2/3 of the average**](https://en.wikipedia.org/wiki/Guess_2/3_of_the_average) game. In that game:

- Each player picks a number from 0 to 100.
- The winner is the one whose guess is closest to 2/3 of the average.

The fascinating part is the iterated reasoning: people don't just guess what they believe is “right”; they guess _what others will guess_, then guess _what others think others will guess_, and so on. Eventually, if everyone reasons “infinitely” deeply and knows others do too, and if every player is infinitely rational, they'll eventually converge to 0.

We saw something similar in real-life events (elections, social media debates, etc.): having the ability to _predict the crowd_ seems like a skill that separates those who speak to influence from those who are just speaking.

So we built **Predictably Wrong** to explore this idea. It's not about being “right” in isolation, but about reading and predicting the crowd.

---

### What it does

“Predictably Wrong” is a game/app where players:

- Are presented with a question (controversial or mild).
- Vote with their honest opinion _and_ try to predict what the _average Redditor_ will vote.
- Others also vote and predict.
- Later, results are revealed, showing:
  1. What the crowd thought,
  2. How your prediction compared.

So, success isn't about being right in your own view; it's about **reading the crowd**—a skill-based gameplay.

---

### How we built it

This project was built with significant AI assistance, leveraging the built-in Cursor MCP server. We started by designing the API, then implemented the backend layer to handle CRUD operations with Redis. After connecting the API to the database, we moved on to building the frontend.

Main technologies we used:

- **Devvit:** The official framework for building apps for Reddit.
- **React:** Styled simply with Tailwind so questions, votes, and predictions are clear. We use **Recharts** to visualize results and predictions.
- **Express:** The backend framework for building the API.
- **Redis:** The official database for Devvit.

---

### Challenges we ran into

- We wanted a **daily question** feature, where the most upvoted comment is the question of tomorrow. But we couldn't reliably **inject the initial question** into Redis on the very first day, so we changed to let anyone submit questions.
- Securing not only the frontend but also the API and backend, so that people can't see others' predictions before making their own.
- Dealing with skewed and low participation (e.g., a few voices dominating early, making “predicting” less meaningful).

---

### Accomplishments that we're proud of

- It was our first time using Devvit and Redis, and we're proud of the result.
- Created a minimal viable product (MVP) in a short time that captures the essence of beauty-contest reasoning.
- Figrue out a way to display the prediction histogram in a way that is easy to understand.
- Laid the groundwork for measuring prediction accuracy over time.

---

### What we learned

- Predicting the crowd is difficult. People's guesses can be distributed in a wide range.
- Game theory concepts (like iterated elimination) manifest in surprising ways in "ordinary people" datasets.
- The skill of _crowd reading_ can be trained: over time, people who play more may get better at guessing what “the average Redditor” will think.

---

### What's next for Predictably Wrong

- Build a **leaderboard** to reward those who consistently predict the crowd well.
- Automate the daily question feature: cron jobs or scheduled tasks to seed questions into Redis.
- Improve visualizations, e.g., show prediction vs. outcome distributions and heatmaps of error.

---
