# Worlds Laziest Website Generator

## AI take the wheel! 🚗
What happens when you just let go and push whatever AI slop straight to production. Do not pass go, do not collect $200. This... this is what happens.

This is a 24 line codebase that will generate any single page app with functional javascript and decent CSS. 4 lines are just prompt so like really its 20 lines of javascript. I picked Deno to run this because I thought it'd be cool but you could have done this with express or something and gotten similar results with even less code maybe.

Lets just skip CI/CD, tests, code review, and all that crap. In fact, why even use a framework or copilot? Just have the AI honk whatever it was going to stick into your editor directly to the end user!

## Running this jalopy
This uses Deno. If you have it: `deno run -N -E main.ts`. If not `npx deno run -N -E main.ts`

Make sure you have an `OPENAI_API_KEY` in your environment.