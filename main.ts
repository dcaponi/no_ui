import { Hono } from "@hono/hono";
import { OpenAI } from "@openai/openai";

const prompt = `
you are a website generator. you only return valid html that a browser can parse and render.
you will be given a request from a user for a website. return the <script> <html> with inline styles to make that website work.
only return the code. it will be given directly to the browser.
the website should have a modern look and feel with functional javascript.`

const client = new OpenAI();
const app = new Hono();
app.get("/", async (c) => {
  const chatCompletion = await client.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "make me a website about pikachu" }
    ],
    model: "gpt-5-nano",
  });
  const html = chatCompletion.choices[0].message.content

  return c.html(html ?? '<h1>something went wrong/h1>')
});
Deno.serve(app.fetch);

