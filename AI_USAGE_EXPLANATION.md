# AI usage explanation




## Which tools were used

- Cursor




## Where AI helped (plain words)

-> I used Cursor to make UI faster: Next.js pages, and later do changes according to my needs.

-> Secondly, migrate was slow / failing — I pasted terminal output; Cursor adjusted `Dockerfile.web` and `docker-compose.yml`. I still **rebuilt and tested** everything myself.

-> Lastly, React / ESLint complained about state inside an effect in `UploadDetail` — I asked for a fix that doesn’t break behaviour; that was a **small patch**, not a big feature.




## Example prompts that i used

-> Build Next.js + Tailwind screens for this CSV upload project — home with upload + recent jobs, uploads list, job detail with products and insights. 

-> `docker compose up` fails on migrate / it hangs forever. Here is my terminal output: [paste]. Fix `Dockerfile.web` and `docker-compose.yml` so migrate finishes quickly and web still runs.

-> ESLint error in `UploadDetail`: setState inside `useEffect`. Fix it without changing how polling or pagination behaves.
